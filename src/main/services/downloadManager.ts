import { Notification, dialog, shell, type BrowserWindow } from 'electron';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

import got from 'got';
import PQueue from 'p-queue';

import { createProxyAgent } from '@/main/services/network';
import { type ConfigService } from '@/main/services/configService';
import { type AppConfig, type ProxyConfig } from '@/shared/types';
import { type DownloadTask } from '@/shared/downloadTypes';

type TaskRuntime = {
  request?: NodeJS.ReadWriteStream;
  file?: fs.WriteStream;
  controller?: AbortController;
};

function now() {
  return Date.now();
}

function id() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function pickProxy(config: AppConfig, toolId: string): ProxyConfig {
  const tool = config.tools.find((t) => t.id === toolId);
  if (tool && tool.proxy.type !== 'none') return tool.proxy;
  return config.proxy;
}

export class DownloadManager {
  private queue: PQueue;
  private tasks = new Map<string, DownloadTask>();
  private runtime = new Map<string, TaskRuntime>();

  constructor(
    private configService: ConfigService,
    private onChange?: (tasks: DownloadTask[]) => void,
  ) {
    this.queue = new PQueue({ concurrency: 3 });
  }

  async syncConcurrency(): Promise<void> {
    const cfg = await this.configService.load();
    const concurrency = Math.max(1, Math.min(8, cfg.download.concurrency));
    this.queue.concurrency = concurrency;
  }

  list(): DownloadTask[] {
    return Array.from(this.tasks.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  private updateTask(id: string, patch: Partial<DownloadTask>) {
    const prev = this.tasks.get(id);
    if (!prev) return;
    const next: DownloadTask = { ...prev, ...patch, updatedAt: now() };
    this.tasks.set(id, next);
    this.onChange?.(this.list());
  }

  async add(
    win: BrowserWindow,
    toolId: string,
    url: string,
    fileName: string,
  ): Promise<DownloadTask> {
    await this.syncConcurrency();
    const cfg = await this.configService.load();

    const baseDir = cfg.download.tempDir
      ? cfg.download.tempDir
      : path.join(process.env['TEMP'] || process.cwd(), 'codev-downloads');
    await fsp.mkdir(baseDir, { recursive: true });

    const taskId = id();
    const targetPath = path.join(baseDir, fileName);

    const task: DownloadTask = {
      id: taskId,
      toolId,
      url,
      fileName,
      targetPath,
      status: 'queued',
      totalBytes: 0,
      transferredBytes: 0,
      createdAt: now(),
      updatedAt: now(),
      error: '',
    };
    this.tasks.set(taskId, task);
    this.onChange?.(this.list());

    this.queue.add(async () => {
      const current = this.tasks.get(taskId);
      if (!current || current.status === 'cancelled') return;
      this.updateTask(taskId, { status: 'downloading', error: '' });

      const cfg2 = await this.configService.load();
      const agent = createProxyAgent(pickProxy(cfg2, toolId));

      await new Promise<void>((resolve, reject) => {
        const controller = new AbortController();
        const stream = got.stream(url, {
          headers: { 'user-agent': 'CodeV' },
          agent: agent ? { http: agent, https: agent } : undefined,
          signal: controller.signal,
        });
        const file = fs.createWriteStream(targetPath);
        this.runtime.set(taskId, {
          request: stream as unknown as NodeJS.ReadWriteStream,
          file,
          controller,
        });

        stream.on('downloadProgress', (p) => {
          this.updateTask(taskId, {
            totalBytes: p.total ? Number(p.total) : 0,
            transferredBytes: Number(p.transferred),
          });
        });

        stream.on('error', (err) => reject(err));

        file.on('error', (err) => reject(err));
        file.on('finish', () => resolve());

        stream.pipe(file);
      });

      const after = this.tasks.get(taskId);
      if (!after) return;
      this.runtime.delete(taskId);
      this.updateTask(taskId, { status: 'completed' });

      const cfg3 = await this.configService.load();
      if (cfg3.download.notifyOnComplete) {
        const n = new Notification({
          title: '下载完成',
          body: `${fileName} 已下载完成，点击打开`,
        });
        n.on('click', () => {
          void shell.showItemInFolder(targetPath);
        });
        n.show();
      }

      const result = await dialog.showMessageBox(win, {
        type: 'info',
        message: '下载完成',
        detail: `${fileName}\n\n是否立即运行安装？`,
        buttons: ['运行安装', '打开目录', '关闭'],
        defaultId: 0,
      });
      if (result.response === 0) {
        void shell.openPath(targetPath);
      } else if (result.response === 1) {
        void shell.showItemInFolder(targetPath);
      }
    }).catch((err) => {
      this.runtime.delete(taskId);
      this.updateTask(taskId, {
        status: 'failed',
        error: (err as Error).message || '下载失败',
      });
    });

    return task;
  }

  async cancel(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) return;
    const rt = this.runtime.get(taskId);
    try {
      rt?.controller?.abort();
    } catch {
      // ignore
    }
    try {
      rt?.request?.destroy();
    } catch {
      // ignore
    }
    try {
      rt?.file?.destroy();
    } catch {
      // ignore
    }
    this.runtime.delete(taskId);
    this.tasks.delete(taskId);
    try {
      await fsp.rm(task.targetPath, { force: true });
    } catch {
      // ignore
    }
    this.onChange?.(this.list());
  }

  async clearCompleted(): Promise<number> {
    const tasks = this.list();
    const completed = tasks.filter((t) => t.status === 'completed');
    let removed = 0;
    for (const t of completed) {
      try {
        await fsp.rm(t.targetPath, { force: true });
      } catch {
        // ignore
      }
      this.tasks.delete(t.id);
      removed++;
    }
    this.onChange?.(this.list());
    return removed;
  }
}

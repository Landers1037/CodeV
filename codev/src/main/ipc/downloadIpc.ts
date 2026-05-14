import { BrowserWindow, ipcMain, type WebContents } from 'electron';

import {
  fetchLatestReleases,
  pickExeAsset,
} from '@/main/services/githubReleases';
import { type ConfigService } from '@/main/services/configService';
import { type DownloadManager } from '@/main/services/downloadManager';

export function registerDownloadIpc(
  configService: ConfigService,
  downloadManager: DownloadManager,
  renderer: WebContents,
) {
  ipcMain.handle('downloads:list', () => {
    return downloadManager.list();
  });

  ipcMain.handle('downloads:clearCompleted', async () => {
    const n = await downloadManager.clearCompleted();
    renderer.send('downloads:changed', downloadManager.list());
    return n;
  });

  ipcMain.handle('downloads:cancel', async (_e, taskId: string) => {
    downloadManager.cancel(taskId);
    renderer.send('downloads:changed', downloadManager.list());
  });

  ipcMain.handle('github:releases', async (_e, repo: string) => {
    const cfg = await configService.load();
    return fetchLatestReleases(repo, cfg.proxy, 5);
  });

  ipcMain.handle(
    'downloads:addGithub',
    async (e, toolId: string, tagName?: string) => {
      const win = BrowserWindow.fromWebContents(e.sender);
      if (!win) return { ok: false, error: '窗口不可用' } as const;

      const cfg = await configService.load();
      const tool = cfg.tools.find((t) => t.id === toolId);
      if (!tool) return { ok: false, error: '工具不存在' } as const;
      if (tool.source.kind !== 'githubRelease')
        return { ok: false, error: '该工具不支持下载' } as const;

      const releases = await fetchLatestReleases(tool.source.repo, cfg.proxy, 5);
      const release = tagName
        ? releases.find((r) => r.tag_name === tagName)
        : releases[0];
      if (!release) return { ok: false, error: '未找到 Release' } as const;

      const asset = pickExeAsset(release);
      if (!asset) return { ok: false, error: '未找到可用的 .exe 资产' } as const;

      const task = await downloadManager.add(
        win,
        toolId,
        asset.browser_download_url,
        asset.name,
      );
      renderer.send('downloads:changed', downloadManager.list());
      return { ok: true, task } as const;
    },
  );
}

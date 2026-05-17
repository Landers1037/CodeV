import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useConfigStore } from '@/renderer/state/configStore';
import { type DownloadTask } from '@/shared/downloadTypes';

function formatBytes(n: number) {
  if (!n) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let idx = 0;
  let v = n;
  while (v >= 1024 && idx < units.length - 1) {
    v /= 1024;
    idx++;
  }
  return `${v.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
}

export function DownloadsPage() {
  const { config } = useConfigStore();
  const [tasks, setTasks] = useState<DownloadTask[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let off: (() => void) | undefined;
    void (async () => {
      const list = await window.codev?.downloads?.list();
      if (list) setTasks(list);
      off = window.codev?.downloads?.onChanged((next) => setTasks(next));
    })();
    return () => {
      off?.();
    };
  }, []);

  const downloadableTools = useMemo(() => {
    return (config?.tools ?? []).filter(
      (t) => t.needDownload !== false && t.source?.kind === 'githubRelease',
    );
  }, [config]);

  return (
    <div className="h-full overflow-auto p-6 select-none">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="text-lg font-semibold">下载管理</div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={async () => {
              setMessage('');
              const res = await window.codev?.downloads?.openDir();
              if (!res) return;
              if (res.ok) setMessage(`已打开下载目录：${res.dir}`);
              else setMessage(res.error);
            }}
          >
            打开下载目录
          </Button>
          <Button
            variant="secondary"
            onClick={async () => {
              setMessage('');
              const n = await window.codev?.downloads?.clearCompleted();
              if (typeof n === 'number') setMessage(`已清理 ${n} 个已完成任务`);
            }}
          >
            清理已完成
          </Button>
        </div>
      </div>

      {message ? <div className="mb-3 text-sm text-muted-foreground">{message}</div> : null}

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>快速下载</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {downloadableTools.map((t) => (
            <Button
              key={t.id}
              variant="outline"
              onClick={async () => {
                setMessage('');
                const res = await window.codev?.downloads?.addGithub(t.id);
                if (!res) return;
                if (res.ok) setMessage(`已加入下载：${res.task.fileName}`);
                else if ('error' in res) setMessage(res.error);
              }}
            >
              {t.name}
            </Button>
          ))}
          {!downloadableTools.length ? (
            <div className="text-sm text-muted-foreground">暂无可下载工具</div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>任务列表</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {tasks.map((t) => {
            const progress =
              t.totalBytes > 0 ? Math.round((t.transferredBytes / t.totalBytes) * 100) : 0;
            return (
              <div
                key={t.id}
                className="rounded-xl border border-border/60 bg-background/40 p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{t.fileName}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {t.status} · {formatBytes(t.transferredBytes)} / {formatBytes(t.totalBytes)}
                      {t.status === 'downloading' && t.totalBytes ? ` · ${progress}%` : ''}
                      {t.error ? ` · ${t.error}` : ''}
                    </div>
                  </div>
                  {t.status === 'downloading' || t.status === 'queued' ? (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => void window.codev?.downloads?.cancel(t.id)}
                    >
                      取消
                    </Button>
                  ) : null}
                </div>
                {t.status === 'downloading' && t.totalBytes ? (
                  <div className="mt-2 h-2 w-full rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                ) : null}
              </div>
            );
          })}
          {!tasks.length ? (
            <div className="text-sm text-muted-foreground">暂无下载任务</div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

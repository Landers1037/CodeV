import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderGit2, Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useConfigStore } from '@/renderer/state/configStore';
import { type RepoSummary } from '@/shared/types';

function formatDate(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '';
  return d.toLocaleString();
}

export function ReposPage() {
  const navigate = useNavigate();
  const { config } = useConfigStore();
  const [summaries, setSummaries] = useState<RepoSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const repoApi = window.codev?.repos;
  const dialogApi = window.codev?.dialog;

  const repoCount = (config?.repos ?? []).length;

  const refresh = async () => {
    if (!repoApi) return;
    setLoading(true);
    try {
      const list = await repoApi.listSummaries();
      setSummaries(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, [repoCount]);

  const addRepo = async () => {
    const dir = await dialogApi?.openDirectory();
    if (!dir) return;
    await repoApi?.add(dir);
    await refresh();
  };

  const removeRepo = async (id: string) => {
    await repoApi?.remove(id);
    await refresh();
  };

  const empty = useMemo(() => !loading && summaries.length === 0, [loading, summaries.length]);

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden select-none">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FolderGit2 className="h-4 w-4" />
          <span>已配置 {repoCount} 个仓库</span>
        </div>
        <Button onClick={() => void addRepo()} className="gap-2">
          <Plus className="h-4 w-4" />
          添加仓库
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {empty ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            暂无仓库，点击右上角添加本地 Git 仓库
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {summaries.map((r) => (
              <Card
                key={r.id}
                className={cn('cursor-pointer transition hover:bg-white/5')}
                onClick={() => navigate(`/repos/${r.id}`)}
              >
                <CardHeader className="flex flex-row items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="truncate">{r.name || r.path}</CardTitle>
                    <div className="mt-1 truncate text-xs text-muted-foreground">{r.path}</div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 rounded-xl"
                    onClick={(e) => {
                      e.stopPropagation();
                      void removeRepo(r.id);
                    }}
                    aria-label="删除仓库"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <div className="text-muted-foreground">分支</div>
                    <div className="font-medium">{r.branch || '-'}</div>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <div className="text-muted-foreground">最近提交</div>
                    <div className="font-medium">{formatDate(r.latestCommitDate) || '-'}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


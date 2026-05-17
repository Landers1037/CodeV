import { ipcMain, type WebContents } from 'electron';
import crypto from 'node:crypto';
import path from 'node:path';

import { type ConfigService } from '@/main/services/configService';
import { GitService } from '@/main/services/gitService';
import { type AppConfig, type RepoCommit, type RepoCommitDiff, type RepoSummary } from '@/shared/types';

function buildRepoId(repoPath: string) {
  const normalized = path.resolve(repoPath).replaceAll('\\', '/').toLowerCase();
  return crypto.createHash('sha1').update(normalized).digest('hex');
}

export function registerRepoIpc(configService: ConfigService, renderer: WebContents) {
  const gitService = new GitService();

  ipcMain.handle('repos:listSummaries', async () => {
    const cfg = await configService.load();
    const out: RepoSummary[] = [];
    for (const r of cfg.repos ?? []) {
      try {
        out.push(await gitService.getRepoSummary(r.path, r.id));
      } catch {
        out.push({
          id: r.id,
          path: r.path,
          name: path.basename(r.path || ''),
          branch: '',
          latestCommitOid: '',
          latestCommitDate: '',
        });
      }
    }
    return out;
  });

  ipcMain.handle('repos:add', async (_event, repoPath: string) => {
    const dir = String(repoPath || '').trim();
    if (!dir) throw new Error('路径不能为空');
    const id = buildRepoId(dir);
    await gitService.getRepoSummary(dir, id);
    const current = await configService.load();
    const exists = (current.repos ?? []).some((r) => r.id === id);
    const nextRepos = exists ? current.repos : [...(current.repos ?? []), { id, path: dir }];
    const next = await configService.update({ repos: nextRepos } satisfies Partial<AppConfig>);
    renderer.send('config:changed', next);
    return next;
  });

  ipcMain.handle('repos:remove', async (_event, repoId: string) => {
    const id = String(repoId || '').trim();
    const current = await configService.load();
    const nextRepos = (current.repos ?? []).filter((r) => r.id !== id);
    const next = await configService.update({ repos: nextRepos } satisfies Partial<AppConfig>);
    renderer.send('config:changed', next);
    return next;
  });

  ipcMain.handle('repos:listCommits', async (_event, repoId: string, depth?: number) => {
    const id = String(repoId || '').trim();
    const cfg = await configService.load();
    const repo = (cfg.repos ?? []).find((r) => r.id === id);
    if (!repo) throw new Error('仓库不存在');
    const out: RepoCommit[] = await gitService.listCommits(repo.path, Math.max(1, Math.min(Number(depth) || 200, 2000)));
    return out;
  });

  ipcMain.handle('repos:getCommitDiff', async (_event, repoId: string, oid: string) => {
    const id = String(repoId || '').trim();
    const cfg = await configService.load();
    const repo = (cfg.repos ?? []).find((r) => r.id === id);
    if (!repo) throw new Error('仓库不存在');
    const out: RepoCommitDiff = await gitService.getCommitDiff(repo.path, String(oid || '').trim());
    return out;
  });
}

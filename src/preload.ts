import { clipboard, contextBridge, ipcRenderer } from 'electron';

import { type AppUpdateResult } from '@/shared/appUpdateTypes';
import { type AppConfig, type RepoCommit, type RepoCommitDiff, type RepoSummary } from '@/shared/types';
import { type DownloadTask } from '@/shared/downloadTypes';

contextBridge.exposeInMainWorld('codev', {
  app: {
    /** 获取应用版本。 */
    getVersion: () => ipcRenderer.invoke('app:getVersion') as Promise<string>,
    /** 检查应用更新。 */
    checkForUpdates: () => ipcRenderer.invoke('app:checkForUpdates') as Promise<AppUpdateResult>,
    openLogDir: () =>
      ipcRenderer.invoke('app:openLogDir') as Promise<
        | { ok: true; dir: string }
        | { ok: false; error: string }
      >,
  },
  system: {
    listFonts: () => ipcRenderer.invoke('system:listFonts') as Promise<string[]>,
  },
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    toggleMaximize: () => ipcRenderer.invoke('window:toggleMaximize'),
    close: () => ipcRenderer.invoke('window:close'),
  },
  dialog: {
    openExe: () => ipcRenderer.invoke('dialog:openExe') as Promise<string>,
    openImage: () => ipcRenderer.invoke('dialog:openImage') as Promise<string>,
    openDirectory: () => ipcRenderer.invoke('dialog:openDirectory') as Promise<string>,
    importToolIcon: () => ipcRenderer.invoke('dialog:importToolIcon') as Promise<string>,
  },
  config: {
    get: () => ipcRenderer.invoke('config:get') as Promise<AppConfig>,
    update: (patch: Partial<AppConfig>) =>
      ipcRenderer.invoke('config:update', patch) as Promise<AppConfig>,
    onChanged: (listener: (next: AppConfig) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, next: AppConfig) => {
        listener(next);
      };
      ipcRenderer.on('config:changed', handler);
      return () => ipcRenderer.removeListener('config:changed', handler);
    },
  },
  tools: {
    scan: () => ipcRenderer.invoke('tools:scan') as Promise<AppConfig>,
    open: (toolId: string) =>
      ipcRenderer.invoke('tools:open', toolId) as Promise<
        | { ok: true; pid: number; reused: boolean }
        | { ok: false; error: string }
      >,
    check: (toolId: string) =>
      ipcRenderer.invoke('tools:check', toolId) as Promise<AppConfig>,
  },
  downloads: {
    list: () => ipcRenderer.invoke('downloads:list') as Promise<DownloadTask[]>,
    openDir: () =>
      ipcRenderer.invoke('downloads:openDir') as Promise<
        | { ok: true; dir: string }
        | { ok: false; error: string }
      >,
    addGithub: (toolId: string, tagName?: string) =>
      ipcRenderer.invoke('downloads:addGithub', toolId, tagName) as Promise<
        | { ok: true; task: DownloadTask }
        | { ok: false; error: string }
      >,
    clearCompleted: () =>
      ipcRenderer.invoke('downloads:clearCompleted') as Promise<number>,
    cancel: (taskId: string) => ipcRenderer.invoke('downloads:cancel', taskId) as Promise<void>,
    onChanged: (listener: (tasks: DownloadTask[]) => void) => {
      const handler = (
        _event: Electron.IpcRendererEvent,
        tasks: DownloadTask[],
      ) => listener(tasks);
      ipcRenderer.on('downloads:changed', handler);
      return () => ipcRenderer.removeListener('downloads:changed', handler);
    },
  },
  github: {
    releases: (repo: string) =>
      ipcRenderer.invoke('github:releases', repo) as Promise<unknown>,
  },
  clipboard: {
    readText: () => clipboard.readText(),
    writeText: (text: string) => clipboard.writeText(text),
  },
  terminal: {
    create: (payload?: {
      command?: string;
      args?: string[];
      cwd?: string;
      env?: Record<string, string>;
    }) =>
      ipcRenderer.invoke('terminal:create', payload) as Promise<string>,
    write: (id: string, data: string) =>
      ipcRenderer.invoke('terminal:write', id, data) as Promise<void>,
    resize: (id: string, cols: number, rows: number) =>
      ipcRenderer.invoke('terminal:resize', id, cols, rows) as Promise<void>,
    close: (id: string) =>
      ipcRenderer.invoke('terminal:close', id) as Promise<void>,
    createTool: (toolId: string) =>
      ipcRenderer.invoke('terminal:createTool', toolId) as Promise<string>,
    onData: (listener: (payload: { id: string; data: string }) => void) => {
      const handler = (
        _event: Electron.IpcRendererEvent,
        payload: { id: string; data: string },
      ) => listener(payload);
      ipcRenderer.on('terminal:data', handler);
      return () => ipcRenderer.removeListener('terminal:data', handler);
    },
    onExit: (listener: (payload: { id: string }) => void) => {
      const handler = (
        _event: Electron.IpcRendererEvent,
        payload: { id: string },
      ) => listener(payload);
      ipcRenderer.on('terminal:exit', handler);
      return () => ipcRenderer.removeListener('terminal:exit', handler);
    },
  },
  repos: {
    listSummaries: () => ipcRenderer.invoke('repos:listSummaries') as Promise<RepoSummary[]>,
    add: (repoPath: string) => ipcRenderer.invoke('repos:add', repoPath) as Promise<AppConfig>,
    remove: (repoId: string) => ipcRenderer.invoke('repos:remove', repoId) as Promise<AppConfig>,
    listCommits: (repoId: string, depth?: number) =>
      ipcRenderer.invoke('repos:listCommits', repoId, depth) as Promise<RepoCommit[]>,
    getCommitDiff: (repoId: string, oid: string) =>
      ipcRenderer.invoke('repos:getCommitDiff', repoId, oid) as Promise<RepoCommitDiff>,
  },
  bookmarks: {
    add: (url: string) => ipcRenderer.invoke('bookmarks:add', url) as Promise<AppConfig>,
    remove: (bookmarkId: string) => ipcRenderer.invoke('bookmarks:remove', bookmarkId) as Promise<AppConfig>,
    update: (bookmarkId: string, payload: { url: string; title: string }) =>
      ipcRenderer.invoke('bookmarks:update', bookmarkId, payload) as Promise<AppConfig>,
    open: (url: string) => ipcRenderer.invoke('bookmarks:open', url) as Promise<void>,
  },
  notify: {
    onToast: (listener: (payload: { title: string; message: string }) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, payload: { title: string; message: string }) => {
        listener(payload);
      };
      ipcRenderer.on('notify:toast', handler);
      return () => ipcRenderer.removeListener('notify:toast', handler);
    },
  },
});

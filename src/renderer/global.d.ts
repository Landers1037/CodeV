import { type AppUpdateResult } from '@/shared/appUpdateTypes';
import { type AppConfig, type RepoCommit, type RepoCommitDiff, type RepoSummary } from '@/shared/types';
import { type DownloadTask } from '@/shared/downloadTypes';

declare global {
  interface Window {
    codev?: {
      app?: {
        /** 获取应用版本。 */
        getVersion: () => Promise<string>;
        /** 检查应用更新。 */
        checkForUpdates: () => Promise<AppUpdateResult>;
        openLogDir: () => Promise<{ ok: true; dir: string } | { ok: false; error: string }>;
      };
      system?: {
        listFonts: () => Promise<string[]>;
      };
      window?: {
        minimize: () => Promise<void> | void;
        toggleMaximize: () => Promise<void> | void;
        close: () => Promise<void> | void;
      };
      dialog?: {
        openExe: () => Promise<string>;
        openImage: () => Promise<string>;
        openDirectory: () => Promise<string>;
        importToolIcon: () => Promise<string>;
      };
      config?: {
        get: () => Promise<AppConfig>;
        update: (patch: Partial<AppConfig>) => Promise<AppConfig>;
        onChanged: (listener: (next: AppConfig) => void) => () => void;
      };
      tools?: {
        scan: () => Promise<AppConfig>;
        open: (
          toolId: string,
        ) => Promise<
          | { ok: true; pid: number; reused: boolean }
          | { ok: false; error: string }
        >;
        check: (toolId: string) => Promise<AppConfig>;
      };
      downloads?: {
        list: () => Promise<DownloadTask[]>;
        openDir: () => Promise<{ ok: true; dir: string } | { ok: false; error: string }>;
        addGithub: (
          toolId: string,
          tagName?: string,
        ) => Promise<{ ok: true; task: DownloadTask } | { ok: false; error: string }>;
        clearCompleted: () => Promise<number>;
        cancel: (taskId: string) => Promise<void>;
        onChanged: (listener: (tasks: DownloadTask[]) => void) => () => void;
      };
      github?: {
        releases: (repo: string) => Promise<unknown>;
      };
      clipboard?: {
        readText: () => string;
        writeText: (text: string) => void;
      };
      terminal?: {
        create: (payload?: { command?: string; args?: string[]; cwd?: string; env?: Record<string, string> }) => Promise<string>;
        write: (id: string, data: string) => Promise<void>;
        resize: (id: string, cols: number, rows: number) => Promise<void>;
        close: (id: string) => Promise<void>;
        createTool: (toolId: string) => Promise<string>;
        onData: (listener: (payload: { id: string; data: string }) => void) => () => void;
        onExit: (listener: (payload: { id: string }) => void) => () => void;
      };
      repos?: {
        listSummaries: () => Promise<RepoSummary[]>;
        add: (repoPath: string) => Promise<AppConfig>;
        remove: (repoId: string) => Promise<AppConfig>;
        listCommits: (repoId: string, depth?: number) => Promise<RepoCommit[]>;
        getCommitDiff: (repoId: string, oid: string) => Promise<RepoCommitDiff>;
      };
      bookmarks?: {
        add: (url: string) => Promise<AppConfig>;
        remove: (bookmarkId: string) => Promise<AppConfig>;
        update: (bookmarkId: string, payload: { url: string; title: string }) => Promise<AppConfig>;
        open: (url: string) => Promise<void>;
      };
      notify?: {
        onToast: (listener: (payload: { title: string; message: string }) => void) => () => void;
      };
    };
  }
}

export {};

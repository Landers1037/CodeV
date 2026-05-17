import { app, BrowserWindow, ipcMain, shell } from 'electron';
import fsp from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { checkForAppUpdate } from '@/main/services/appUpdater';
import { type ConfigService } from '@/main/services/configService';

const execFileAsync = promisify(execFile);

function uniqueStrings(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const v = raw.trim();
    if (!v) continue;
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

async function listSystemFonts(): Promise<string[]> {
  const fallback = uniqueStrings([
    'Consolas',
    'Cascadia Mono',
    'Cascadia Code',
    'JetBrains Mono',
    'Fira Code',
    'Menlo',
    'Monaco',
    'SF Mono',
  ]).sort((a, b) => a.localeCompare(b));

  if (process.platform === 'win32') {
    try {
      const { stdout } = await execFileAsync(
        'powershell.exe',
        [
          '-NoProfile',
          '-NonInteractive',
          '-ExecutionPolicy',
          'Bypass',
          '-Command',
          "[System.Drawing.Text.InstalledFontCollection]::new().Families | ForEach-Object { $_.Name }",
        ],
        { timeout: 5000, windowsHide: true, maxBuffer: 1024 * 1024 },
      );

      const fonts = uniqueStrings(stdout.split(/\r?\n/)).sort((a, b) => a.localeCompare(b));
      return fonts.length ? fonts : fallback;
    } catch {
      return fallback;
    }
  }

  return fallback;
}

/** 注册应用信息相关 IPC。 */
export function registerAppIpc(configService: ConfigService) {
  ipcMain.handle('app:getVersion', () => {
    return app.getVersion();
  });

  ipcMain.handle('app:checkForUpdates', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) {
      return {
        status: 'error',
        currentVersion: '',
        latestVersion: '',
        fileName: '',
        targetPath: '',
        message: '窗口不可用，无法检查更新。',
      } as const;
    }
    return checkForAppUpdate(win, configService);
  });

  ipcMain.handle('app:openLogDir', async () => {
    const dir = app.getPath('logs');
    await fsp.mkdir(dir, { recursive: true });
    const err = await shell.openPath(dir);
    if (err) return { ok: false, error: err } as const;
    return { ok: true, dir } as const;
  });

  ipcMain.handle('system:listFonts', async () => {
    return listSystemFonts();
  });
}

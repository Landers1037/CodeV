import { app, BrowserWindow, ipcMain } from 'electron';

import { checkForAppUpdate } from '@/main/services/appUpdater';
import { type ConfigService } from '@/main/services/configService';

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
}

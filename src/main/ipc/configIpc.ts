import { ipcMain, type WebContents } from 'electron';

import { applyAppSettings } from '@/main/services/appSettings';
import { type AppConfig } from '@/shared/types';
import { type ConfigService } from '@/main/services/configService';

export function registerConfigIpc(
  configService: ConfigService,
  renderer: WebContents,
) {
  ipcMain.handle('config:get', async () => {
    const cfg = await configService.load();
    applyAppSettings(cfg);
    return cfg;
  });

  ipcMain.handle('config:update', async (_event, patch: Partial<AppConfig>) => {
    const next = await configService.update(patch);
    applyAppSettings(next);
    renderer.send('config:changed', next);
    return next;
  });
}

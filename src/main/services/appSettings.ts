import { app } from 'electron';

import { type AppConfig } from '@/shared/types';

export function applyAppSettings(config: AppConfig) {
  if (process.platform === 'win32') {
    app.setLoginItemSettings({
      openAtLogin: config.advanced.autoStart,
    });
  }
}


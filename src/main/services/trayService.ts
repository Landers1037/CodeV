import { Menu, Tray, app, type BrowserWindow } from 'electron';
import path from 'node:path';

import { type ConfigService } from '@/main/services/configService';

export type TrayController = {
  setQuitting: (value: boolean) => void;
};

export async function setupTray(
  mainWindow: BrowserWindow,
  configService: ConfigService,
): Promise<TrayController> {
  const trayIconPath = app.isPackaged
    ? path.join(process.resourcesPath, 'assets', 'icon.png')
    : path.join(process.cwd(), 'assets', 'icon.png');
  const tray = new Tray(trayIconPath);
  tray.setToolTip('CodeV');

  let quitting = false;
  const setQuitting = (value: boolean) => {
    quitting = value;
  };

  const rebuildMenu = () => {
    const isVisible = mainWindow.isVisible();
    const contextMenu = Menu.buildFromTemplate([
      {
        label: isVisible ? '隐藏窗口' : '显示窗口',
        click: () => {
          if (mainWindow.isVisible()) {
            mainWindow.hide();
          } else {
            mainWindow.show();
            mainWindow.focus();
          }
          rebuildMenu();
        },
      },
      { type: 'separator' },
      {
        label: '退出',
        click: () => {
          quitting = true;
          mainWindow.close();
        },
      },
    ]);
    tray.setContextMenu(contextMenu);
  };

  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
    rebuildMenu();
  });

  let handlingClose = false;
  mainWindow.on('close', (e) => {
    if (quitting) return;
    if (handlingClose) {
      e.preventDefault();
      return;
    }

    e.preventDefault();
    handlingClose = true;

    void configService
      .load()
      .then((cfg) => {
        if (cfg.ui.closeToTray) {
          mainWindow.hide();
          rebuildMenu();
          return;
        }

        quitting = true;
        mainWindow.destroy();
      })
      .finally(() => {
        handlingClose = false;
      });
  });

  mainWindow.on('show', rebuildMenu);
  mainWindow.on('hide', rebuildMenu);
  rebuildMenu();

  return { setQuitting };
}

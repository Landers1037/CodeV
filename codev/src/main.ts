import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';

import { registerConfigIpc } from '@/main/ipc/configIpc';
import { registerDialogIpc } from '@/main/ipc/dialogIpc';
import { registerDownloadIpc } from '@/main/ipc/downloadIpc';
import { registerTerminalIpc } from '@/main/ipc/terminalIpc';
import { registerToolsIpc } from '@/main/ipc/toolsIpc';
import { ConfigService } from '@/main/services/configService';
import { DownloadManager } from '@/main/services/downloadManager';
import { setupTray } from '@/main/services/trayService';
import { ToolLauncher } from '@/main/services/toolLauncher';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const configService = new ConfigService();
const toolLauncher = new ToolLauncher();
const downloadManager = new DownloadManager(configService, (tasks) => {
  mainWindow?.webContents.send('downloads:changed', tasks);
});
let mainWindow: BrowserWindow | null = null;

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 980,
    minHeight: 640,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    const devUrl = MAIN_WINDOW_VITE_DEV_SERVER_URL;
    const tryLoad = (attempt: number) => {
      if (!mainWindow) return;
      mainWindow.loadURL(devUrl).catch(() => {
        if (attempt >= 8) return;
        setTimeout(() => tryLoad(attempt + 1), 250);
      });
    };
    tryLoad(0);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  return mainWindow;
}

function registerIpcHandlers() {
  ipcMain.handle('window:minimize', () => {
    mainWindow?.minimize();
  });

  ipcMain.handle('window:toggleMaximize', () => {
    if (!mainWindow) return;
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });

  ipcMain.handle('window:close', () => {
    mainWindow?.close();
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  const win = createWindow();
  registerIpcHandlers();
  registerConfigIpc(configService, win.webContents);
  registerToolsIpc(configService, toolLauncher, win.webContents);
  registerDownloadIpc(configService, downloadManager, win.webContents);
  registerTerminalIpc(configService, win.webContents);
  registerDialogIpc(win);
  void setupTray(win, configService);
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

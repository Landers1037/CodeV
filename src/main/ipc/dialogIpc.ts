import { app, dialog, ipcMain, type BrowserWindow } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';

function getToolAssetsDir() {
  return path.join(app.getPath('home'), '.config', 'codecv', 'assets');
}

function buildAssetName(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  const base = path
    .basename(filePath, ext)
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  const safeBase = base || 'tool-icon';
  return `${safeBase}-${Date.now()}${ext}`;
}

/** 注册文件选择与图标导入相关 IPC。 */
export function registerDialogIpc(win: BrowserWindow) {
  ipcMain.handle('dialog:openExe', async () => {
    const res = await dialog.showOpenDialog(win, {
      title: '选择可执行文件',
      properties: ['openFile'],
      filters: [{ name: 'Executable', extensions: ['exe'] }],
    });
    return res.canceled ? '' : res.filePaths[0] || '';
  });

  ipcMain.handle('dialog:openImage', async () => {
    const res = await dialog.showOpenDialog(win, {
      title: '选择 Logo 图片',
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
    });
    return res.canceled ? '' : res.filePaths[0] || '';
  });

  ipcMain.handle('dialog:importToolIcon', async () => {
    const res = await dialog.showOpenDialog(win, {
      title: '上传程序图标',
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'svg'] }],
    });
    const sourcePath = res.canceled ? '' : res.filePaths[0] || '';
    if (!sourcePath) return '';

    const targetDir = getToolAssetsDir();
    await fs.mkdir(targetDir, { recursive: true });
    const targetPath = path.join(targetDir, buildAssetName(sourcePath));
    await fs.copyFile(sourcePath, targetPath);
    return targetPath;
  });
}

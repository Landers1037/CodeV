import { ipcMain, type WebContents } from 'electron';

import { detectToolBinary } from '@/main/services/toolScanner';
import { type ConfigService } from '@/main/services/configService';
import { type AppConfig } from '@/shared/types';
import { type ToolLauncher } from '@/main/services/toolLauncher';

export function registerToolsIpc(
  configService: ConfigService,
  launcher: ToolLauncher,
  renderer: WebContents,
) {
  ipcMain.handle('tools:scan', async () => {
    const cfg = await configService.load();
    const tools = await Promise.all(
      cfg.tools.map(async (t) => {
        const detected = await detectToolBinary(t, cfg.advanced);
        return {
          ...t,
          detectedInstallPath: detected ? detected : '',
        };
      }),
    );

    const next = await configService.update({ tools } as Partial<AppConfig>);
    renderer.send('config:changed', next);
    return next;
  });

  ipcMain.handle('tools:open', async (_event, toolId: string) => {
    const cfg = await configService.load();
    const tool = cfg.tools.find((t) => t.id === toolId);
    if (!tool) return { ok: false, error: '工具不存在' } as const;

    const result = await launcher.launch(tool, cfg);
    if (!result.ok) return result;

    if (tool.isGui) {
      void launcher.focusByPid(result.pid);
    }
    return result;
  });

  ipcMain.handle('tools:check', async (_event, toolId: string) => {
    const cfg = await configService.load();
    const tools = await Promise.all(
      cfg.tools.map(async (t) => {
        if (t.id !== toolId) return t;
        const detected = await detectToolBinary(t, cfg.advanced);
        return {
          ...t,
          detectedInstallPath: detected ? detected : '',
        };
      }),
    );
    const next = await configService.update({ tools } as Partial<AppConfig>);
    renderer.send('config:changed', next);
    return next;
  });
}

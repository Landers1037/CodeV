import { ipcMain, type WebContents } from 'electron';

import path from 'node:path';

import { detectToolBinary } from '@/main/services/toolScanner';
import { TerminalService } from '@/main/services/terminalService';
import { type ConfigService } from '@/main/services/configService';
import { type ProxyConfig } from '@/shared/types';

function proxyToEnv(proxy: ProxyConfig): Record<string, string> {
  if (!proxy || proxy.type === 'none' || !proxy.host || !proxy.port) return {};
  const auth =
    proxy.username && proxy.password
      ? `${encodeURIComponent(proxy.username)}:${encodeURIComponent(proxy.password)}@`
      : '';
  const scheme = proxy.type === 'socks5' ? 'socks5' : 'http';
  const url = `${scheme}://${auth}${proxy.host}:${proxy.port}`;
  return {
    HTTP_PROXY: url,
    HTTPS_PROXY: url,
    ALL_PROXY: url,
  };
}

export function registerTerminalIpc(
  configService: ConfigService,
  renderer: WebContents,
) {
  const terminal = new TerminalService(renderer);

  ipcMain.handle(
    'terminal:create',
    (
      _e,
      payload?: {
        command?: string;
        args?: string[];
        cwd?: string;
        env?: Record<string, string>;
      },
    ) => {
      return terminal.create(
        payload?.command,
        payload?.args,
        payload?.cwd,
        payload?.env,
      );
    },
  );

  ipcMain.handle('terminal:write', (_e, id: string, data: string) => {
    terminal.write(id, data);
  });

  ipcMain.handle(
    'terminal:resize',
    (_e, id: string, cols: number, rows: number) => {
      terminal.resize(id, cols, rows);
    },
  );

  ipcMain.handle('terminal:close', (_e, id: string) => {
    terminal.close(id);
  });

  ipcMain.handle('terminal:createTool', async (_e, toolId: string) => {
    const cfg = await configService.load();
    const tool = cfg.tools.find((t) => t.id === toolId);
    if (!tool) throw new Error('工具不存在');

    const bin = (await detectToolBinary(tool, cfg.advanced)) || '';
    if (!bin) throw new Error('未检测到可执行文件，请先安装或配置安装路径');

    const env = {
      ...cfg.env.global,
      ...(cfg.env.perTool[tool.id] ?? {}),
      ...tool.env,
      ...proxyToEnv(tool.proxy.type === 'none' ? cfg.proxy : tool.proxy),
    };

    const cwd = tool.installPath || tool.detectedInstallPath
      ? path.dirname(bin)
      : undefined;

    return terminal.create(bin, tool.args ?? [], cwd, env);
  });
}

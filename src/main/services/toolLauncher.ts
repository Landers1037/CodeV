import { spawn } from 'node:child_process';
import path from 'node:path';

import { detectToolBinary } from '@/main/services/toolScanner';
import { type AppConfig, type ProxyConfig, type ToolMeta } from '@/shared/types';

type LaunchResult =
  | { ok: true; pid: number; reused: boolean }
  | { ok: false; error: string };

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

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

async function resolveBinary(tool: ToolMeta, config: AppConfig): Promise<string> {
  const detected = await detectToolBinary(tool, config.advanced);
  if (detected) return detected;
  if (tool.installPath) {
    const asFile = tool.installPath.toLowerCase().endsWith('.exe')
      ? tool.installPath
      : '';
    if (asFile) return asFile;
    return path.join(tool.installPath, tool.binaryName);
  }
  return '';
}

export class ToolLauncher {
  private toolPid = new Map<string, number>();

  getPid(toolId: string): number | null {
    const pid = this.toolPid.get(toolId);
    if (!pid) return null;
    return isProcessAlive(pid) ? pid : null;
  }

  async launch(tool: ToolMeta, config: AppConfig): Promise<LaunchResult> {
    const existing = this.getPid(tool.id);
    if (existing) {
      return { ok: true, pid: existing, reused: true };
    }

    const bin = await resolveBinary(tool, config);
    if (!bin) return { ok: false, error: '未检测到可执行文件，请先安装或配置安装路径' };

    const env = {
      ...process.env,
      ...config.env.global,
      ...(config.env.perTool[tool.id] ?? {}),
      ...tool.env,
      ...proxyToEnv(tool.proxy.type === 'none' ? config.proxy : tool.proxy),
    };

    const child = spawn(bin, tool.args ?? [], {
      env,
      detached: true,
      stdio: 'ignore',
      windowsHide: false,
    });
    child.unref();

    if (!child.pid) return { ok: false, error: '启动失败（未获取到 PID）' };
    this.toolPid.set(tool.id, child.pid);
    return { ok: true, pid: child.pid, reused: false };
  }

  async focusByPid(pid: number): Promise<boolean> {
    return new Promise((resolve) => {
      const script = `$p=Get-Process -Id ${pid} -ErrorAction SilentlyContinue; if($p -and $p.MainWindowHandle -ne 0){Add-Type @'
using System;
using System.Runtime.InteropServices;
public class Win32 {
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
}
'@; [Win32]::ShowWindowAsync($p.MainWindowHandle, 9) | Out-Null; [Win32]::SetForegroundWindow($p.MainWindowHandle) | Out-Null; exit 0} else {exit 1}`;
      const ps = spawn(
        'powershell.exe',
        ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script],
        { windowsHide: true },
      );
      ps.on('exit', (code) => resolve(code === 0));
      ps.on('error', () => resolve(false));
    });
  }
}


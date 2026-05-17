import os from 'node:os';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createRequire } from 'node:module';

import { type WebContents } from 'electron';
import type { IPty } from '@lydell/node-pty';

/** 终端会话。 */
export type TerminalSession = {
  /** 会话标识。 */
  id: string;
  proc: ChildProcessWithoutNullStreams | IPty;
};

function id() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export class TerminalService {
  private sessions = new Map<string, TerminalSession>();
  private requirePty = createRequire(__filename);

  constructor(private renderer: WebContents) {}

  /** 返回当前会话 ID 列表。 */
  listIds(): string[] {
    return Array.from(this.sessions.keys());
  }

  /** 创建终端会话。 */
  create(
    command?: string,
    args?: string[],
    cwd?: string,
    envPatch?: Record<string, string>,
  ): string {
    const shell =
      command || (process.platform === 'win32' ? 'powershell.exe' : 'bash');
    const shellArgs =
      args ??
      (process.platform === 'win32'
        ? ['-NoLogo', '-NoProfile']
        : []);

    const sessionId = id();
    const env = { ...(process.env as Record<string, string>), ...(envPatch ?? {}) };
    const workdir = cwd || os.homedir();

    try {
      const mod = this.requirePty('@lydell/node-pty') as typeof import('@lydell/node-pty');
      const pty = mod?.default ?? mod;
      const p = pty.spawn(shell, shellArgs, {
        name: 'xterm-256color',
        cols: 80,
        rows: 24,
        cwd: workdir,
        env,
        ...(process.platform === 'win32' ? { useConpty: true } : {}),
      });

      this.sessions.set(sessionId, { id: sessionId, proc: p });

      p.onData((data) => {
        this.renderer.send('terminal:data', { id: sessionId, data });
      });

      p.onExit(() => {
        this.sessions.delete(sessionId);
        this.renderer.send('terminal:exit', { id: sessionId });
      });
    } catch {
      const p = spawn(shell, shellArgs, {
        cwd: workdir,
        env,
        stdio: 'pipe',
        windowsHide: true,
      });

      this.sessions.set(sessionId, { id: sessionId, proc: p });

      p.stdout.on('data', (buf) => {
        const data = buf.toString();
        this.renderer.send('terminal:data', { id: sessionId, data });
      });

      p.stderr.on('data', (buf) => {
        const data = buf.toString();
        this.renderer.send('terminal:data', { id: sessionId, data });
      });

      p.on('exit', () => {
        this.sessions.delete(sessionId);
        this.renderer.send('terminal:exit', { id: sessionId });
      });
    }

    return sessionId;
  }

  /** 向终端写入数据。 */
  write(id: string, data: string) {
    const s = this.sessions.get(id);
    if (!s) return;
    if ('write' in s.proc) s.proc.write(data);
    else s.proc.stdin.write(data);
  }

  /** 调整终端尺寸。 */
  resize(id: string, cols: number, rows: number) {
    const s = this.sessions.get(id);
    if (!s) return;
    if ('resize' in s.proc) s.proc.resize(cols, rows);
  }

  /** 关闭终端会话。 */
  close(id: string) {
    const s = this.sessions.get(id);
    if (!s) return;
    if ('kill' in s.proc) s.proc.kill();
    else s.proc.kill();
    this.sessions.delete(id);
  }
}

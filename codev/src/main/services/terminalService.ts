import os from 'node:os';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';

import { type WebContents } from 'electron';

/** 终端会话。 */
export type TerminalSession = {
  /** 会话标识。 */
  id: string;
  /** 子进程实例。 */
  proc: ChildProcessWithoutNullStreams;
};

function id() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export class TerminalService {
  private sessions = new Map<string, TerminalSession>();

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

    const p = spawn(shell, shellArgs, {
      cwd: cwd || os.homedir(),
      env: { ...(process.env as Record<string, string>), ...(envPatch ?? {}) },
      stdio: 'pipe',
      windowsHide: true,
    });

    const sessionId = id();
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

    return sessionId;
  }

  /** 向终端写入数据。 */
  write(id: string, data: string) {
    const s = this.sessions.get(id);
    if (!s) return;
    s.proc.stdin.write(data);
  }

  /** 调整终端尺寸。 */
  resize(id: string, cols: number, rows: number) {
    void cols;
    void rows;
  }

  /** 关闭终端会话。 */
  close(id: string) {
    const s = this.sessions.get(id);
    if (!s) return;
    s.proc.kill();
    this.sessions.delete(id);
  }
}

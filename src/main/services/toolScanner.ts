import fs from 'node:fs/promises';
import path from 'node:path';

import { type ToolMeta } from '@/shared/types';

function isPermissionError(err: unknown): boolean {
  const code = (err as NodeJS.ErrnoException | undefined)?.code;
  return code === 'EACCES' || code === 'EPERM';
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function candidateRoots(): string[] {
  const roots: string[] = [];
  const push = (p?: string) => {
    if (!p) return;
    if (!roots.includes(p)) roots.push(p);
  };

  push(process.env['ProgramFiles']);
  push(process.env['ProgramFiles(x86)']);
  push(process.env['LOCALAPPDATA']);
  push(process.env['APPDATA']);
  push(process.env['USERPROFILE']);
  push('C:\\ProgramData\\chocolatey\\lib');

  const user = process.env['USERPROFILE'];
  if (user) push(path.join(user, 'scoop', 'apps'));

  return roots;
}

async function findFirstBinaryUnderRoot(
  root: string,
  binaryName: string,
  maxDepth: number,
): Promise<string> {
  const target = binaryName.toLowerCase();
  const stack: Array<{ dir: string; depth: number }> = [{ dir: root, depth: 0 }];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) break;

    let entries: fs.Dirent[];
    try {
      entries = await fs.readdir(current.dir, { withFileTypes: true });
    } catch (e) {
      if (isPermissionError(e)) continue;
      continue;
    }

    for (const ent of entries) {
      const full = path.join(current.dir, ent.name);
      if (ent.isFile()) {
        if (ent.name.toLowerCase() === target) return full;
        continue;
      }
      if (ent.isDirectory()) {
        if (current.depth >= maxDepth) continue;
        stack.push({ dir: full, depth: current.depth + 1 });
      }
    }
  }

  return '';
}

export async function detectToolBinary(tool: ToolMeta): Promise<string> {
  const direct = tool.installPath || tool.detectedInstallPath;
  if (direct) {
    const asFile = direct.toLowerCase().endsWith('.exe') ? direct : '';
    if (asFile && (await exists(asFile))) return asFile;
    const asJoin = path.join(direct, tool.binaryName);
    if (await exists(asJoin)) return asJoin;
  }

  for (const root of candidateRoots()) {
    const found = await findFirstBinaryUnderRoot(root, tool.binaryName, 10);
    if (found) return found;
  }

  return '';
}

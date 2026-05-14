import fs from 'node:fs/promises';
import path from 'node:path';

import { type ToolMeta } from '@/shared/types';

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

function buildCandidates(root: string, tool: ToolMeta): string[] {
  const baseNames = [
    tool.programName,
    tool.name,
    tool.id,
    tool.name.replaceAll(' ', ''),
  ].filter(Boolean);

  const dirs = new Set<string>();
  for (const n of baseNames) {
    dirs.add(path.join(root, n));
    dirs.add(path.join(root, n, 'bin'));
    dirs.add(path.join(root, n, 'app'));
    dirs.add(path.join(root, n, 'current'));
  }

  return Array.from(dirs).map((dir) => path.join(dir, tool.binaryName));
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
    for (const candidate of buildCandidates(root, tool)) {
      if (await exists(candidate)) return candidate;
    }
  }

  return '';
}


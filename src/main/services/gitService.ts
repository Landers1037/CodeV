import * as fs from 'node:fs';
import path from 'node:path';

import * as git from 'isomorphic-git';
import { createTwoFilesPatch } from 'diff';

import { type RepoCommit, type RepoCommitDiff, type RepoFileDiff, type RepoSummary } from '@/shared/types';

function hasGitDir(dir: string) {
  try {
    return fs.existsSync(path.join(dir, '.git'));
  } catch {
    return false;
  }
}

function safeDecode(bytes: Uint8Array): { text: string; isBinary: boolean } {
  const head = bytes.subarray(0, Math.min(bytes.length, 8000));
  for (const b of head) {
    if (b === 0) return { text: '', isBinary: true };
  }
  try {
    const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    return { text, isBinary: false };
  } catch {
    return { text: '', isBinary: true };
  }
}

function toIsoDate(date: Date) {
  return Number.isFinite(date.getTime()) ? date.toISOString() : '';
}

export class GitService {
  async getRepoSummary(dir: string, id: string): Promise<RepoSummary> {
    if (!hasGitDir(dir)) {
      throw new Error('不是有效的 Git 仓库目录');
    }

    const name = path.basename(dir);
    const branch = (await git.currentBranch({ fs, dir, fullname: false })) ?? '';
    const log = await git.log({ fs, dir, depth: 1 });
    const latest = log[0];

    return {
      id,
      path: dir,
      name,
      branch,
      latestCommitOid: latest?.oid ?? '',
      latestCommitDate: latest?.commit?.author?.timestamp
        ? toIsoDate(new Date(latest.commit.author.timestamp * 1000))
        : '',
    };
  }

  async listCommits(dir: string, depth: number): Promise<RepoCommit[]> {
    if (!hasGitDir(dir)) throw new Error('不是有效的 Git 仓库目录');
    const log = await git.log({ fs, dir, depth });
    return log.map((item) => ({
      oid: item.oid,
      parents: item.commit.parent ?? [],
      authorName: item.commit.author.name ?? '',
      authorEmail: item.commit.author.email ?? '',
      date: item.commit.author.timestamp ? toIsoDate(new Date(item.commit.author.timestamp * 1000)) : '',
      message: item.commit.message ?? '',
    }));
  }

  async getCommitDiff(dir: string, oid: string): Promise<RepoCommitDiff> {
    if (!hasGitDir(dir)) throw new Error('不是有效的 Git 仓库目录');

    const { commit } = await git.readCommit({ fs, dir, oid });
    const parentOid = commit.parent?.[0] ?? '';

    const files: RepoFileDiff[] = [];
    const headFiles = await git.listFiles({ fs, dir, ref: oid });
    const parentFiles = parentOid ? await git.listFiles({ fs, dir, ref: parentOid }) : [];
    const allFiles = Array.from(new Set([...headFiles, ...parentFiles])).sort((a, b) =>
      a.localeCompare(b),
    );

    for (const filepath of allFiles) {
      let oldBytes: Uint8Array | null = null;
      let newBytes: Uint8Array | null = null;

      if (parentOid) {
        try {
          const res = await git.readBlob({ fs, dir, oid: parentOid, filepath });
          oldBytes = res.blob;
        } catch {
          oldBytes = null;
        }
      }

      try {
        const res = await git.readBlob({ fs, dir, oid, filepath });
        newBytes = res.blob;
      } catch {
        newBytes = null;
      }

      if (!oldBytes && !newBytes) continue;

      const status: RepoFileDiff['status'] = !oldBytes ? 'added' : !newBytes ? 'deleted' : 'modified';
      const oldDecoded = oldBytes ? safeDecode(oldBytes) : { text: '', isBinary: false };
      const newDecoded = newBytes ? safeDecode(newBytes) : { text: '', isBinary: false };
      const isBinary = oldDecoded.isBinary || newDecoded.isBinary;
      const patch = isBinary
        ? ''
        : createTwoFilesPatch(filepath, filepath, oldDecoded.text, newDecoded.text, parentOid, oid, {
            context: 3,
          });

      files.push({ path: filepath, status, isBinary, patch });
    }

    return { oid, parentOid, files };
  }
}

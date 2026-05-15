import got from 'got';

import { createProxyAgent } from '@/main/services/network';
import { type ProxyConfig } from '@/shared/types';

export type GithubReleaseAsset = {
  name: string;
  size: number;
  browser_download_url: string;
};

export type GithubRelease = {
  tag_name: string;
  name: string;
  published_at: string;
  prerelease: boolean;
  draft: boolean;
  assets: GithubReleaseAsset[];
};

export async function fetchLatestReleases(
  repo: string,
  proxy: ProxyConfig,
  limit: number,
): Promise<GithubRelease[]> {
  const agent = createProxyAgent(proxy);
  const releases = await got
    .get(`https://api.github.com/repos/${repo}/releases`, {
      responseType: 'json',
      headers: {
        'user-agent': 'CodeV',
        accept: 'application/vnd.github+json',
      },
      agent: agent ? { http: agent, https: agent } : undefined,
    })
    .json<GithubRelease[]>();

  return releases
    .filter((r) => !r.draft)
    .slice(0, Math.max(1, Math.min(20, limit)));
}

export function pickExeAsset(release: GithubRelease): GithubReleaseAsset | null {
  const assets = release.assets ?? [];
  const candidates = assets.filter((a) => a.name.toLowerCase().endsWith('.exe'));
  const prefer = candidates.find((a) =>
    /setup|installer|install/i.test(a.name),
  );
  return prefer ?? candidates[0] ?? null;
}

export function pickInstallerAsset(
  toolId: string,
  release: GithubRelease,
): GithubReleaseAsset | null {
  const exe = pickExeAsset(release);
  if (exe) return exe;

  if (toolId === 'cc-switch') {
    const assets = release.assets ?? [];
    const candidates = assets.filter((a) => a.name.toLowerCase().endsWith('.msi'));
    const exact = candidates.find((a) => a.name === 'CC-Switch-v3.14.1-Windows.msi');
    const prefer = candidates.find((a) => /^cc-switch-v.*-windows\.msi$/i.test(a.name));
    return exact ?? prefer ?? candidates[0] ?? null;
  }

  return null;
}

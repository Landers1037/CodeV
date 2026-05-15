import { app, dialog, shell, type BrowserWindow } from 'electron';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';

import got from 'got';

import { fetchLatestReleases, type GithubRelease, type GithubReleaseAsset } from '@/main/services/githubReleases';
import { createProxyAgent } from '@/main/services/network';
import { type ConfigService } from '@/main/services/configService';
import { type AppUpdateResult } from '@/shared/appUpdateTypes';

const APP_REPO = 'Landers1037/CodeV';
const FILE_NAME_PREFIX = 'CodeV-';
const FILE_NAME_PATTERN = /^CodeV-(\d+\.\d+\.\d+)\.(exe|msi)$/i;

/** 解析版本字符串中的数字片段。 */
function normalizeVersion(input: string): number[] {
  return input
    .trim()
    .replace(/^[^\d]*/, '')
    .split('.')
    .map((part) => Number.parseInt(part, 10))
    .filter((part) => Number.isFinite(part));
}

/** 比较两个语义化版本号。 */
export function compareVersions(a: string, b: string): number {
  const left = normalizeVersion(a);
  const right = normalizeVersion(b);
  const max = Math.max(left.length, right.length, 3);
  for (let i = 0; i < max; i += 1) {
    const av = left[i] ?? 0;
    const bv = right[i] ?? 0;
    if (av > bv) return 1;
    if (av < bv) return -1;
  }
  return 0;
}

/** 从文件名中提取版本号。 */
export function extractVersionFromFileName(fileName: string): string {
  const match = fileName.match(FILE_NAME_PATTERN);
  return match?.[1] ?? '';
}

/** 获取发布对应的版本号。 */
function getReleaseVersion(release: GithubRelease): string {
  const asset = pickAppInstallerAsset(release);
  return extractVersionFromFileName(asset?.name ?? '') || normalizeVersion(release.tag_name).join('.');
}

/** 选择最新的发布版本。 */
export function pickLatestRelease(releases: GithubRelease[]): GithubRelease | null {
  const stable = releases.filter((release) => !release.prerelease);
  const candidates = stable.length ? stable : releases;
  let latest: GithubRelease | null = null;
  for (const release of candidates) {
    const candidateVersion = getReleaseVersion(release);
    if (!candidateVersion) continue;
    if (!latest) {
      latest = release;
      continue;
    }
    const latestVersion = getReleaseVersion(latest);
    if (compareVersions(candidateVersion, latestVersion) > 0) {
      latest = release;
    }
  }
  return latest;
}

/** 为应用更新选择安装包资源。 */
export function pickAppInstallerAsset(release: GithubRelease): GithubReleaseAsset | null {
  const assets = release.assets ?? [];
  const candidates = assets.filter((asset) => FILE_NAME_PATTERN.test(asset.name));
  const preferredExe = candidates.find((asset) => /\.exe$/i.test(asset.name));
  return preferredExe ?? candidates[0] ?? null;
}

/** 获取应用更新缓存目录。 */
export async function getAppUpdateDir(configService: ConfigService): Promise<string> {
  const cfg = await configService.load();
  const baseDir = cfg.download.tempDir
    ? cfg.download.tempDir
    : path.join(process.env['TEMP'] || process.cwd(), 'codev-downloads');
  const updateDir = path.join(baseDir, 'app-update');
  await fsp.mkdir(updateDir, { recursive: true });
  return updateDir;
}

/** 下载更新安装包。 */
async function downloadInstaller(
  configService: ConfigService,
  asset: GithubReleaseAsset,
  targetPath: string,
): Promise<void> {
  const cfg = await configService.load();
  const agent = createProxyAgent(cfg.proxy);
  const tempPath = `${targetPath}.download`;

  try {
    await fsp.rm(tempPath, { force: true });
  } catch {
    // ignore
  }

  const stream = got.stream(asset.browser_download_url, {
    headers: { 'user-agent': 'CodeV' },
    agent: agent ? { http: agent, https: agent } : undefined,
  });
  const file = fs.createWriteStream(tempPath);

  try {
    await pipeline(stream, file);
    await fsp.rename(tempPath, targetPath);
  } catch (error) {
    try {
      await fsp.rm(tempPath, { force: true });
    } catch {
      // ignore
    }
    throw error;
  }
}

/** 查找本地已缓存的同版本安装包。 */
async function findCachedInstaller(updateDir: string, latestVersion: string): Promise<string> {
  const files = await fsp.readdir(updateDir);
  for (const name of files) {
    if (extractVersionFromFileName(name) !== latestVersion) continue;
    const filePath = path.join(updateDir, name);
    const stat = await fsp.stat(filePath);
    if (stat.isFile() && stat.size > 0) return filePath;
  }
  return '';
}

/** 检查并准备应用更新。 */
export async function checkForAppUpdate(
  win: BrowserWindow,
  configService: ConfigService,
): Promise<AppUpdateResult> {
  try {
    const currentVersion = app.getVersion();
    const cfg = await configService.load();
    const releases = await fetchLatestReleases(APP_REPO, cfg.proxy, 20);
    const release = pickLatestRelease(releases);

    if (!release) {
      return {
        status: 'no-release',
        currentVersion,
        latestVersion: '',
        fileName: '',
        targetPath: '',
        message: '当前仓库还没有可用的 Release。',
      };
    }

    const asset = pickAppInstallerAsset(release);
    if (!asset) {
      return {
        status: 'error',
        currentVersion,
        latestVersion: '',
        fileName: '',
        targetPath: '',
        message: '未找到符合命名规则的安装包，期望形如 CodeV-1.0.0.exe。',
      };
    }

    const latestVersion = extractVersionFromFileName(asset.name) || normalizeVersion(release.tag_name).join('.');
    if (!latestVersion) {
      return {
        status: 'error',
        currentVersion,
        latestVersion: '',
        fileName: asset.name,
        targetPath: '',
        message: '无法识别最新版本号。',
      };
    }

    if (compareVersions(latestVersion, currentVersion) <= 0) {
      return {
        status: 'up-to-date',
        currentVersion,
        latestVersion,
        fileName: asset.name,
        targetPath: '',
        message: `当前已是最新版本 v${currentVersion}。`,
      };
    }

    const updateDir = await getAppUpdateDir(configService);
    const targetPath = path.join(updateDir, asset.name);
    const cachedPath = await findCachedInstaller(updateDir, latestVersion);

    const useCached = !!cachedPath;
    const readyPath = cachedPath || targetPath;

    if (!useCached) {
      const files = await fsp.readdir(updateDir);
      await Promise.all(
        files
          .filter((name) => name.startsWith(FILE_NAME_PREFIX))
          .map((name) => fsp.rm(path.join(updateDir, name), { force: true })),
      );
      await downloadInstaller(configService, asset, targetPath);
    }

    const result: AppUpdateResult = {
      status: useCached ? 'cached' : 'downloaded',
      currentVersion,
      latestVersion,
      fileName: path.basename(readyPath),
      targetPath: readyPath,
      message: useCached
        ? `已检测到本地缓存安装包 ${path.basename(readyPath)}，请手动安装更新到 v${latestVersion}。`
        : `最新安装包 ${asset.name} 已下载完成，请手动安装更新到 v${latestVersion}。`,
    };

    const dialogResult = await dialog.showMessageBox(win, {
      type: 'info',
      message: useCached ? '发现已缓存更新包' : '更新包下载完成',
      detail: `${result.message}\n\n是否打开安装包所在目录？`,
      buttons: ['打开目录', '关闭'],
      defaultId: 0,
    });

    if (dialogResult.response === 0) {
      void shell.showItemInFolder(readyPath);
    }

    return result;
  } catch (error) {
    const currentVersion = app.getVersion();
    return {
      status: 'error',
      currentVersion,
      latestVersion: '',
      fileName: '',
      targetPath: '',
      message: (error as Error).message || '检查更新失败',
    };
  }
}

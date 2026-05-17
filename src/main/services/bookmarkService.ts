import { app, type WebContents } from 'electron';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { downloadBufferWithHeaders, downloadText } from '@/main/services/gotDownloader';
import { type ProxyConfig } from '@/shared/types';

function cacheDir() {
  return path.join(app.getPath('home'), '.config', 'codev', 'bookmark');
}

function sha1(input: string) {
  return crypto.createHash('sha1').update(input).digest('hex');
}

function pickTitle(html: string) {
  const titleTag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleTag?.[1]) return titleTag[1].trim();
  const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i);
  if (og?.[1]) return og[1].trim();
  const metaTitle = html.match(/<meta[^>]+name=["']title["'][^>]+content=["']([^"']+)["'][^>]*>/i);
  if (metaTitle?.[1]) return metaTitle[1].trim();
  return '';
}

function pickIconHref(html: string) {
  const linkIcon = html.match(
    /<link[^>]+rel=["'](?:shortcut\s+icon|icon|apple-touch-icon)["'][^>]+href=["']([^"']+)["'][^>]*>/i,
  );
  if (linkIcon?.[1]) return linkIcon[1].trim();
  return '';
}

function extFromContentType(contentType: string) {
  const t = (contentType || '').split(';')[0].trim().toLowerCase();
  if (t === 'image/x-icon' || t === 'image/vnd.microsoft.icon') return '.ico';
  if (t === 'image/png') return '.png';
  if (t === 'image/svg+xml') return '.svg';
  if (t === 'image/jpeg') return '.jpg';
  if (t === 'image/webp') return '.webp';
  return '';
}

export class BookmarkService {
  async fetchMeta(
    url: string,
    opts?: {
      proxy?: ProxyConfig;
      timeoutMs?: number;
      renderer?: WebContents;
      toastTitle?: string;
      timeoutToastMessage?: string;
    },
  ): Promise<{ title: string; iconUrl: string }> {
    const html = await downloadText(url, {
      proxy: opts?.proxy,
      timeoutMs: opts?.timeoutMs ?? 5000,
      renderer: opts?.renderer,
      toastTitle: opts?.toastTitle ?? '书签添加提醒',
      timeoutToastMessage: opts?.timeoutToastMessage,
    });
    const title = pickTitle(html);
    const href = pickIconHref(html);
    const iconUrl = href ? new URL(href, url).toString() : new URL('/favicon.ico', url).toString();
    return { title, iconUrl };
  }

  async cacheFaviconByIconUrl(
    pageUrl: string,
    iconUrl: string,
    opts?: {
      proxy?: ProxyConfig;
      timeoutMs?: number;
      renderer?: WebContents;
      toastTitle?: string;
      timeoutToastMessage?: string;
    },
  ): Promise<string> {
    const res = await downloadBufferWithHeaders(iconUrl, {
      proxy: opts?.proxy,
      timeoutMs: opts?.timeoutMs ?? 5000,
      renderer: opts?.renderer,
      toastTitle: opts?.toastTitle ?? '书签添加提醒',
      timeoutToastMessage: opts?.timeoutToastMessage,
    });
    const contentType = res.headers['content-type'] ? String(res.headers['content-type']) : '';
    const ext = extFromContentType(contentType) || path.extname(new URL(iconUrl).pathname) || '.ico';
    const fileName = `${sha1(pageUrl)}${ext}`;
    const dir = cacheDir();
    await fs.mkdir(dir, { recursive: true });
    const targetPath = path.join(dir, fileName);
    await fs.writeFile(targetPath, res.body);
    return targetPath;
  }

  async cacheFavicon(
    pageUrl: string,
    opts?: {
      proxy?: ProxyConfig;
      timeoutMs?: number;
      renderer?: WebContents;
      toastTitle?: string;
      timeoutToastMessage?: string;
    },
  ): Promise<string> {
    const { iconUrl } = await this.fetchMeta(pageUrl, opts);
    return this.cacheFaviconByIconUrl(pageUrl, iconUrl, opts);
  }

  async deleteCachedIcon(iconPath: string): Promise<void> {
    const p = String(iconPath || '').trim();
    if (!p) return;
    const dir = cacheDir().replaceAll('\\', '/').toLowerCase();
    const candidate = path.resolve(p).replaceAll('\\', '/').toLowerCase();
    if (!candidate.startsWith(dir)) return;
    try {
      await fs.unlink(p);
    } catch {
      return;
    }
  }
}

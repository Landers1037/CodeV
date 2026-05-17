import { ipcMain, shell, type WebContents } from 'electron';
import crypto from 'node:crypto';

import { type ConfigService } from '@/main/services/configService';
import { BookmarkService } from '@/main/services/bookmarkService';
import { type AppConfig } from '@/shared/types';

function normalizeUrl(url: string) {
  const u = new URL(url);
  return u.toString();
}

function buildBookmarkId(url: string) {
  return crypto.createHash('sha1').update(url).digest('hex');
}

async function resolveBookmarkIcon(
  bookmarkService: BookmarkService,
  renderer: WebContents,
  url: string,
): Promise<string> {
  try {
    const meta = await bookmarkService.fetchMeta(url);
    if (!meta.iconUrl) return '';
    return await bookmarkService.cacheFaviconByIconUrl(url, meta.iconUrl);
  } catch (err) {
    if (isTimeoutError(err)) {
      renderer.send('notify:toast', {
        title: '书签编辑提醒',
        message: `更新 URL 后请求图标超时（5s）：${url}`,
      });
    }
    return '';
  }
}

function isTimeoutError(err: unknown) {
  const e = err as { code?: unknown; name?: unknown; message?: unknown };
  const code = typeof e?.code === 'string' ? e.code : '';
  const name = typeof e?.name === 'string' ? e.name : '';
  const msg = typeof e?.message === 'string' ? e.message : '';
  return (
    code === 'ETIMEDOUT' ||
    code === 'ESOCKETTIMEDOUT' ||
    name.toLowerCase().includes('timeout') ||
    msg.toLowerCase().includes('timeout')
  );
}

export function registerBookmarkIpc(configService: ConfigService, renderer: WebContents) {
  const bookmarkService = new BookmarkService();

  ipcMain.handle('bookmarks:add', async (_event, rawUrl: string) => {
    const url = normalizeUrl(String(rawUrl || '').trim());
    const id = buildBookmarkId(url);

    const cfg = await configService.load();
    const existing = (cfg.bookmarks ?? []).find((b) => b.id === id);
    if (existing) return cfg;

    let meta: { title: string; iconUrl: string } | null = null;
    let fallbackTitle = '';
    try {
      meta = await bookmarkService.fetchMeta(url);
    } catch (err) {
      fallbackTitle = url;
      if (isTimeoutError(err)) {
        renderer.send('notify:toast', {
          title: '书签添加提醒',
          message: `请求超时（5s），已将 Title 设为 URL：${url}`,
        });
      } else {
        renderer.send('notify:toast', {
          title: '书签添加提醒',
          message: `获取网页信息失败，已将 Title 设为 URL：${url}`,
        });
      }
    }

    let iconPath = '';
    if (meta?.iconUrl) {
      try {
        iconPath = await bookmarkService.cacheFaviconByIconUrl(url, meta.iconUrl);
      } catch {
        iconPath = '';
      }
    }

    const title = (meta?.title || '').trim() || fallbackTitle || url;
    const nextBookmarks = [...(cfg.bookmarks ?? []), { id, url, title, iconPath }];
    const next = await configService.update({ bookmarks: nextBookmarks } satisfies Partial<AppConfig>);
    renderer.send('config:changed', next);
    return next;
  });

  ipcMain.handle('bookmarks:remove', async (_event, bookmarkId: string) => {
    const id = String(bookmarkId || '').trim();
    const cfg = await configService.load();
    const target = (cfg.bookmarks ?? []).find((b) => b.id === id);
    const nextBookmarks = (cfg.bookmarks ?? []).filter((b) => b.id !== id);
    const next = await configService.update({ bookmarks: nextBookmarks } satisfies Partial<AppConfig>);
    if (target?.iconPath) {
      await bookmarkService.deleteCachedIcon(target.iconPath);
    }
    renderer.send('config:changed', next);
    return next;
  });

  ipcMain.handle(
    'bookmarks:update',
    async (_event, bookmarkId: string, payload: { url?: string; title?: string }) => {
      const id = String(bookmarkId || '').trim();
      const cfg = await configService.load();
      const target = (cfg.bookmarks ?? []).find((b) => b.id === id);
      if (!target) return cfg;

      const nextTitle = typeof payload?.title === 'string' ? payload.title : target.title;
      const nextUrl =
        typeof payload?.url === 'string' ? normalizeUrl(String(payload.url).trim()) : target.url;
      const nextId = buildBookmarkId(nextUrl);
      const duplicated = (cfg.bookmarks ?? []).some((b) => b.id === nextId && b.id !== id);
      if (duplicated) {
        throw new Error('该 URL 书签已存在');
      }

      let nextIconPath = target.iconPath;
      if (nextUrl !== target.url) {
        nextIconPath = await resolveBookmarkIcon(bookmarkService, renderer, nextUrl);
      }

      const nextBookmarks = (cfg.bookmarks ?? []).map((b) =>
        b.id === id
          ? {
              ...b,
              id: nextId,
              url: nextUrl,
              title: nextTitle,
              iconPath: nextIconPath,
            }
          : b,
      );
      const next = await configService.update({ bookmarks: nextBookmarks } satisfies Partial<AppConfig>);
      if (nextUrl !== target.url && target.iconPath && target.iconPath !== nextIconPath) {
        await bookmarkService.deleteCachedIcon(target.iconPath);
      }
      renderer.send('config:changed', next);
      return next;
    },
  );

  ipcMain.handle('bookmarks:open', async (_event, rawUrl: string) => {
    const url = normalizeUrl(String(rawUrl || '').trim());
    await shell.openExternal(url);
  });
}

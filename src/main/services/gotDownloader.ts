import got from 'got';
import { type WebContents } from 'electron';

import { createProxyAgent } from '@/main/services/network';
import { type ProxyConfig } from '@/shared/types';

export type DownloadCommonOptions = {
  proxy?: ProxyConfig;
  timeoutMs?: number;
  headers?: Record<string, string>;
  toastTitle?: string;
  timeoutToastMessage?: string;
};

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

function notifyTimeout(
  renderer: WebContents | undefined,
  title: string,
  url: string,
  timeoutMs: number,
  message?: string,
) {
  renderer?.send('notify:toast', {
    title,
    message: message || `请求超时（${Math.max(0, Math.round(timeoutMs / 1000))}s）：${url}`,
  });
}

function buildOptions(opts?: DownloadCommonOptions) {
  const timeoutMs = typeof opts?.timeoutMs === 'number' ? opts.timeoutMs : 5000;
  const agent = opts?.proxy ? createProxyAgent(opts.proxy) : undefined;
  return {
    timeoutMs,
    gotOptions: {
      headers: { 'user-agent': 'CodeV', ...(opts?.headers ?? {}) },
      timeout: { request: timeoutMs },
      agent: agent ? { http: agent, https: agent } : undefined,
      retry: { limit: 1 },
    } as const,
  };
}

export async function downloadText(
  url: string,
  opts?: DownloadCommonOptions & { renderer?: WebContents },
): Promise<string> {
  const { gotOptions, timeoutMs } = buildOptions(opts);
  try {
    const res = await got(url, gotOptions);
    return res.body || '';
  } catch (err) {
    if (isTimeoutError(err))
      notifyTimeout(
        opts?.renderer,
        opts?.toastTitle ?? '下载提醒',
        url,
        timeoutMs,
        opts?.timeoutToastMessage,
      );
    throw err;
  }
}

export async function downloadBuffer(
  url: string,
  opts?: DownloadCommonOptions & { renderer?: WebContents },
): Promise<Buffer> {
  const { gotOptions, timeoutMs } = buildOptions(opts);
  try {
    const res = await got(url, { ...gotOptions, responseType: 'buffer' });
    return res.body as Buffer;
  } catch (err) {
    if (isTimeoutError(err))
      notifyTimeout(
        opts?.renderer,
        opts?.toastTitle ?? '下载提醒',
        url,
        timeoutMs,
        opts?.timeoutToastMessage,
      );
    throw err;
  }
}

export async function downloadBufferWithHeaders(
  url: string,
  opts?: DownloadCommonOptions & { renderer?: WebContents },
): Promise<{ body: Buffer; headers: Record<string, unknown> }> {
  const { gotOptions, timeoutMs } = buildOptions(opts);
  try {
    const res = await got(url, { ...gotOptions, responseType: 'buffer' });
    return { body: res.body as Buffer, headers: res.headers as Record<string, unknown> };
  } catch (err) {
    if (isTimeoutError(err))
      notifyTimeout(
        opts?.renderer,
        opts?.toastTitle ?? '下载提醒',
        url,
        timeoutMs,
        opts?.timeoutToastMessage,
      );
    throw err;
  }
}

export function downloadStream(
  url: string,
  opts?: DownloadCommonOptions & { renderer?: WebContents },
) {
  const { gotOptions, timeoutMs } = buildOptions(opts);
  const stream = got.stream(url, gotOptions);
  stream.once('error', (err) => {
    if (isTimeoutError(err))
      notifyTimeout(
        opts?.renderer,
        opts?.toastTitle ?? '下载提醒',
        url,
        timeoutMs,
        opts?.timeoutToastMessage,
      );
  });
  return stream;
}

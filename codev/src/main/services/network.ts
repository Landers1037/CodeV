import { ProxyAgent } from 'proxy-agent';

import { type ProxyConfig } from '@/shared/types';

export function proxyToUrl(proxy: ProxyConfig): string {
  if (!proxy || proxy.type === 'none' || !proxy.host || !proxy.port) return '';
  const auth =
    proxy.username && proxy.password
      ? `${encodeURIComponent(proxy.username)}:${encodeURIComponent(proxy.password)}@`
      : '';
  const scheme = proxy.type === 'socks5' ? 'socks5' : 'http';
  return `${scheme}://${auth}${proxy.host}:${proxy.port}`;
}

export function createProxyAgent(proxy: ProxyConfig): ProxyAgent | undefined {
  const url = proxyToUrl(proxy);
  if (!url) return;
  return new ProxyAgent(url);
}


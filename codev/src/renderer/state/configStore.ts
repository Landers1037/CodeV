import { create } from 'zustand';

import { type AppConfig } from '@/shared/types';

type ConfigState = {
  config: AppConfig | null;
  loading: boolean;
  error: string;
  load: () => Promise<void>;
  update: (patch: Partial<AppConfig>) => Promise<void>;
};

export const useConfigStore = create<ConfigState>((set) => ({
  config: null,
  loading: false,
  error: '',
  load: async () => {
    set({ loading: true, error: '' });
    try {
      const cfg = await window.codev?.config?.get();
      if (!cfg) throw new Error('配置接口不可用');
      set({ config: cfg, loading: false });
      const off = window.codev?.config?.onChanged((next) => {
        set({ config: next });
      });
      offConfigChanged?.();
      offConfigChanged = off;
    } catch (e) {
      set({ loading: false, error: (e as Error).message || '加载失败' });
    }
  },
  update: async (patch) => {
    const api = window.codev?.config;
    if (!api) return;
    const next = await api.update(patch);
    set({ config: next });
  },
}));

let offConfigChanged: (() => void) | undefined;

export function applyTheme(theme: 'light' | 'dark') {
  const root = document.documentElement;
  if (theme === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
}

import { app } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';

import { defaultConfig } from '@/shared/defaults';
import { normalizeConfig } from '@/shared/normalizeConfig';
import { type AppConfig } from '@/shared/types';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.prototype.toString.call(value) === '[object Object]'
  );
}

function deepMerge<T>(base: T, patch: Partial<T>): T {
  if (!isPlainObject(base) || !isPlainObject(patch)) {
    return patch as T;
  }
  const result: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [key, value] of Object.entries(patch)) {
    const prev = result[key];
    if (isPlainObject(prev) && isPlainObject(value)) {
      result[key] = deepMerge(prev, value);
      continue;
    }
    result[key] = value;
  }
  return result as T;
}

export class ConfigService {
  private cache: AppConfig | null = null;

  getConfigPath(): string {
    const home = app.getPath('home');
    return path.join(home, '.config', 'codev', 'config.json');
  }

  async load(): Promise<AppConfig> {
    if (this.cache) return this.cache;

    const configPath = this.getConfigPath();
    await fs.mkdir(path.dirname(configPath), { recursive: true });

    try {
      const content = await fs.readFile(configPath, 'utf-8');
      const parsed = JSON.parse(content) as Partial<AppConfig>;
      const merged = deepMerge(defaultConfig(), parsed);
      const { next, changed } = normalizeConfig(merged);
      this.cache = next;
      if (changed) await this.write(next);
      return next;
    } catch (err) {
      const cfg = defaultConfig();
      const { next } = normalizeConfig(cfg);
      this.cache = next;
      await this.write(next);
      return next;
    }
  }

  async write(next: AppConfig): Promise<void> {
    const configPath = this.getConfigPath();
    await fs.mkdir(path.dirname(configPath), { recursive: true });
    const tmpPath = `${configPath}.tmp`;
    await fs.writeFile(tmpPath, JSON.stringify(next, null, 2), 'utf-8');
    await fs.rename(tmpPath, configPath);
  }

  async update(patch: Partial<AppConfig>): Promise<AppConfig> {
    const current = await this.load();
    const next = deepMerge(current, patch);
    const normalized = normalizeConfig(next);
    this.cache = normalized.next;
    await this.write(normalized.next);
    return normalized.next;
  }
}

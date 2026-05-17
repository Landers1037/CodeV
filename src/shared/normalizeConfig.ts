import { type AppConfig, type ToolMeta } from '@/shared/types';
import { defaultCategories, defaultTools } from '@/shared/defaults';

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function normalizeTool(tool: ToolMeta): ToolMeta {
  return {
    description: '',
    logoPath: '',
    needDownload: true,
    source: null,
    downloadUrl: '',
    installPath: '',
    detectedInstallPath: '',
    args: [],
    env: {},
    proxy: { type: 'none', host: '', port: 0, username: '', password: '' },
    ...tool,
  };
}

function normalizeCategories(
  input: string[] | undefined,
  toolCategories: string[],
): { categories: string[]; changed: boolean } {
  const base = (input ?? []).map((c) => c.trim()).filter(Boolean);
  const defaults = defaultCategories();

  const seen = new Set<string>();
  const out: string[] = [];

  for (const c of [...defaults, ...base, ...toolCategories]) {
    const v = c.trim();
    if (!v) continue;
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }

  const changed = JSON.stringify(out) !== JSON.stringify(input ?? []);
  return { categories: out, changed };
}

/** 规范化配置结构并补齐默认值。 */
export function normalizeConfig(input: AppConfig): { next: AppConfig; changed: boolean } {
  let changed = false;
  const configVersion = Math.max(input.configVersion || 1, 3);
  if (configVersion !== input.configVersion) changed = true;

  const tools = (input.tools ?? []).map((t) => {
    const normalized = normalizeTool(t);
    if (normalized.id === 'zero-limit' && normalized.category !== '代理/网络') {
      normalized.category = '代理/网络';
    }
    if (JSON.stringify(normalized) !== JSON.stringify(t)) changed = true;
    return normalized;
  });

  const toolIdSet = new Set(tools.map((t) => t.id).filter(Boolean));
  for (const t of defaultTools()) {
    if (toolIdSet.has(t.id)) continue;
    const normalized = normalizeTool(t);
    if (normalized.id === 'zero-limit' && normalized.category !== '代理/网络') {
      normalized.category = '代理/网络';
    }
    tools.push(normalized);
    toolIdSet.add(t.id);
    changed = true;
  }

  const toolCategories = tools.map((t) => t.category).filter(Boolean);
  const categoriesNorm = normalizeCategories(input.categories, toolCategories);
  if (categoriesNorm.changed) changed = true;

  const next: AppConfig = {
    ...input,
    configVersion,
    tools,
    categories: categoriesNorm.categories,
    repos: Array.isArray(input.repos)
      ? input.repos
          .map((r) => ({
            id: (r as { id?: unknown })?.id ? String((r as { id?: unknown }).id) : String((r as { path?: unknown })?.path ?? ''),
            path: String((r as { path?: unknown })?.path ?? '').trim(),
          }))
          .filter((r) => !!r.id && !!r.path)
          .filter((r, idx, arr) => arr.findIndex((x) => x.id === r.id) === idx)
      : [],
    bookmarks: Array.isArray(input.bookmarks)
      ? input.bookmarks
          .map((b) => ({
            id: (b as { id?: unknown })?.id ? String((b as { id?: unknown }).id) : String((b as { url?: unknown })?.url ?? ''),
            url: String((b as { url?: unknown })?.url ?? '').trim(),
            title: typeof (b as { title?: unknown })?.title === 'string' ? String((b as { title?: unknown }).title) : '',
            iconPath: typeof (b as { iconPath?: unknown })?.iconPath === 'string' ? String((b as { iconPath?: unknown }).iconPath) : '',
          }))
          .filter((b) => !!b.id && !!b.url)
          .filter((b, idx, arr) => arr.findIndex((x) => x.id === b.id) === idx)
      : [],
    env: {
      global: input.env?.global ?? {},
      perTool: input.env?.perTool ?? {},
    },
  };

  if (
    !input.env?.global ||
    !input.env?.perTool ||
    !Array.isArray(input.repos) ||
    !Array.isArray(input.bookmarks)
  ) {
    changed = true;
  }

  const prevTerminal = input.terminal;
  const fontFamilyRaw = (prevTerminal as unknown as { fontFamily?: unknown })?.fontFamily;
  const fontSizeRaw = (prevTerminal as unknown as { fontSize?: unknown })?.fontSize;

  const fontFamily =
    typeof fontFamilyRaw === 'string' && fontFamilyRaw.trim()
      ? fontFamilyRaw.trim().replaceAll('"', '').replaceAll("'", '')
      : 'Consolas';

  const fontSize =
    typeof fontSizeRaw === 'number'
      ? clampNumber(Math.round(fontSizeRaw), 10, 100)
      : 13;

  if (next.terminal.fontFamily !== fontFamily || next.terminal.fontSize !== fontSize) {
    next.terminal = {
      ...next.terminal,
      fontFamily,
      fontSize,
    };
    changed = true;
  }

  return { next, changed };
}

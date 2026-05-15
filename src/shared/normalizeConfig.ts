import { type AppConfig, type ToolMeta } from '@/shared/types';
import { defaultCategories, defaultTools } from '@/shared/defaults';

function normalizeTool(tool: ToolMeta): ToolMeta {
  return {
    description: '',
    logoPath: '',
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
  const configVersion = Math.max(input.configVersion || 1, 2);
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
    env: {
      global: input.env?.global ?? {},
      perTool: input.env?.perTool ?? {},
    },
  };

  if (!input.env?.global || !input.env?.perTool) changed = true;

  return { next, changed };
}

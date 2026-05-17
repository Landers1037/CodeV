import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  AppWindow,
  Archive,
  Bot,
  Code2,
  Compass,
  Database,
  EllipsisVertical,
  Folder,
  Globe,
  Layers,
  Loader2,
  Network,
  Pencil,
  Play,
  RefreshCw,
  Search,
  Settings2,
  Shield,
  Sparkles,
  Terminal,
  Terminal as TerminalIcon,
  Wrench,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useConfigStore } from '@/renderer/state/configStore';
import { type ToolMeta } from '@/shared/types';
import ccSwitchIcon from '../../../../assets/cc-switch.png';
import chatgptIcon from '../../../../assets/chatgpt.svg';
import claudeIcon from '../../../../assets/claude.svg';
import codexProxyIcon from '../../../../assets/codex-proxy.png';
import openDesignIcon from '../../../../assets/open-design.svg';
import opencodeIcon from '../../../../assets/opencode-logo-light.svg';
import proxypilotIcon from '../../../../assets/proxypilot.png';
import weztermIcon from '../../../../assets/wezterm-icon.svg';
import zeroLimitIcon from '../../../../assets/zero-limit.png';
import tabbyIcon from '../../../../assets/tabby.svg';
import gitIcon from '../../../../assets/git-bash.svg';
import cursorIcon from '../../../../assets/Cursor.png';
import traeIcon from '../../../../assets/trae-logo.svg';
import vscodeIcon from '../../../../assets/vscode-icon.svg';

const bundledToolIcons: Record<string, string> = {
  'cc-switch': ccSwitchIcon,
  'claude-code': claudeIcon,
  codex: chatgptIcon,
  'codex-proxy': codexProxyIcon,
  'open-design': openDesignIcon,
  opencode: opencodeIcon,
  proxypilot: proxypilotIcon,
  wezterm: weztermIcon,
  'zero-limit': zeroLimitIcon,
  tabby: tabbyIcon,
  git: gitIcon,
  cursor: cursorIcon,
  trae: traeIcon,
  vscode: vscodeIcon,
};

function isTerminalToolId(id: string) {
  return id === 'claude-code' || id === 'opencode';
}

function toNumber(value: string, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function envMapToText(map: Record<string, string>) {
  return Object.entries(map)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
}

function textToEnvMap(text: string): Record<string, string> {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const out: Record<string, string> = {};
  for (const line of lines) {
    const idx = line.indexOf('=');
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (!key) continue;
    out[key] = value;
  }
  return out;
}

function toImageSrc(filePath: string) {
  if (!filePath) return '';
  if (/^(https?:|data:|file:)/i.test(filePath)) return filePath;
  const normalized = filePath.replace(/\\/g, '/');
  return `file:///${normalized.replace(/^\/+/, '')}`;
}

function resolveToolIcon(tool: ToolMeta) {
  if (tool.logoPath) return toImageSrc(tool.logoPath);
  return bundledToolIcons[tool.id] ?? '';
}

function getToolInitial(name: string) {
  const text = name.trim();
  if (!text) return '?';
  const first = Array.from(text)[0] ?? '?';
  return /[a-z]/i.test(first) ? first.toUpperCase() : first;
}

function getStableHash(text: string) {
  let hash = 0;
  for (const ch of text) {
    hash = (hash << 5) - hash + ch.codePointAt(0)!;
    hash |= 0;
  }
  return Math.abs(hash);
}

function resolveCategoryIcon(categoryId: string, label: string) {
  if (categoryId === 'all') return Settings2;
  const v = `${categoryId} ${label}`.toLowerCase();
  if (v.includes('归档') || v.includes('archiv')) return Archive;
  if (v.includes('终端') || v.includes('terminal') || v.includes('shell')) return Terminal;
  if (v.includes('ai') || v.includes('模型') || v.includes('大模型')) return Sparkles;
  if (v.includes('开发') || v.includes('dev') || v.includes('ide')) return Code2;
  if (v.includes('网络') || v.includes('proxy') || v.includes('vpn')) return Network;
  if (v.includes('安全') || v.includes('security')) return Shield;
  if (v.includes('数据') || v.includes('db') || v.includes('database')) return Database;
  if (v.includes('浏览') || v.includes('web') || v.includes('browser')) return Globe;
  if (v.includes('文件') || v.includes('folder')) return Folder;
  if (v.includes('工具') || v.includes('settings') || v.includes('配置')) return Wrench;
  if (v.includes('设计') || v.includes('design')) return Compass;
  if (v.includes('协作') || v.includes('团队') || v.includes('team')) return Layers;
  if (v.includes('应用') || v.includes('app')) return AppWindow;
  if (v.includes('bot') || v.includes('agent')) return Bot;

  const candidates = [
    Layers,
    Compass,
    Wrench,
    Globe,
    Code2,
    Bot,
    Archive,
    Database,
    Network,
    Shield,
    Sparkles,
    Folder,
    AppWindow,
    Terminal,
  ] as const;
  return candidates[getStableHash(v) % candidates.length];
}

/** 首页工具列表页面。 */
export function HomePage() {
  const { config, update } = useConfigStore();
  const [message, setMessage] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [scanningTools, setScanningTools] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [keyword, setKeyword] = useState('');
  const navigate = useNavigate();
  const [editing, setEditing] = useState<ToolMeta | null>(null);
  const tools = config?.tools ?? [];

  const categories = useMemo(() => {
    const fromConfig = config?.categories ?? [];
    const fromTools = (config?.tools ?? []).map((t) => t.category).filter(Boolean);
    const seen = new Set<string>();
    const out: string[] = [];
    for (const c of [...fromConfig, ...fromTools]) {
      const v = c.trim();
      if (!v) continue;
      if (seen.has(v)) continue;
      seen.add(v);
      out.push(v);
    }
    return out;
  }, [config?.categories, tools]);

  const categoryItems = useMemo(() => {
    const counts = new Map<string, number>();
    for (const tool of tools) {
      counts.set(tool.category, (counts.get(tool.category) ?? 0) + 1);
    }

    const items = categories.map((category) => ({
      id: category,
      label: category,
      count: counts.get(category) ?? 0,
    }));

    return [
      {
        id: 'all',
        label: '全部工具',
        count: tools.length,
      },
      ...items,
    ];
  }, [categories, tools]);

  const visibleGroups = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    const filtered = tools.filter((tool) => {
      const matchCategory = selectedCategory === 'all' || tool.category === selectedCategory;
      if (!matchCategory) return false;
      if (!normalizedKeyword) return true;
      return [tool.name, tool.description, tool.category, tool.installPath, tool.detectedInstallPath]
        .join(' ')
        .toLowerCase()
        .includes(normalizedKeyword);
    });

    if (selectedCategory !== 'all') {
      return filtered.length ? [[selectedCategory, filtered] as const] : [];
    }

    const map = new Map<string, ToolMeta[]>();
    for (const tool of filtered) {
      const list = map.get(tool.category) ?? [];
      list.push(tool);
      map.set(tool.category, list);
    }

    return Array.from(map.entries());
  }, [keyword, selectedCategory, tools]);

  const installedCount = useMemo(() => {
    return tools.filter((tool) => tool.installPath || tool.detectedInstallPath).length;
  }, [tools]);

  useEffect(() => {
    if (categoryItems.some((item) => item.id === selectedCategory)) return;
    setSelectedCategory(categoryItems[0]?.id ?? 'all');
  }, [categoryItems, selectedCategory]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(''), 3500);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  return (
    <div className="flex h-full min-h-0 gap-4 select-none">
      <aside className="app-soft-panel flex w-[290px] shrink-0 flex-col rounded-[24px] p-4 select-none">
        <div className="pb-4">
          <div className="text-lg font-semibold tracking-tight select-none">工具分类</div>
          <div className="mt-1 text-sm text-muted-foreground">
            从左侧分组快速切换常用工具列表。
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 border-y border-border/60 py-4">
          <div className="rounded-2xl border border-border/70 bg-card/70 px-3 py-3">
            <div className="text-xs text-muted-foreground">工具总数</div>
            <div className="mt-2 text-2xl font-semibold">{tools.length}</div>
          </div>
          <div className="rounded-2xl border border-border/70 bg-card/70 px-3 py-3">
            <div className="text-xs text-muted-foreground">已安装</div>
            <div className="mt-2 text-2xl font-semibold">{installedCount}</div>
          </div>
        </div>

        <div className="mt-4 flex-1 overflow-auto pr-1">
          <div className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            分组导航
          </div>
          <div className="space-y-2">
            {categoryItems.map((item) => {
              const isActive = item.id === selectedCategory;
              const Icon = resolveCategoryIcon(item.id, item.label);
              return (
                <button
                  key={item.id}
                  type="button"
                  className={cn(
                    'flex w-full items-center justify-between rounded-[12px] px-4 py-3 text-left transition-[background-color,box-shadow,color,transform] duration-200 ease-out hover:-translate-y-0.5',
                    isActive
                      ? 'bg-accent/75 text-foreground shadow-[0_18px_34px_-26px_rgb(36,27,20,0.38)]'
                      : 'bg-transparent text-muted-foreground hover:bg-card/70 hover:text-foreground hover:shadow-[0_14px_28px_-26px_rgb(36,27,20,0.35)]',
                  )}
                  onClick={() => setSelectedCategory(item.id)}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-card/60',
                        isActive ? 'text-foreground' : 'text-muted-foreground',
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="truncate text-sm font-medium">{item.label}</span>
                  </span>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-xs',
                      isActive ? 'bg-accent/90 text-foreground' : 'bg-secondary text-muted-foreground',
                    )}
                  >
                    {item.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
        <div className="grid grid-cols-1 gap-4">
          <Card className="bg-card/74">
            <CardContent className="flex items-center justify-between gap-4 py-5">
              <div>
                <div className="text-lg font-semibold tracking-tight">程序工作台</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  支持按分类筛选、搜索工具、检测安装状态并直接启动。
                </div>
              </div>
              <Button
                variant="secondary"
                disabled={scanningTools}
                onClick={async () => {
                  if (scanningTools) return;
                  setMessage('');
                  setScanningTools(true);
                  try {
                    await window.codev?.tools?.scan();
                    setToastMessage('扫描完毕');
                  } catch {
                    setToastMessage('扫描失败');
                  } finally {
                    setScanningTools(false);
                  }
                }}
              >
                {scanningTools ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {scanningTools ? '扫描中…' : '扫描安装目录'}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="app-soft-panel flex min-h-0 flex-1 flex-col gap-4 rounded-[24px] p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-10"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索名称、分类、说明或安装路径"
              />
            </div>

            <AnimatePresence mode="wait">
              {message ? (
                <motion.div
                  key={message}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="rounded-2xl border border-border/70 bg-card/70 px-4 py-2 text-sm text-muted-foreground"
                >
                  {message}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          <div className="min-h-0 flex-1 overflow-auto pr-1">
            <div className="space-y-4">
              {visibleGroups.map(([category, items]) => (
                <section key={category} className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <div>
                      <div className="text-base font-semibold tracking-tight">{category}</div>
                      <div className="text-sm text-muted-foreground">
                        {items.length} 个程序，支持直接启动和维护。
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {items.map((t) => {
                      const installed = !!(t.installPath || t.detectedInstallPath);
                      const canTerminal = installed && isTerminalToolId(t.id);
                      const canDownload = t.needDownload !== false && t.source?.kind === 'githubRelease';
                      const iconSrc = resolveToolIcon(t);
                      const pathText =
                        t.installPath || t.detectedInstallPath || '未检测到安装路径';

                      return (
                        <motion.div
                          key={t.id}
                          className="group flex flex-col gap-4 rounded-[22px] border border-border/70 bg-card/84 p-4 shadow-[0_18px_38px_-28px_rgb(36,27,20,0.38)] transition-[border-color,box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:border-border hover:shadow-[0_24px_44px_-28px_rgb(36,27,20,0.42)] lg:flex-row lg:items-center lg:justify-between"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.18, ease: 'easeOut' }}
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-4">
                            {iconSrc ? (
                              <img
                                src={iconSrc}
                                alt={t.name}
                                className="h-12 w-12 shrink-0 rounded-2xl border border-border/70 bg-card object-contain p-2"
                              />
                            ) : (
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-card text-base font-semibold text-foreground/80">
                                {getToolInitial(t.name)}
                              </div>
                            )}

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="truncate text-base font-semibold">{t.name}</div>
                                <span
                                  className={cn(
                                    'rounded-full px-2.5 py-1 text-xs font-medium',
                                    installed
                                      ? 'bg-primary/14 text-primary'
                                      : !canDownload
                                        ? 'bg-secondary text-muted-foreground'
                                        : 'bg-amber-500/14 text-amber-600 dark:text-amber-300',
                                  )}
                                >
                                  {installed
                                    ? '已安装'
                                    : canDownload
                                      ? '可下载'
                                      : '仅扫描'}
                                </span>
                              </div>

                              <div className="mt-1 truncate text-sm text-muted-foreground">
                                {t.description || '暂无说明，建议补充程序用途或使用场景。'}
                              </div>
                              <div
                                className="mt-2 truncate text-xs text-muted-foreground"
                                title={pathText}
                              >
                                {installed ? `安装路径：${pathText}` : pathText}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              disabled={!installed}
                              onClick={async () => {
                                setMessage('');
                                const res = await window.codev?.tools?.open(t.id);
                                if (!res) return;
                                if (res.ok) {
                                  setMessage(
                                    res.reused ? '已在运行，已尝试聚焦' : `已启动 PID=${res.pid}`,
                                  );
                                } else if ('error' in res) {
                                  setMessage(res.error);
                                }
                              }}
                            >
                              <Play className="h-4 w-4" />
                              打开
                            </Button>

                            {canTerminal ? (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  localStorage.setItem('__codev_terminal_tool__', t.id);
                                  navigate('/terminal');
                                }}
                              >
                                <TerminalIcon className="h-4 w-4" />
                                终端
                              </Button>
                            ) : null}

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  className="app-no-drag inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-card/85 text-muted-foreground transition-[background-color,color,transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:bg-accent/70 hover:text-foreground hover:shadow-[0_18px_34px_-26px_rgb(36,27,20,0.45)]"
                                  type="button"
                                  aria-label={`更多操作：${t.name}`}
                                >
                                  <EllipsisVertical className="h-4 w-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  disabled={!installed}
                                  onSelect={async () => {
                                    setMessage('');
                                    const res = await window.codev?.tools?.open(t.id);
                                    if (!res) return;
                                    if (res.ok) {
                                      setMessage(
                                        res.reused
                                          ? '已在运行，已尝试聚焦'
                                          : `已启动 PID=${res.pid}`,
                                      );
                                    } else if ('error' in res) {
                                      setMessage(res.error);
                                    }
                                  }}
                                >
                                  <Play className="h-4 w-4" />
                                  打开
                                </DropdownMenuItem>
                                {canTerminal ? (
                                  <DropdownMenuItem
                                    onSelect={() => {
                                      localStorage.setItem('__codev_terminal_tool__', t.id);
                                      navigate('/terminal');
                                    }}
                                  >
                                    <TerminalIcon className="h-4 w-4" />
                                    新建终端
                                  </DropdownMenuItem>
                                ) : null}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onSelect={() => setEditing(t)}>
                                  <Pencil className="h-4 w-4" />
                                  编辑
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onSelect={async () => {
                                    setMessage('');
                                    const next = await window.codev?.tools?.check(t.id);
                                    const checked = next?.tools?.find((x) => x.id === t.id);
                                    const installedNow = !!(
                                      checked?.installPath || checked?.detectedInstallPath
                                    );
                                    if (installedNow) {
                                      setMessage('已检测到安装');
                                      setToastMessage('');
                                    } else {
                                      setToastMessage(
                                        `${t.name} 未检测到安装，请先安装或配置路径`,
                                      );
                                    }
                                  }}
                                >
                                  <Search className="h-4 w-4" />
                                  检查
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </section>
              ))}

              {!visibleGroups.length ? (
                <div className="app-setting-preview flex min-h-[260px] items-center justify-center text-sm text-muted-foreground">
                  当前筛选条件下暂无工具，尝试切换分类或清空搜索关键词。
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <Dialog
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>编辑工具</DialogTitle>
            <DialogDescription>支持修改名称、说明、图标、代理和环境变量</DialogDescription>
          </DialogHeader>

          {editing ? (
            <Tabs defaultValue="basic">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="basic">基础信息</TabsTrigger>
                <TabsTrigger value="proxy">代理</TabsTrigger>
                <TabsTrigger value="env">环境变量</TabsTrigger>
              </TabsList>

              <TabsContent value="basic">
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <Label>名称</Label>
                      <Input
                        value={editing.name}
                        onChange={(e) =>
                          setEditing({ ...editing, name: e.target.value })
                        }
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label>分类</Label>
                      <div className="flex gap-2">
                        <Input
                          className="flex-1"
                          value={editing.category}
                          onChange={(e) =>
                            setEditing({ ...editing, category: e.target.value })
                          }
                          placeholder="可输入或从右侧选择"
                        />
                        <Select
                          value={
                            categories.includes(editing.category) ? editing.category : ''
                          }
                          onValueChange={(value) =>
                            setEditing({ ...editing, category: value })
                          }
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue placeholder="选择" />
                          </SelectTrigger>
                          <SelectContent align="end">
                            <SelectGroup>
                              <SelectLabel>分类</SelectLabel>
                              {categories.map((c) => (
                                <SelectItem key={c} value={c}>
                                  {c}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label>说明</Label>
                    <Textarea
                      rows={3}
                      value={editing.description}
                      onChange={(e) =>
                        setEditing({ ...editing, description: e.target.value })
                      }
                      placeholder="简要说明程序用途"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label>安装路径（可执行文件或目录）</Label>
                    <div className="flex gap-2">
                      <Input
                        value={editing.installPath}
                        onChange={(e) =>
                          setEditing({ ...editing, installPath: e.target.value })
                        }
                      />
                      <Button
                        variant="secondary"
                        onClick={async () => {
                          const p = await window.codev?.dialog?.openExe();
                          if (p) setEditing({ ...editing, installPath: p });
                        }}
                      >
                        选择
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label>图标</Label>
                    <div className="flex gap-2">
                      <Input
                        value={editing.logoPath}
                        onChange={(e) =>
                          setEditing({ ...editing, logoPath: e.target.value })
                        }
                        placeholder="上传后将保存到 %USERPROFILE%/.config/codecv/assets"
                      />
                      <Button
                        variant="secondary"
                        onClick={async () => {
                          const p = await window.codev?.dialog?.importToolIcon();
                          if (p) setEditing({ ...editing, logoPath: p });
                        }}
                      >
                        上传
                      </Button>
                    </div>
                    {resolveToolIcon(editing) ? (
                      <div className="app-setting-preview flex items-center gap-3 px-3 py-3">
                        <img
                          src={resolveToolIcon(editing)}
                          alt={editing.name}
                          className="h-10 w-10 rounded-xl border border-border/60 bg-card/60 object-contain p-1"
                        />
                        <div className="truncate text-xs text-muted-foreground">
                          {editing.logoPath || '使用内置图标'}
                        </div>
                      </div>
                    ) : (
                      <div className="app-setting-preview flex items-center gap-3 px-3 py-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-card/60 text-sm font-semibold text-foreground/80">
                          {getToolInitial(editing.name)}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          未设置图标，使用名称首字母
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="app-setting-row flex items-center justify-between gap-4">
                    <Label>GUI 程序</Label>
                    <Switch
                      checked={editing.isGui}
                      onCheckedChange={(checked) =>
                        setEditing({ ...editing, isGui: checked })
                      }
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="proxy">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <Label>类型</Label>
                    <Input
                      value={editing.proxy.type}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          proxy: {
                            ...editing.proxy,
                            type: e.target.value as typeof editing.proxy.type,
                          },
                        })
                      }
                      placeholder="none / http / socks5"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <Label>地址</Label>
                      <Input
                        value={editing.proxy.host}
                        onChange={(e) =>
                          setEditing({
                            ...editing,
                            proxy: { ...editing.proxy, host: e.target.value },
                          })
                        }
                        placeholder="127.0.0.1"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label>端口</Label>
                      <Input
                        value={editing.proxy.port ? String(editing.proxy.port) : ''}
                        onChange={(e) =>
                          setEditing({
                            ...editing,
                            proxy: {
                              ...editing.proxy,
                              port: toNumber(e.target.value, 0),
                            },
                          })
                        }
                        placeholder="7890"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <Label>用户名</Label>
                      <Input
                        value={editing.proxy.username}
                        onChange={(e) =>
                          setEditing({
                            ...editing,
                            proxy: { ...editing.proxy, username: e.target.value },
                          })
                        }
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label>密码</Label>
                      <Input
                        type="password"
                        value={editing.proxy.password}
                        onChange={(e) =>
                          setEditing({
                            ...editing,
                            proxy: { ...editing.proxy, password: e.target.value },
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="env">
                <div className="flex flex-col gap-2">
                  <Label>每行一个，格式：KEY=VALUE</Label>
                  <Textarea
                    rows={12}
                    value={envMapToText(editing.env)}
                    onChange={(e) =>
                      setEditing({ ...editing, env: textToEnvMap(e.target.value) })
                    }
                    placeholder="ANTHROPIC_BASE_URL=http://127.0.0.1:7890"
                  />
                </div>
              </TabsContent>

              <div className="mt-2 flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setEditing(null)}>
                  取消
                </Button>
                <Button
                  onClick={async () => {
                    if (!config) return;
                    const tools = config.tools.map((x) =>
                      x.id === editing.id ? editing : x,
                    );
                    const nextCategories = (() => {
                      const v = editing.category.trim();
                      if (!v) return config.categories;
                      if (config.categories.includes(v)) return config.categories;
                      return [...config.categories, v];
                    })();
                    await update({ tools, categories: nextCategories });
                    setEditing(null);
                    setMessage('已保存');
                  }}
                >
                  保存
                </Button>
              </div>
            </Tabs>
          ) : null}
        </DialogContent>
      </Dialog>

      <AnimatePresence>
        {toastMessage ? (
          <motion.div
            initial={{ opacity: 0, x: 24, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 24, y: 8, scale: 0.96 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="pointer-events-none fixed bottom-6 right-6 z-50 max-w-sm rounded-[22px] border border-amber-500/30 bg-[rgb(120,70,20,0.16)] px-4 py-3 shadow-[0_24px_50px_-28px_rgb(0,0,0,0.5)] backdrop-blur-xl"
          >
            <div className="text-sm font-medium text-amber-900 dark:text-amber-200">
              安装检查提醒
            </div>
            <div className="mt-1 text-sm text-amber-800/90 dark:text-amber-100/90">
              {toastMessage}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

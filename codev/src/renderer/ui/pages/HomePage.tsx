import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { EllipsisVertical, Pencil, Play, Search, Terminal as TerminalIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

/** 首页工具列表页面。 */
export function HomePage() {
  const { config, update } = useConfigStore();
  const [message, setMessage] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const navigate = useNavigate();
  const [editing, setEditing] = useState<ToolMeta | null>(null);

  const grouped = useMemo(() => {
    const tools = config?.tools ?? [];
    const map = new Map<string, typeof tools>();
    for (const t of tools) {
      const list = map.get(t.category) ?? [];
      list.push(t);
      map.set(t.category, list);
    }
    return Array.from(map.entries());
  }, [config]);

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
  }, [config?.categories, config?.tools]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(''), 3500);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  return (
    <div className="h-full overflow-auto p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="text-lg font-semibold">工具</div>
        <Button
          variant="secondary"
          onClick={() => {
            setMessage('');
            void window.codev?.tools?.scan();
          }}
        >
          扫描安装目录
        </Button>
      </div>
      <AnimatePresence mode="wait">
        {message ? (
          <motion.div
            key={message}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="mb-3 text-sm text-muted-foreground"
          >
            {message}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="space-y-4">
        {grouped.map(([category, tools]) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle>{category}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {tools.map((t) => {
                const installed = !!(t.installPath || t.detectedInstallPath);
                const canTerminal = installed && isTerminalToolId(t.id);
                const iconSrc = resolveToolIcon(t);
                return (
                  <motion.div
                    key={t.id}
                    className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-background/40 p-3"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ y: -2, scale: 1.01 }}
                    whileTap={{ scale: 0.995 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {iconSrc ? (
                        <img
                          src={iconSrc}
                          alt={t.name}
                          className="h-9 w-9 shrink-0 rounded-lg border border-border/60 bg-card/60 object-contain p-1"
                        />
                      ) : (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-card/60 text-sm font-semibold text-foreground/80">
                          {getToolInitial(t.name)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{t.name}</div>
                        {t.description ? (
                          <div className="truncate text-xs text-muted-foreground">
                            {t.description}
                          </div>
                        ) : null}
                        <div className="truncate text-xs text-muted-foreground">
                          {installed
                            ? `已安装：${t.installPath || t.detectedInstallPath}`
                            : t.source.scanOnly
                              ? '未检测到安装（仅扫描）'
                              : '未安装，可下载'}
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <motion.button
                          className="app-no-drag inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-card/60 shadow-sm transition-[transform,background-color,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:bg-accent/60 hover:shadow-md active:scale-95"
                          type="button"
                          whileHover={{ scale: 1.04 }}
                          whileTap={{ scale: 0.94 }}
                          transition={{ duration: 0.15, ease: 'easeOut' }}
                        >
                          <EllipsisVertical className="h-4 w-4" />
                        </motion.button>
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
                              setToastMessage(`${t.name} 未检测到安装，请先安装或配置路径`);
                            }
                          }}
                        >
                          <Search className="h-4 w-4" />
                          检查
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </motion.div>
                );
              })}
            </CardContent>
          </Card>
        ))}
        {!grouped.length ? (
          <div className="text-sm text-muted-foreground">暂无工具配置</div>
        ) : null}
      </div>

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
                      <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/40 px-3 py-2">
                        <img
                          src={resolveToolIcon(editing)}
                          alt={editing.name}
                          className="h-10 w-10 rounded-lg border border-border/60 bg-card/60 object-contain p-1"
                        />
                        <div className="truncate text-xs text-muted-foreground">
                          {editing.logoPath || '使用内置图标'}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/40 px-3 py-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border/60 bg-card/60 text-sm font-semibold text-foreground/80">
                          {getToolInitial(editing.name)}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          未设置图标，使用名称首字母
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-4">
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
            className="pointer-events-none fixed bottom-6 right-6 z-50 max-w-sm rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 shadow-xl backdrop-blur"
          >
            <div className="text-sm font-medium text-amber-200">安装检查提醒</div>
            <div className="mt-1 text-sm text-amber-100/90">{toastMessage}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

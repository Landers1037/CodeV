import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import {
  Download,
  Palette,
  Shield,
  SlidersHorizontal,
  Terminal as TerminalIcon,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
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
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useConfigStore } from '@/renderer/state/configStore';
import { getTerminalAnsiPalette, getTerminalTheme, terminalColorSchemeItems } from '@/renderer/terminalThemes';
import { type AppConfig, type ProxyType } from '@/shared/types';

function toNumber(value: string, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function uniqueStrings(items: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const v = raw.trim();
    if (!v) continue;
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

function envMapToText(map: Record<string, string>) {
  return Object.entries(map)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
}

function textToEnvMap(text: string): Record<string, string> {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
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

const settingTabs = [
  {
    id: 'appearance',
    label: '外观',
    description: '主题与视觉表现',
    icon: Palette,
  },
  {
    id: 'download',
    label: '下载',
    description: '并发与临时目录',
    icon: Download,
  },
  {
    id: 'proxy',
    label: '代理',
    description: '网络连接参数',
    icon: Shield,
  },
  {
    id: 'env',
    label: '环境',
    description: '全局与工具变量',
    icon: TerminalIcon,
  },
  {
    id: 'advanced',
    label: '高级',
    description: '启动与日志行为',
    icon: SlidersHorizontal,
  },
] as const;

/** 设置页面。 */
export function SettingsPage() {
  const { config, update, loading, error } = useConfigStore();
  const [draft, setDraft] = useState<AppConfig | null>(null);
  const [envToolId, setEnvToolId] = useState<string>('');
  const [activeTab, setActiveTab] = useState('appearance');
  const [systemFonts, setSystemFonts] = useState<string[]>([]);
  const [loadingFonts, setLoadingFonts] = useState(false);

  useEffect(() => {
    if (config) setDraft(config);
  }, [config]);

  useEffect(() => {
    let cancelled = false;
    setLoadingFonts(true);
    void (async () => {
      try {
        const fonts = await window.codev?.system?.listFonts?.();
        if (cancelled) return;
        setSystemFonts(uniqueStrings([...(fonts ?? []), 'Consolas']));
      } catch {
        if (cancelled) return;
        setSystemFonts(['Consolas']);
      } finally {
        if (!cancelled) setLoadingFonts(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const fontFamilyOptions = useMemo(() => {
    const current = draft?.terminal.fontFamily?.trim() ?? '';
    const base = systemFonts.length ? systemFonts : ['Consolas'];
    return uniqueStrings(current ? [current, ...base] : base).sort((a, b) => a.localeCompare(b));
  }, [draft?.terminal.fontFamily, systemFonts]);

  useEffect(() => {
    if (!draft) return;
    if (envToolId) return;
    const first = draft.tools[0]?.id;
    if (first) setEnvToolId(first);
  }, [draft, envToolId]);

  const canSave = useMemo(() => {
    return !!draft && !loading;
  }, [draft, loading]);

  const currentTab = useMemo(() => {
    return settingTabs.find((item) => item.id === activeTab) ?? settingTabs[0];
  }, [activeTab]);

  if (!draft) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="app-setting-preview min-w-[320px] text-sm text-muted-foreground">
          {error ? `加载失败：${error}` : '正在加载配置...'}
        </div>
      </div>
    );
  }

  return (
    <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_104px] gap-4 select-none">
      <section className="app-soft-panel flex min-h-0 flex-col rounded-[26px] p-4 select-none">
        <div className="border-b border-border/60 pb-4">
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Styles
          </div>
          <div className="mt-2 text-2xl font-semibold tracking-tight">{currentTab.label}设置</div>
          <div className="mt-1 text-sm text-muted-foreground">{currentTab.description}</div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto py-4 pr-1">
          <AnimatePresence mode="wait">
            {activeTab === 'appearance' ? (
              <motion.div
                key="appearance"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="space-y-4"
              >
                <div className="app-setting-row space-y-4">
                  <div>
                    <div className="text-lg font-semibold">主题模式</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      在浅色与暗色工作台之间切换，保持左侧导航的深色质感。
                    </div>
                  </div>
                  <div className="app-segmented">
                    {(['light', 'dark'] as const).map((theme) => (
                      <button
                        key={theme}
                        data-state={draft.ui.theme === theme ? 'active' : 'inactive'}
                        type="button"
                        className="app-segmented-item"
                        onClick={() =>
                          setDraft({
                            ...draft,
                            ui: { ...draft.ui, theme },
                          })
                        }
                      >
                        {theme === 'light' ? '浅色' : '暗色'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="app-setting-row space-y-3">
                  <div>
                    <div className="text-lg font-semibold">配色方案</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      为内置终端选择经典主题色盘与 ANSI 颜色映射。
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>终端配色方案</Label>
                    <Select
                      value={draft.terminal.colorScheme}
                      onValueChange={(colorScheme) =>
                        setDraft({
                          ...draft,
                          terminal: {
                            ...draft.terminal,
                            colorScheme: colorScheme as AppConfig['terminal']['colorScheme'],
                          },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择配色方案" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>配色方案</SelectLabel>
                          {terminalColorSchemeItems.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div className="grid gap-2">
                        <Label>终端字体</Label>
                        <Select
                          value={draft.terminal.fontFamily}
                          onValueChange={(fontFamily) =>
                            setDraft({
                              ...draft,
                              terminal: {
                                ...draft.terminal,
                                fontFamily,
                              },
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="选择字体" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectLabel>
                                {loadingFonts
                                  ? '正在获取系统字体...'
                                  : `系统字体（${fontFamilyOptions.length}）`}
                              </SelectLabel>
                              {fontFamilyOptions.map((fontFamily) => (
                                <SelectItem key={fontFamily} value={fontFamily}>
                                  {fontFamily}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <Label>终端字体大小</Label>
                        <Input
                          type="number"
                          min={10}
                          max={100}
                          value={draft.terminal.fontSize}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const n = Number(raw);
                            const fontSize = Number.isFinite(n) ? Math.min(100, Math.max(10, Math.round(n))) : 13;
                            setDraft({
                              ...draft,
                              terminal: {
                                ...draft.terminal,
                                fontSize,
                              },
                            });
                          }}
                        />
                      </div>
                    </div>

                    <div
                      className="mt-2 overflow-hidden rounded-2xl border border-border/60"
                      style={{
                        background: getTerminalTheme(draft.terminal.colorScheme).background,
                      }}
                    >
                      <div className="relative p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div
                            className="text-sm font-semibold tracking-tight"
                            style={{ color: getTerminalTheme(draft.terminal.colorScheme).green }}
                          >
                            {draft.terminal.colorScheme}
                          </div>
                          <div className="grid grid-cols-8 gap-1">
                            {getTerminalAnsiPalette(draft.terminal.colorScheme).map((c, idx) => (
                              <div
                                key={`${c}-${idx}`}
                                className="h-3 w-3 rounded-full border border-black/20"
                                style={{ background: c }}
                              />
                            ))}
                          </div>
                        </div>

                        <div
                          className="mt-4 rounded-2xl px-4 py-3 shadow-[0_18px_42px_-26px_rgba(0,0,0,0.55)]"
                          style={{
                            background: 'rgba(0,0,0,0.18)',
                            border: '1px solid rgba(255,255,255,0.10)',
                          }}
                        >
                          <div className="space-y-1 font-mono text-xs leading-5">
                            <div style={{ color: getTerminalTheme(draft.terminal.colorScheme).foreground }}>
                              <span style={{ color: getTerminalTheme(draft.terminal.colorScheme).yellow }}>
                                john@doe-pc
                              </span>
                              <span style={{ color: getTerminalTheme(draft.terminal.colorScheme).foreground }}>
                                :~$&nbsp;
                              </span>
                              <span style={{ color: getTerminalTheme(draft.terminal.colorScheme).cyan }}>
                                ls
                              </span>
                            </div>
                            <div style={{ color: getTerminalTheme(draft.terminal.colorScheme).foreground }}>
                              -rwxr-xr-x&nbsp;1&nbsp;root&nbsp;
                              <span style={{ color: getTerminalTheme(draft.terminal.colorScheme).yellow }}>
                                Documents
                              </span>
                            </div>
                            <div style={{ color: getTerminalTheme(draft.terminal.colorScheme).foreground }}>
                              -rwxr-xr-x&nbsp;1&nbsp;root&nbsp;
                              <span style={{ color: getTerminalTheme(draft.terminal.colorScheme).yellow }}>
                                Downloads
                              </span>
                            </div>
                            <div style={{ color: getTerminalTheme(draft.terminal.colorScheme).foreground }}>
                              -rwxr-xr-x&nbsp;1&nbsp;root&nbsp;
                              <span style={{ color: getTerminalTheme(draft.terminal.colorScheme).blue }}>
                                Music
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="app-setting-preview space-y-4">
                  <div className="text-sm font-medium">控件预览</div>
                  <div className="app-segmented">
                    <button data-state="active" type="button" className="app-segmented-item">
                      按钮
                    </button>
                    <button data-state="inactive" type="button" className="app-segmented-item">
                      输入框
                    </button>
                  </div>
                  <div className="space-y-3 rounded-2xl bg-card/70 p-4">
                    <Input placeholder="输入预览" />
                    <Input value="Error preview" readOnly className="border-destructive/45" />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">强调开关</span>
                      <Switch checked />
                    </div>
                    <Button className="w-full">保存并应用</Button>
                  </div>
                </div>
              </motion.div>
            ) : null}

            {activeTab === 'download' ? (
              <motion.div
                key="download"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="space-y-4"
              >
                <div className="app-setting-row space-y-3">
                  <div>
                    <div className="text-lg font-semibold">下载目录</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      留空时使用系统默认目录，也可以指定固定缓存路径。
                    </div>
                  </div>
                  <Input
                    value={draft.download.tempDir}
                    onChange={(e) => {
                      setDraft({
                        ...draft,
                        download: { ...draft.download, tempDir: e.target.value },
                      });
                    }}
                    placeholder="留空表示使用默认临时目录"
                  />
                </div>

                <div className="app-setting-row space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-lg font-semibold">同时下载任务数</div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        通过滑杆调节队列并发，兼顾速度与稳定性。
                      </div>
                    </div>
                    <div className="rounded-2xl bg-card px-4 py-2 text-lg font-semibold">
                      {draft.download.concurrency}
                    </div>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={draft.download.concurrency}
                    className="h-2 w-full cursor-pointer accent-[hsl(var(--primary))]"
                    onChange={(e) => {
                      setDraft({
                        ...draft,
                        download: {
                          ...draft.download,
                          concurrency: toNumber(e.target.value, 3),
                        },
                      });
                    }}
                  />
                </div>

                <div className="app-setting-row flex items-center justify-between gap-4">
                  <div>
                    <div className="text-lg font-semibold">下载完成提示</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      安装包下载完成后，立即在桌面端显示提醒。
                    </div>
                  </div>
                  <Switch
                    checked={draft.download.notifyOnComplete}
                    onCheckedChange={(checked) => {
                      setDraft({
                        ...draft,
                        download: { ...draft.download, notifyOnComplete: checked },
                      });
                    }}
                  />
                </div>
              </motion.div>
            ) : null}

            {activeTab === 'proxy' ? (
              <motion.div
                key="proxy"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="space-y-4"
              >
                <div className="app-setting-row space-y-4">
                  <div>
                    <div className="text-lg font-semibold">代理类型</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      选择当前网络连接方式，推荐只保留常用选项。
                    </div>
                  </div>
                  <div className="app-segmented">
                    {(['none', 'http', 'socks5'] as const).map((type) => (
                      <button
                        key={type}
                        data-state={draft.proxy.type === type ? 'active' : 'inactive'}
                        type="button"
                        className="app-segmented-item"
                        onClick={() =>
                          setDraft({
                            ...draft,
                            proxy: { ...draft.proxy, type: type as ProxyType },
                          })
                        }
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className="app-setting-row space-y-2">
                    <Label>地址</Label>
                    <Input
                      value={draft.proxy.host}
                      onChange={(e) => {
                        setDraft({
                          ...draft,
                          proxy: { ...draft.proxy, host: e.target.value },
                        });
                      }}
                      placeholder="127.0.0.1"
                    />
                  </div>
                  <div className="app-setting-row space-y-2">
                    <Label>端口</Label>
                    <Input
                      value={draft.proxy.port ? String(draft.proxy.port) : ''}
                      onChange={(e) => {
                        setDraft({
                          ...draft,
                          proxy: { ...draft.proxy, port: toNumber(e.target.value, 0) },
                        });
                      }}
                      inputMode="numeric"
                      placeholder="7890"
                    />
                  </div>
                  <div className="app-setting-row space-y-2">
                    <Label>用户名</Label>
                    <Input
                      value={draft.proxy.username}
                      onChange={(e) => {
                        setDraft({
                          ...draft,
                          proxy: { ...draft.proxy, username: e.target.value },
                        });
                      }}
                    />
                  </div>
                  <div className="app-setting-row space-y-2">
                    <Label>密码</Label>
                    <Input
                      value={draft.proxy.password}
                      onChange={(e) => {
                        setDraft({
                          ...draft,
                          proxy: { ...draft.proxy, password: e.target.value },
                        });
                      }}
                      type="password"
                    />
                  </div>
                </div>
              </motion.div>
            ) : null}

            {activeTab === 'env' ? (
              <motion.div
                key="env"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="grid grid-cols-1 gap-4 xl:grid-cols-2"
              >
                <div className="app-setting-row space-y-3">
                  <div>
                    <div className="text-lg font-semibold">全局环境变量</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      对所有工具统一生效，按 `KEY=VALUE` 逐行填写。
                    </div>
                  </div>
                  <Textarea
                    rows={12}
                    value={envMapToText(draft.env.global)}
                    onChange={(e) => {
                      setDraft({
                        ...draft,
                        env: { ...draft.env, global: textToEnvMap(e.target.value) },
                      });
                    }}
                    placeholder="HTTP_PROXY=http://127.0.0.1:7890"
                  />
                </div>

                <div className="app-setting-row space-y-3">
                  <div>
                    <div className="text-lg font-semibold">工具环境变量</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      为指定工具覆盖环境参数，适合代理、路径或实验配置。
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>选择工具</Label>
                    <Select value={envToolId} onValueChange={setEnvToolId}>
                      <SelectTrigger>
                        <SelectValue placeholder="选择工具" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>工具</SelectLabel>
                          {draft.tools.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>

                  <Textarea
                    rows={12}
                    value={envMapToText(draft.env.perTool[envToolId] ?? {})}
                    onChange={(e) => {
                      setDraft({
                        ...draft,
                        env: {
                          ...draft.env,
                          perTool: {
                            ...draft.env.perTool,
                            [envToolId]: textToEnvMap(e.target.value),
                          },
                        },
                      });
                    }}
                    placeholder="PATH=C:\\Tools\\bin;%PATH%"
                  />
                </div>
              </motion.div>
            ) : null}

            {activeTab === 'advanced' ? (
              <motion.div
                key="advanced"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="space-y-4"
              >
                <div className="app-setting-row flex items-center justify-between gap-4">
                  <div>
                    <div className="text-lg font-semibold">开机自启</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      启动系统后自动拉起 CodeV，适合常驻工具管理场景。
                    </div>
                  </div>
                  <Switch
                    checked={draft.advanced.autoStart}
                    onCheckedChange={(checked) => {
                      setDraft({
                        ...draft,
                        advanced: { ...draft.advanced, autoStart: checked },
                      });
                    }}
                  />
                </div>

                <div className="app-setting-row flex items-center justify-between gap-4">
                  <div>
                    <div className="text-lg font-semibold">关闭最小化到托盘</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      关闭窗口时保留后台进程，可继续通过托盘恢复。
                    </div>
                  </div>
                  <Switch
                    checked={draft.ui.closeToTray}
                    onCheckedChange={(checked) => {
                      setDraft({
                        ...draft,
                        ui: { ...draft.ui, closeToTray: checked },
                      });
                    }}
                  />
                </div>

                <div className="app-setting-row space-y-4">
                  <div>
                    <div className="text-lg font-semibold">日志级别</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      仅保留常见级别，通过段控件快速切换。
                    </div>
                  </div>
                  <div className="app-segmented">
                    {(['error', 'warn', 'info', 'debug'] as const).map((level) => (
                      <button
                        key={level}
                        data-state={draft.advanced.logLevel === level ? 'active' : 'inactive'}
                        type="button"
                        className="app-segmented-item min-w-[78px]"
                        onClick={() =>
                          setDraft({
                            ...draft,
                            advanced: {
                              ...draft.advanced,
                              logLevel: level as AppConfig['advanced']['logLevel'],
                            },
                          })
                        }
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                  <div>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        void window.codev?.app?.openLogDir?.();
                      }}
                    >
                      打开日志路径
                    </Button>
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-3 border-t border-border/60 pt-4">
          <Button
            disabled={!canSave}
            onClick={() => {
              void update(draft);
            }}
          >
            保存
          </Button>
          <Button
            variant="secondary"
            disabled={!config}
            onClick={() => {
              if (config) setDraft(config);
            }}
          >
            重置
          </Button>
          {error ? <div className="text-sm text-destructive">{error}</div> : null}
        </div>
      </section>

      <aside className="app-soft-panel min-h-0 rounded-[26px] p-3">
        <div className="flex h-full min-h-0 flex-col items-stretch gap-3 overflow-auto pr-1">
          {settingTabs.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === activeTab;
            return (
              <button
                key={item.id}
                type="button"
                className={cn(
                  'flex flex-col items-center gap-2 rounded-[22px] border px-3 py-4 text-center transition-[background-color,color,box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5',
                  isActive
                    ? 'border-border/70 bg-card text-foreground shadow-[0_18px_36px_-28px_rgb(36,27,20,0.45)]'
                    : 'border-transparent bg-transparent text-muted-foreground hover:bg-card/70 hover:text-foreground',
                )}
                onClick={() => setActiveTab(item.id)}
              >
                <Icon className="h-5 w-5" />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </aside>
    </div>
  );
}

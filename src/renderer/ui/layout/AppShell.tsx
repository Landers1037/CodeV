import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import {
  Download,
  Home,
  Plus,
  Settings,
  Info,
  Terminal as TerminalIcon,
  Minus,
  Square,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useConfigStore } from '@/renderer/state/configStore';
import { type AppUpdateResult } from '@/shared/appUpdateTypes';
import { type ToolMeta } from '@/shared/types';
import appLogo from '@/renderer/assets/logo.png';

const navItems = [
  { to: '/', label: '首页', icon: Home },
  { to: '/downloads', label: '下载', icon: Download },
  { to: '/terminal', label: '终端', icon: TerminalIcon },
  { to: '/settings', label: '设置', icon: Settings },
] as const;

/** 应用主框架布局。 */
export function AppShell() {
  const location = useLocation();
  const windowApi = window.codev?.window;
  const { config, update } = useConfigStore();
  const [openAdd, setOpenAdd] = useState(false);
  const [openAbout, setOpenAbout] = useState(false);
  const [appVersion, setAppVersion] = useState('');
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateMessage, setUpdateMessage] = useState('');
  const [toolName, setToolName] = useState('');
  const [toolCategory, setToolCategory] = useState('');
  const [exePath, setExePath] = useState('');
  const [logoPath, setLogoPath] = useState('');
  const [isGui, setIsGui] = useState(true);

  const canAdd = useMemo(() => {
    return !!toolName.trim() && !!toolCategory.trim() && !!exePath.trim();
  }, [exePath, toolCategory, toolName]);

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
    let mounted = true;

    void window.codev?.app?.getVersion().then((version) => {
      if (!mounted || !version) return;
      setAppVersion(version);
    });

    return () => {
      mounted = false;
    };
  }, []);

  const checkForUpdates = async () => {
    setCheckingUpdate(true);
    setUpdateMessage('正在检查更新...');
    try {
      const result: AppUpdateResult | undefined = await window.codev?.app?.checkForUpdates();
      if (!result) {
        setUpdateMessage('检查更新失败，请稍后重试。');
        return;
      }
      setUpdateMessage(result.message);
    } catch (error) {
      setUpdateMessage((error as Error).message || '检查更新失败，请稍后重试。');
    } finally {
      setCheckingUpdate(false);
    }
  };

  const pageMeta = useMemo(() => {
    if (location.pathname.startsWith('/downloads')) {
      return {
        title: '下载中心',
      };
    }
    if (location.pathname.startsWith('/terminal')) {
      return {
        title: '终端工作台',
      };
    }
    if (location.pathname.startsWith('/settings')) {
      return {
        title: '参数设置',
      };
    }
    return {
      title: '工具首页',
    };
  }, [location.pathname]);

  const pickExe = async () => {
    const p = await window.codev?.dialog?.openExe();
    if (p) setExePath(p);
  };

  const pickLogo = async () => {
    const p = await window.codev?.dialog?.importToolIcon();
    if (p) setLogoPath(p);
  };

  const addTool = async () => {
    if (!config) return;
    const id = toolName
      .trim()
      .toLowerCase()
      .replaceAll(' ', '-')
      .replaceAll(/[^a-z0-9-]/g, '');
    const tool: ToolMeta = {
      id: id || `custom-${Date.now()}`,
      name: toolName.trim(),
      description: '',
      logoPath: logoPath.trim(),
      category: toolCategory.trim(),
      source: { kind: 'scan', scanOnly: true },
      downloadUrl: '',
      installPath: exePath.trim(),
      detectedInstallPath: '',
      isGui,
      programName: toolName.trim(),
      binaryName: exePath.trim().split(/[/\\]/).pop() || '',
      args: [],
      env: {},
      proxy: { type: 'none', host: '', port: 0, username: '', password: '' },
    };
    const nextCategories = (() => {
      const v = tool.category.trim();
      if (!v) return config.categories;
      if (config.categories.includes(v)) return config.categories;
      return [...config.categories, v];
    })();
    await update({ tools: [...config.tools, tool], categories: nextCategories });
    setOpenAdd(false);
    setToolName('');
    setToolCategory('');
    setExePath('');
    setLogoPath('');
    setIsGui(true);
  };

  return (
    <TooltipProvider>
      <div className="app-shell-bg h-screen w-screen overflow-hidden text-foreground">
        <div className="flex h-full">
          <div className="flex items-center">
            <aside className="app-sidebar ml-2 flex h-[calc(100vh-16px)] w-[72px] shrink-0 flex-col items-center justify-between rounded-[10px] px-4 py-5">
            <div className="flex flex-col items-center gap-6">
              <div className="app-drag flex w-full justify-center pb-2">
                <div className="flex h-14 w-14 items-center justify-center rounded-[16px]">
                  <img src={appLogo} alt="CodeV" className="h-12 w-12 rounded-xl object-contain" />
                </div>
              </div>

              <nav className="flex flex-col items-center gap-3">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Tooltip key={item.to}>
                      <TooltipTrigger asChild>
                        <NavLink
                          to={item.to}
                          aria-label={item.label}
                          className={({ isActive }) =>
                            cn(
                              'app-no-drag inline-flex h-11 w-11 items-center justify-center rounded-2xl text-[hsl(var(--sidebar-muted))] transition-[transform,background-color,color,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:bg-white/8 hover:text-[hsl(var(--sidebar-foreground))]',
                              isActive &&
                                'bg-white/12 text-white shadow-[inset_0_1px_0_rgb(255,255,255,0.12),0_18px_32px_-24px_rgb(0,0,0,0.8)]',
                            )
                          }
                        >
                          <Icon className="h-[18px] w-[18px]" />
                        </NavLink>
                      </TooltipTrigger>
                      <TooltipContent side="right">{item.label}</TooltipContent>
                    </Tooltip>
                  );
                })}
              </nav>
            </div>

            <div className="flex flex-col items-center gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className="app-no-drag h-11 w-11 rounded-xl border-white/0  p-0 text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-btn-background))]/80"
                    size="icon"
                    variant="ghost"
                    onClick={() => setOpenAdd(true)}
                    aria-label="添加程序"
                  >
                    <Plus className="h-[18px] w-[18px]" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">添加程序</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className="app-no-drag h-11 w-11 rounded-xl border-white/0 p-0 text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-btn-background))]/80"
                    size="icon"
                    variant="ghost"
                    onClick={() => setOpenAbout(true)}
                    aria-label="关于 CodeV"
                  >
                    <Info className="h-[18px] w-[18px]" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">关于 CodeV</TooltipContent>
              </Tooltip>
            </div>
            </aside>
          </div>

          <div className="flex min-w-0 flex-1 flex-col pl-0">
            <div className="app-panel flex h-full min-h-0 flex-col">
              <header className="flex h-12 items-center justify-between border-none px-6">
                <div className="app-drag flex min-w-0 flex-1 items-center">
                  <div className="min-w-0">
                    <div className="text-lg font-semibold tracking-tight">{pageMeta.title}</div>
                  </div>
                </div>

                <div className="app-no-drag ml-4 flex items-center gap-1">
                  <Button
                    className="h-10 w-10 rounded-2xl"
                    size="icon"
                    variant="ghost"
                    onClick={() => windowApi?.minimize()}
                    aria-label="最小化"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Button
                    className="h-10 w-10 rounded-2xl"
                    size="icon"
                    variant="ghost"
                    onClick={() => windowApi?.toggleMaximize()}
                    aria-label="最大化"
                  >
                    <Square className="h-4 w-4" />
                  </Button>
                  <Button
                    className="h-10 w-10 rounded-2xl hover:bg-destructive hover:text-destructive-foreground"
                    size="icon"
                    variant="ghost"
                    onClick={() => windowApi?.close()}
                    aria-label="关闭"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </header>

              <main className="min-h-0 flex-1 overflow-hidden p-4 pt-3">
                <Outlet />
              </main>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={openAdd} onOpenChange={setOpenAdd}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>添加程序</DialogTitle>
            <DialogDescription>添加自定义工具（可执行文件路径）</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>名称</Label>
              <Input value={toolName} onChange={(e) => setToolName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>分类</Label>
              <div className="flex gap-2">
                <Input
                  className="flex-1"
                  value={toolCategory}
                  onChange={(e) => setToolCategory(e.target.value)}
                  placeholder="可输入或从右侧选择"
                />
                <Select
                  value={categories.includes(toolCategory) ? toolCategory : ''}
                  onValueChange={setToolCategory}
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
            <div className="space-y-2">
              <Label>可执行文件</Label>
              <div className="flex gap-2">
                <Input
                  value={exePath}
                  onChange={(e) => setExePath(e.target.value)}
                  placeholder="例如：C:\\Program Files\\xxx\\app.exe"
                />
                <Button variant="secondary" onClick={() => void pickExe()}>
                  选择
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Logo（可选）</Label>
              <div className="flex gap-2">
                <Input
                  value={logoPath}
                  onChange={(e) => setLogoPath(e.target.value)}
                  placeholder="选择图片路径"
                />
                <Button variant="secondary" onClick={() => void pickLogo()}>
                  选择
                </Button>
              </div>
            </div>
            <div className="app-setting-row flex items-center justify-between gap-4">
              <Label>GUI 程序</Label>
              <Switch checked={isGui} onCheckedChange={setIsGui} />
            </div>
          </div>

          <div className="mt-2 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpenAdd(false)}>
              取消
            </Button>
            <Button disabled={!canAdd} onClick={() => void addTool()}>
              添加
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={openAbout} onOpenChange={setOpenAbout}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>关于 CodeV</DialogTitle>
            <DialogDescription>一站式工具入口，旨在帮助 AI Coding 提效</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border/60 bg-muted/20 px-6 py-8 text-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-background/80 shadow-sm">
                <img src={appLogo} alt="CodeV" className="h-16 w-16 object-contain" />
              </div>
              <div className="space-y-1">
                <div className="text-xl font-semibold text-foreground">CodeV</div>
                <div className="text-sm text-muted-foreground">
                  当前版本 {appVersion ? `v${appVersion}` : '加载中...'}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="font-medium text-foreground">功能</div>
              <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                <li>统一管理常用工具：一键启动、编辑、检查安装</li>
                <li>下载管理：统一处理安装包下载与落盘</li>
                <li>内置终端：快速执行命令并支持复制/粘贴</li>
                <li>代理与环境：为工具配置代理与环境变量</li>
              </ul>
            </div>

            <div className="space-y-2">
              <div className="font-medium text-foreground">技术栈</div>
              <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                <li>Electron + Electron Forge</li>
                <li>Vite + React + TypeScript</li>
                <li>Tailwind CSS + Radix UI</li>
                <li>Zustand + xterm + framer-motion</li>
              </ul>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between gap-3">
            <div className="min-h-5 flex-1 pr-3 text-sm text-muted-foreground">{updateMessage}</div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => void checkForUpdates()}
                disabled={checkingUpdate}
              >
                {checkingUpdate ? '检查中...' : '检查更新'}
              </Button>
              <Button variant="secondary" onClick={() => setOpenAbout(false)}>
                关闭
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}

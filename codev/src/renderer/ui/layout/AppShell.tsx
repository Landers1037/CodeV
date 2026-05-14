import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useMemo, useState } from 'react';
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
import { type ToolMeta } from '@/shared/types';
import appLogo from '@/renderer/assets/logo.png';

const navItems = [
  { to: '/', label: '首页', icon: Home },
  { to: '/downloads', label: '下载', icon: Download },
  { to: '/terminal', label: '终端', icon: TerminalIcon },
  { to: '/settings', label: '设置', icon: Settings },
] as const;

export function AppShell() {
  const location = useLocation();
  const windowApi = window.codev?.window;
  const { config, update } = useConfigStore();
  const [openAdd, setOpenAdd] = useState(false);
  const [openAbout, setOpenAbout] = useState(false);
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
      <div className="h-screen w-screen bg-background text-foreground">
        <header className="flex h-12 items-center justify-between border-b border-border/60 px-3">
          <div className="flex items-center gap-2">
            <div className="app-drag flex items-center gap-2 pr-2">
              <img
                src={appLogo}
                alt="logo"
                className="h-10 w-10 rounded-md shadow-sm"
              />
              <div className="text-sm font-semibold tracking-wide">CodeV</div>
            </div>

            <nav className="flex items-center gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Tooltip key={item.to}>
                    <TooltipTrigger asChild>
                      <NavLink
                        to={item.to}
                        className={({ isActive }) =>
                          cn(
                            'app-no-drag inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-card/60 shadow-sm transition hover:bg-accent/60',
                            isActive && 'bg-accent',
                          )
                        }
                      >
                        <Icon className="h-4 w-4" />
                      </NavLink>
                    </TooltipTrigger>
                    <TooltipContent>
                      {item.label}
                      <span className="sr-only">{location.pathname}</span>
                    </TooltipContent>
                  </Tooltip>
                );
              })}

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className="app-no-drag h-9 w-9 rounded-full border border-border/60 bg-card/60 p-0 shadow-sm hover:bg-accent/60"
                    size="icon"
                    variant="ghost"
                    onClick={() => setOpenAbout(true)}
                    aria-label="关于"
                  >
                    <Info className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>关于</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className="app-no-drag h-9 w-9 rounded-full border border-border/60 bg-card/60 p-0 shadow-sm hover:bg-accent/60"
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setOpenAdd(true);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>添加</TooltipContent>
              </Tooltip>
            </nav>
          </div>

          <div className="flex items-center gap-1">
            <Button
              className="app-no-drag h-8 w-10 rounded-md"
              size="icon"
              variant="ghost"
              onClick={() => windowApi?.minimize()}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Button
              className="app-no-drag h-8 w-10 rounded-md"
              size="icon"
              variant="ghost"
              onClick={() => windowApi?.toggleMaximize()}
            >
              <Square className="h-4 w-4" />
            </Button>
            <Button
              className="app-no-drag h-8 w-10 rounded-md hover:bg-destructive hover:text-destructive-foreground"
              size="icon"
              variant="ghost"
              onClick={() => windowApi?.close()}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <main className="h-[calc(100vh-3rem)] overflow-hidden">
          <Outlet />
        </main>
      </div>

      <Dialog open={openAdd} onOpenChange={setOpenAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加程序</DialogTitle>
            <DialogDescription>添加自定义工具（可执行文件路径）</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
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
            <div className="flex items-center justify-between gap-4">
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>关于 CodeV</DialogTitle>
            <DialogDescription>一站式工具入口，旨在帮助 AI Coding 提效</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-sm">
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

          <div className="mt-2 flex justify-end">
            <Button variant="secondary" onClick={() => setOpenAbout(false)}>
              关闭
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}

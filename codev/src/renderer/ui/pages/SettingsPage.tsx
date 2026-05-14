import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { type AppConfig, type ProxyType } from '@/shared/types';

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

export function SettingsPage() {
  const { config, update, loading, error } = useConfigStore();
  const [draft, setDraft] = useState<AppConfig | null>(null);
  const [envToolId, setEnvToolId] = useState<string>('');
  const [activeTab, setActiveTab] = useState('appearance');

  useEffect(() => {
    if (config) setDraft(config);
  }, [config]);

  useEffect(() => {
    if (!draft) return;
    if (envToolId) return;
    const first = draft.tools[0]?.id;
    if (first) setEnvToolId(first);
  }, [draft, envToolId]);

  const canSave = useMemo(() => {
    return !!draft && !loading;
  }, [draft, loading]);

  if (!draft) {
    return (
      <div className="h-full overflow-auto p-6">
        <div className="text-sm text-muted-foreground">
          {error ? `加载失败：${error}` : '正在加载配置...'}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6">
      <div className="mb-4 text-lg font-semibold">设置</div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="appearance">外观设置</TabsTrigger>
          <TabsTrigger value="download">下载设置</TabsTrigger>
          <TabsTrigger value="proxy">代理设置</TabsTrigger>
          <TabsTrigger value="env">环境设置</TabsTrigger>
          <TabsTrigger value="advanced">高级设置</TabsTrigger>
        </TabsList>

        <AnimatePresence mode="wait">
          {activeTab === 'appearance' ? (
            <TabsContent key="appearance" value="appearance" forceMount asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>外观设置</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    <div className="flex items-center justify-between gap-4">
                      <Label>暗黑模式</Label>
                      <Switch
                        checked={draft.ui.theme === 'dark'}
                        onCheckedChange={(checked) => {
                          setDraft({
                            ...draft,
                            ui: { ...draft.ui, theme: checked ? 'dark' : 'light' },
                          });
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
          ) : null}

          {activeTab === 'download' ? (
            <TabsContent key="download" value="download" forceMount asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>下载设置</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                      <Label>下载临时目录</Label>
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
                    <div className="flex flex-col gap-2">
                      <Label>同时下载任务数</Label>
                      <Input
                        value={String(draft.download.concurrency)}
                        onChange={(e) => {
                          setDraft({
                            ...draft,
                            download: {
                              ...draft.download,
                              concurrency: toNumber(e.target.value, 3),
                            },
                          });
                        }}
                        inputMode="numeric"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <Label>下载完成提示</Label>
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
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
          ) : null}

          {activeTab === 'proxy' ? (
            <TabsContent key="proxy" value="proxy" forceMount asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>代理设置</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                      <Label>类型</Label>
                      <Input
                        value={draft.proxy.type}
                        onChange={(e) => {
                          setDraft({
                            ...draft,
                            proxy: { ...draft.proxy, type: e.target.value as ProxyType },
                          });
                        }}
                        placeholder="none / http / socks5"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-2">
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
                      <div className="flex flex-col gap-2">
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
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-2">
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
                      <div className="flex flex-col gap-2">
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
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
          ) : null}

          {activeTab === 'env' ? (
            <TabsContent key="env" value="env" forceMount asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>全局环境变量</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-2">
                      <Label>每行一个，格式：KEY=VALUE</Label>
                      <Textarea
                        rows={10}
                        value={envMapToText(draft.env.global)}
                        onChange={(e) => {
                          setDraft({
                            ...draft,
                            env: { ...draft.env, global: textToEnvMap(e.target.value) },
                          });
                        }}
                        placeholder="HTTP_PROXY=http://127.0.0.1:7890"
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>工具环境变量</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3">
                      <div className="flex flex-col gap-2">
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

                      <div className="flex flex-col gap-2">
                        <Label>每行一个，格式：KEY=VALUE</Label>
                        <Textarea
                          rows={10}
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
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            </TabsContent>
          ) : null}

          {activeTab === 'advanced' ? (
            <TabsContent key="advanced" value="advanced" forceMount asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>高级设置</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    <div className="flex items-center justify-between gap-4">
                      <Label>开机自启</Label>
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
                    <div className="flex items-center justify-between gap-4">
                      <Label>关闭最小化到托盘</Label>
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
                    <div className="flex flex-col gap-2">
                      <Label>日志级别</Label>
                      <Input
                        value={draft.advanced.logLevel}
                        onChange={(e) => {
                          setDraft({
                            ...draft,
                            advanced: {
                              ...draft.advanced,
                              logLevel: e.target.value as AppConfig['advanced']['logLevel'],
                            },
                          });
                        }}
                        placeholder="error / warn / info / debug"
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
          ) : null}
        </AnimatePresence>
      </Tabs>

      <div className="mt-6 flex items-center gap-3">
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
    </div>
  );
}

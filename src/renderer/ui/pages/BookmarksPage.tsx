import { useEffect, useMemo, useState } from 'react';
import { Bookmark as BookmarkIcon, ExternalLink, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useConfigStore } from '@/renderer/state/configStore';

function fileUrl(filePath: string) {
  const p = String(filePath || '').trim();
  if (!p) return '';
  const normalized = p.replaceAll('\\', '/');
  return `file:///${encodeURI(normalized)}`;
}

function loadIcon(filePath: string) {
  const p = String(filePath || '').trim();
  if (!p) return '';
  const normalized = p.replaceAll('\\', '/');
  return window.codev?.bookmarks?.loadIcon(normalized);
}

function hostFirstLetter(url: string) {
  try {
    const host = new URL(url).hostname || '';
    return (host[0] || '?').toUpperCase();
  } catch {
    return '?';
  }
}

function host(url: string) {
  try {
    return new URL(url).hostname || url;
  } catch {
    return url;
  }
}

export function BookmarksPage() {
  const { config } = useConfigStore();
  const bookmarkApi = window.codev?.bookmarks;
  const notifyApi = window.codev?.notify;

  const bookmarks = useMemo(() => config?.bookmarks ?? [], [config?.bookmarks]);
  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [addUrl, setAddUrl] = useState('');
  const [editId, setEditId] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [adding, setAdding] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const submitAdd = async () => {
    const url = addUrl.trim();
    if (!url) return;
    if (adding) return;
    setAdding(true);
    try {
      await bookmarkApi?.add(url);
      setOpenAdd(false);
      setAddUrl('');
    } finally {
      setAdding(false);
    }
  };

  const remove = async (id: string) => {
    await bookmarkApi?.remove(id);
  };

  const open = async (url: string) => {
    await bookmarkApi?.open(url);
  };

  const resetEdit = () => {
    setEditId('');
    setEditUrl('');
    setEditTitle('');
    setSavingEdit(false);
  };

  const startEdit = (id: string, title: string, url: string) => {
    setEditId(id);
    setEditUrl(url || '');
    setEditTitle(title || '');
    setOpenEdit(true);
  };

  const submitEdit = async () => {
    if (!editId) return;
    const url = editUrl.trim();
    if (!url || savingEdit) return;
    setSavingEdit(true);
    try {
      await bookmarkApi?.update(editId, { url, title: editTitle });
      setOpenEdit(false);
      resetEdit();
    } catch (error) {
      const message = error instanceof Error ? error.message : '书签保存失败';
      setToastMessage(message || '书签保存失败');
      setSavingEdit(false);
    }
  };

  useEffect(() => {
    const off = notifyApi?.onToast((payload) => {
      if (!payload?.message) return;
      setToastMessage(payload.message);
    });
    return () => off?.();
  }, [notifyApi]);

  useEffect(() => {
    if (!toastMessage) return;
    const t = window.setTimeout(() => setToastMessage(''), 3500);
    return () => window.clearTimeout(t);
  }, [toastMessage]);

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden select-none">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <BookmarkIcon className="h-4 w-4" />
          <span>共 {bookmarks.length} 条书签</span>
        </div>
        <Button onClick={() => setOpenAdd(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          添加书签
        </Button>
      </div>

      <Card className="min-h-0 flex-1 overflow-hidden">
        <CardHeader>
          <CardTitle>书签</CardTitle>
        </CardHeader>
        <CardContent className="min-h-0 overflow-auto">
          {bookmarks.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              暂无书签，点击右上角添加
            </div>
          ) : (
            <div className="divide-y divide-border/50 rounded-xl border border-border/60">
              {bookmarks.map((b) => {
                const icon = loadIcon(b.iconPath);
                const displayTitle = (b.title || '').trim();
                return (
                  <div key={b.id} className="flex items-center gap-3 px-4 py-3">
                    <div
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-white/5 text-sm font-semibold',
                      )}
                    >
                      {icon ? (
                        <img src={icon} className="h-full w-full object-contain" />
                      ) : (
                        <span>{hostFirstLetter(b.url)}</span>
                      )}
                    </div>

                    <button
                      className="min-w-0 flex-1 text-left"
                      onClick={() => void open(b.url)}
                    >
                      <div className="truncate text-sm font-medium">
                        {displayTitle || b.url}
                      </div>
                      <div className="mt-1 flex items-center gap-2 truncate text-xs text-muted-foreground">
                        <span className="truncate">{b.url}</span>
                        <span className="shrink-0">({host(b.url)})</span>
                      </div>
                    </button>

                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 rounded-xl"
                        onClick={() => void open(b.url)}
                        aria-label="打开"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 rounded-xl"
                        onClick={() => startEdit(b.id, b.title, b.url)}
                        aria-label="编辑书签"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 rounded-xl"
                        onClick={() => void remove(b.id)}
                        aria-label="删除"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={openAdd} onOpenChange={setOpenAdd}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>添加书签</DialogTitle>
            <DialogDescription>输入网页 URL，自动抓取标题与 favicon</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>URL</Label>
              <Input value={addUrl} onChange={(e) => setAddUrl(e.target.value)} placeholder="https://example.com" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setOpenAdd(false)} disabled={adding}>
                取消
              </Button>
              <Button onClick={() => void submitAdd()} disabled={!addUrl.trim() || adding} className="gap-2">
                {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {adding ? '添加中...' : '添加'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={openEdit}
        onOpenChange={(nextOpen) => {
          setOpenEdit(nextOpen);
          if (!nextOpen) resetEdit();
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>编辑书签</DialogTitle>
            <DialogDescription>支持修改 URL 和自定义 Title</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>URL</Label>
              <Input value={editUrl} onChange={(e) => setEditUrl(e.target.value)} placeholder="https://example.com" />
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="自定义标题，留空则展示 URL" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setOpenEdit(false)} disabled={savingEdit}>
                取消
              </Button>
              <Button onClick={() => void submitEdit()} disabled={!editUrl.trim() || savingEdit} className="gap-2">
                {savingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {savingEdit ? '保存中...' : '保存'}
              </Button>
            </div>
          </div>
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
              书签提醒
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

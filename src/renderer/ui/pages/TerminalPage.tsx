import { useEffect, useMemo, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebglAddon } from 'xterm-addon-webgl';
import { Plus, X } from 'lucide-react';
import 'xterm/css/xterm.css';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useConfigStore } from '@/renderer/state/configStore';
import { type TerminalColorScheme } from '@/shared/types';
import { getTerminalTheme } from '@/renderer/terminalThemes';

type Session = { id: string; title: string };
type ContextMenuState = { sessionId: string; x: number; y: number } | null;

const XTERM_FONT_FALLBACK =
  'Consolas, ui-monospace, SFMono-Regular, Menlo, Monaco, monospace';

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function normalizePrimaryFontFamily(value: unknown): string {
  if (typeof value !== 'string') return 'Consolas';
  const trimmed = value.trim().replaceAll('"', '').replaceAll("'", '');
  return trimmed || 'Consolas';
}

function buildXtermFontFamily(primary: unknown): string {
  const p = normalizePrimaryFontFamily(primary);
  const escaped = p.replaceAll('\\', '\\\\').replaceAll('"', '\\"');
  return `"${escaped}", ${XTERM_FONT_FALLBACK}`;
}

/** 终端页面。 */
export function TerminalPage() {
  const { config } = useConfigStore();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const initialized = useRef(false);
  const containers = useRef(new Map<string, HTMLDivElement>());
  const terminals = useRef(
    new Map<
      string,
      {
        term: Terminal;
        fit: FitAddon;
      }
    >(),
  );

  const enableGpu = !!config?.terminal.gpu;
  const rendererType = config?.terminal.renderer === 'html' ? 'dom' : 'canvas';
  const colorScheme = (config?.terminal.colorScheme ?? 'TokyoNight') as TerminalColorScheme;
  const xtermTheme = useMemo(() => getTerminalTheme(colorScheme), [colorScheme]);
  const xtermFontFamily = useMemo(() => buildXtermFontFamily(config?.terminal.fontFamily), [config?.terminal.fontFamily]);
  const xtermFontSize = useMemo(() => clampInt(config?.terminal.fontSize, 10, 100, 13), [config?.terminal.fontSize]);

  useEffect(() => {
    if (!window.codev?.terminal) return;
    const offData = window.codev.terminal.onData(({ id, data }) => {
      const t = terminals.current.get(id);
      t?.term.write(data);
    });
    const offExit = window.codev.terminal.onExit(({ id }) => {
      terminals.current.get(id)?.term.dispose();
      terminals.current.delete(id);
      containers.current.delete(id);
      setContextMenu((prev) => (prev?.sessionId === id ? null : prev));
      setSessions((prev) => {
        const next = prev.filter((s) => s.id !== id);
        setActiveId((cur) => {
          if (cur !== id) return cur;
          return next[0]?.id ?? '';
        });
        return next;
      });
    });

    return () => {
      offData?.();
      offExit?.();
    };
  }, []);

  useEffect(() => {
    const hideMenu = () => setContextMenu(null);
    window.addEventListener('click', hideMenu);
    window.addEventListener('blur', hideMenu);
    return () => {
      window.removeEventListener('click', hideMenu);
      window.removeEventListener('blur', hideMenu);
    };
  }, []);

  useEffect(() => {
    if (!window.codev?.terminal || initialized.current) return;
    initialized.current = true;

    void (async () => {
      const toolId = localStorage.getItem('__codev_terminal_tool__') || '';
      if (toolId) localStorage.removeItem('__codev_terminal_tool__');

      const toolName = config?.tools.find((tool) => tool.id === toolId)?.name || toolId;
      const id = toolId
        ? await window.codev?.terminal?.createTool(toolId)
        : await window.codev?.terminal?.create();
      if (!id) return;
      setSessions([{ id, title: toolName || 'PowerShell' }]);
      setActiveId(id);
    })();
  }, [config]);

  useEffect(() => {
    const sessionId = activeId;
    if (!sessionId) return;
    const container = containers.current.get(sessionId);
    if (!container) return;
    if (terminals.current.has(sessionId)) {
      const entry = terminals.current.get(sessionId);
      if (!entry) return;
      entry.term.options.theme = xtermTheme;
      entry.term.options.fontFamily = xtermFontFamily;
      entry.term.options.fontSize = xtermFontSize;
      try {
        entry.fit.fit();
        const dims = entry.fit.proposeDimensions();
        if (dims?.cols && dims?.rows) {
          void window.codev?.terminal?.resize(sessionId, dims.cols, dims.rows);
        }
      } catch {
        // ignore
      }
      entry.term.focus();
      return;
    }

    const fit = new FitAddon();
    const term = new Terminal({
      convertEol: true,
      cursorBlink: true,
      fontFamily: xtermFontFamily,
      fontSize: xtermFontSize,
      rendererType,
      theme: xtermTheme,
    });
    term.loadAddon(fit);
    term.open(container);

    if (enableGpu && rendererType === 'canvas') {
      try {
        term.loadAddon(new WebglAddon());
      } catch {
        // ignore
      }
    }

    term.onData((data) => {
      void window.codev?.terminal?.write(sessionId, data);
    });

    terminals.current.set(sessionId, { term, fit });

    const syncSize = () => {
      const entry = terminals.current.get(sessionId);
      if (!entry) return;
      try {
        entry.fit.fit();
        const dims = entry.fit.proposeDimensions();
        if (dims?.cols && dims?.rows) {
          void window.codev?.terminal?.resize(sessionId, dims.cols, dims.rows);
        }
      } catch {
        // ignore
      }
    };

    syncSize();
    term.focus();

    const ro = new ResizeObserver(() => syncSize());
    ro.observe(container);

    return () => ro.disconnect();
  }, [activeId, enableGpu, rendererType, xtermFontFamily, xtermFontSize, xtermTheme]);

  useEffect(() => {
    for (const entry of terminals.current.values()) {
      entry.term.options.theme = xtermTheme;
    }
  }, [xtermTheme]);

  useEffect(() => {
    for (const entry of terminals.current.values()) {
      entry.term.options.fontFamily = xtermFontFamily;
      entry.term.options.fontSize = xtermFontSize;
      try {
        entry.fit.fit();
      } catch {
        // ignore
      }
    }
  }, [xtermFontFamily, xtermFontSize]);

  const createSession = async () => {
    const id = await window.codev?.terminal?.create();
    if (!id) return;
    setSessions((prev) => [...prev, { id, title: `终端 ${prev.length + 1}` }]);
    setActiveId(id);
  };

  const closeSession = async (id: string) => {
    setContextMenu((prev) => (prev?.sessionId === id ? null : prev));
    await window.codev?.terminal?.close(id);
  };

  const copySelection = async (sessionId: string) => {
    const selection = terminals.current.get(sessionId)?.term.getSelection() ?? '';
    if (!selection) return;
    window.codev?.clipboard?.writeText(selection);
    setContextMenu(null);
  };

  const pasteClipboard = async (sessionId: string) => {
    const text = window.codev?.clipboard?.readText() ?? '';
    if (!text) return;
    await window.codev?.terminal?.write(sessionId, text);
    terminals.current.get(sessionId)?.term.focus();
    setContextMenu(null);
  };

  const canCopy = !!(
    contextMenu && terminals.current.get(contextMenu.sessionId)?.term.getSelection()
  );

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden p-2">
      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CardTitle>会话</CardTitle>
            <Button
              size="icon"
              variant="secondary"
              onClick={() => void createSession()}
              aria-label="新建终端"
              title="新建终端"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {sessions.map((s) => (
              <button
                key={s.id}
                className={cn(
                  'app-no-drag inline-flex items-center gap-2 rounded-full border border-border/60 px-3 py-1 text-xs transition',
                  s.id === activeId
                    ? 'bg-accent text-foreground'
                    : 'bg-background/40 text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                )}
                onClick={() => setActiveId(s.id)}
                type="button"
              >
                <span>{s.title}</span>
                <span
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-black/10 dark:hover:bg-white/10"
                  onClick={(event) => {
                    event.stopPropagation();
                    void closeSession(s.id);
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return;
                    event.preventDefault();
                    event.stopPropagation();
                    void closeSession(s.id);
                  }}
                >
                  <X className="h-3 w-3" />
                </span>
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="relative min-h-0 flex-1 p-0">
          <div className="h-full w-full">
            {sessions.map((s) => (
              <div
                key={s.id}
                className={cn('h-full w-full', s.id === activeId ? 'block' : 'hidden')}
              >
                <div
                  className="h-full w-full px-2.5 py-2"
                  style={{ background: xtermTheme.background }}
                >
                  <div
                    className="h-full w-full"
                    ref={(el) => {
                      if (el) containers.current.set(s.id, el);
                    }}
                    onClick={() => {
                      setActiveId(s.id);
                      terminals.current.get(s.id)?.term.focus();
                    }}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      setActiveId(s.id);
                      setContextMenu({
                        sessionId: s.id,
                        x: event.clientX,
                        y: event.clientY,
                      });
                    }}
                  />
                </div>
              </div>
            ))}
            {!sessions.length ? (
              <div className="p-4 text-sm text-muted-foreground">
                暂无终端会话，点击右上角创建。
              </div>
            ) : null}
          </div>

          {contextMenu ? (
            <div
              className="fixed z-50 min-w-32 rounded-xl border border-border/60 bg-popover p-1 shadow-lg backdrop-blur"
              style={{ left: contextMenu.x, top: contextMenu.y }}
            >
              <button
                className={cn(
                  'flex w-full items-center rounded-lg px-3 py-2 text-left text-sm transition',
                  canCopy
                    ? 'text-foreground hover:bg-accent'
                    : 'cursor-not-allowed text-muted-foreground',
                )}
                disabled={!canCopy}
                onClick={() => void copySelection(contextMenu.sessionId)}
                type="button"
              >
                复制
              </button>
              <button
                className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm transition hover:bg-accent"
                onClick={() => void pasteClipboard(contextMenu.sessionId)}
                type="button"
              >
                粘贴
              </button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileDiff, GitBranch, ListTree } from 'lucide-react';
import { Gitgraph, MergeStyle, Mode, Orientation, TemplateName, templateExtend } from '@gitgraph/react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { type RepoCommit, type RepoCommitDiff } from '@/shared/types';

function firstLine(message: string) {
  const m = (message || '').trim();
  const idx = m.indexOf('\n');
  return idx >= 0 ? m.slice(0, idx) : m;
}

function formatDate(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '';
  return d.toLocaleString();
}

function truncateText(value: string, max: number) {
  const text = (value || '').trim();
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1))}...`;
}

const GRAPH_MAIN_COLOR = '#58d5ff';
const GRAPH_MERGE_COLOR = '#ff7ad9';
const GRAPH_BRANCH_COLORS = ['#7c3aed', '#22c55e', '#f59e0b', '#38bdf8', '#ef4444', '#14b8a6'];

const GRAPH_TEMPLATE = templateExtend(TemplateName.Metro, {
  colors: [GRAPH_MAIN_COLOR, ...GRAPH_BRANCH_COLORS, GRAPH_MERGE_COLOR],
  branch: {
    lineWidth: 3,
    spacing: 16,
    mergeStyle: MergeStyle.Straight,
    label: {
      display: false,
    },
  },
  commit: {
    spacing: 16,
    dot: {
      size: 7,
      strokeWidth: 2,
      strokeColor: '#020617',
    },
    message: {
      display: true,
      displayHash: false,
      displayAuthor: false,
      font: '500 12px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace',
      color: '#cbd5e1',
    },
  },
});

function renderGraphDot(accent: string, size: number, strokeWidth: number, strokeColor: string) {
  return (
    <g style={{ cursor: 'pointer' }}>
      <circle
        cx={size}
        cy={size}
        r={size}
        fill={accent}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />
    </g>
  );
}

function renderGraphMessage(hash: string, message: string, accent: string, onSelect: () => void) {
  return (
    <foreignObject x={0} y={-4} width={640} height={34}>
      <div
        xmlns="http://www.w3.org/1999/xhtml"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          minHeight: '24px',
          fontFamily:
            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace',
          whiteSpace: 'nowrap',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '2px 8px',
            borderRadius: '999px',
            border: `1px solid ${accent}`,
            background: `${accent}1f`,
            color: accent,
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.04em',
            lineHeight: '16px',
            cursor: 'pointer',
          }}
          onClick={onSelect}
          title="查看该提交变更"
        >
          {hash.slice(0, 7)}
        </span>
        <span
          style={{
            color: '#dbe7f5',
            fontSize: '12px',
            lineHeight: '18px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {truncateText(firstLine(message) || '(no message)', 80)}
        </span>
      </div>
    </foreignObject>
  );
}

export function RepoDetailPage() {
  const { repoId } = useParams<{ repoId: string }>();
  const navigate = useNavigate();
  const repoApi = window.codev?.repos;

  const [loading, setLoading] = useState(false);
  const [commits, setCommits] = useState<RepoCommit[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [diff, setDiff] = useState<RepoCommitDiff | null>(null);
  const [loadingDiff, setLoadingDiff] = useState(false);
  const [commitView, setCommitView] = useState<'list' | 'graph'>('list');
  const [repoBranch, setRepoBranch] = useState<string>('HEAD');

  const loadCommits = async () => {
    if (!repoApi || !repoId) return;
    setLoading(true);
    try {
      const list = await repoApi.listCommits(repoId, 200);
      setCommits(list);
      if (list[0]?.oid) setSelected(list[0].oid);
    } finally {
      setLoading(false);
    }
  };

  const loadRepoBranch = async () => {
    if (!repoApi || !repoId) return;
    try {
      const summaries = await repoApi.listSummaries();
      const current = summaries.find((s) => s.id === repoId);
      setRepoBranch(current?.branch || 'HEAD');
    } catch {
      setRepoBranch('HEAD');
    }
  };

  const loadDiff = async (oid: string) => {
    if (!repoApi || !repoId || !oid) return;
    setLoadingDiff(true);
    try {
      const d = await repoApi.getCommitDiff(repoId, oid);
      setDiff(d);
    } finally {
      setLoadingDiff(false);
    }
  };

  useEffect(() => {
    void loadCommits();
    void loadRepoBranch();
  }, [repoId]);

  useEffect(() => {
    if (!selected) return;
    void loadDiff(selected);
  }, [selected]);

  const graphWindow = useMemo(() => commits.slice(0, 200), [commits]);
  const graphCommitMap = useMemo(() => new Map(graphWindow.map((c) => [c.oid, c])), [graphWindow]);
  const mainline = useMemo(() => {
    const head = graphWindow[0]?.oid ?? '';
    if (!head) return [] as RepoCommit[];
    const oids: string[] = [];
    const visited = new Set<string>();
    let cur = head;
    while (cur && !visited.has(cur)) {
      const c = graphCommitMap.get(cur);
      if (!c) break;
      visited.add(cur);
      oids.push(cur);
      cur = c.parents[0] ?? '';
    }
    oids.reverse();
    return oids.map((oid) => graphCommitMap.get(oid)).filter(Boolean) as RepoCommit[];
  }, [graphCommitMap, graphWindow]);
  const mainlineSet = useMemo(() => new Set(mainline.map((c) => c.oid)), [mainline]);
  const selectedCommit = useMemo(() => commits.find((c) => c.oid === selected) ?? null, [commits, selected]);
  const graphKey = useMemo(
    () => `${repoId ?? ''}:${graphWindow[0]?.oid ?? ''}:${graphWindow.length}:${repoBranch}`,
    [repoBranch, repoId, graphWindow],
  );

  return (
    <div className="grid h-full grid-cols-1 gap-4 overflow-hidden lg:grid-cols-2 select-none">
      <div className="flex min-h-0 flex-col gap-4 overflow-hidden">
        <div className="flex items-center gap-2">
          <Button variant="secondary" className="gap-2" onClick={() => navigate('/repos')}>
            <ArrowLeft className="h-4 w-4" />
            返回
          </Button>
          <div className="text-sm text-muted-foreground">
            {loading ? '加载提交记录...' : `共 ${commits.length} 条提交`}
          </div>
        </div>

        <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle>提交记录</CardTitle>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant={commitView === 'list' ? 'secondary' : 'ghost'}
                onClick={() => setCommitView('list')}
              >
                <ListTree className="h-4 w-4" />
                列表
              </Button>
              <Button
                size="sm"
                variant={commitView === 'graph' ? 'secondary' : 'ghost'}
                className="gap-2"
                onClick={() => setCommitView('graph')}
              >
                <GitBranch className="h-4 w-4" />
                图视图
              </Button>
            </div>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 overflow-hidden px-2">
            {commitView === 'graph' ? (
              <div className="flex h-full flex-col overflow-hidden border border-[#1f2f3f]/50  bg-[#20212c]/100">
                {!graphWindow.length ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">暂无提交</div>
                ) : (
                  <>
                    <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-white/8 bg-slate-950/75 px-4 py-3 backdrop-blur">
                      <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-[11px] font-medium tracking-[0.12em] text-cyan-200 uppercase">
                        <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.95)]" />
                        {repoBranch || 'HEAD'}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-[#58d5ff]" />
                          主线
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-[#7c3aed]" />
                          分支
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-[#ff7ad9]" />
                          Merge
                        </span>
                      </div>
                    </div>

                    <div className="min-h-0 flex-1 overflow-auto px-0 py-4">
                      <Gitgraph
                        key={graphKey}
                        options={{
                          mode: Mode.Extended,
                          orientation: Orientation.VerticalReverse,
                          template: GRAPH_TEMPLATE,
                        }}
                      >
                        {(gitgraph) => {
                          gitgraph.clear();
                          const shown = new Set<string>();
                          const mainBranch = gitgraph.branch({
                            name: repoBranch || 'HEAD',
                            style: {
                              color: GRAPH_MAIN_COLOR,
                            },
                          });
                          let sideBranchIndex = 0;

                          const createCommitOptions = (
                            commit: RepoCommit,
                            accent: string,
                            kind: 'main' | 'side' | 'merge',
                          ) => ({
                            hash: commit.oid,
                            subject: firstLine(commit.message) || '(no message)',
                            renderDot: () =>
                              renderGraphDot(
                                accent,
                                kind === 'merge' ? 8 : 7,
                                kind === 'merge' ? 3 : 2,
                                kind === 'merge' ? '#ffd5f5' : '#020617',
                              ),
                            renderMessage: () =>
                              renderGraphMessage(commit.oid, commit.message, accent, () =>
                                setSelected(commit.oid),
                              ),
                            style: {
                              dot: {
                                color: accent,
                                size: kind === 'merge' ? 8 : 7,
                                strokeWidth: kind === 'merge' ? 3 : 2,
                                strokeColor: kind === 'merge' ? '#ffd5f5' : '#020617',
                              },
                              message: {
                                display: true,
                                displayHash: false,
                                displayAuthor: false,
                              },
                            },
                            onClick: () => setSelected(commit.oid),
                            onMessageClick: () => setSelected(commit.oid),
                          });

                          const buildSideChain = (tipOid: string) => {
                            const chain: string[] = [];
                            let cur = tipOid;
                            const visited = new Set<string>();
                            while (cur && !visited.has(cur) && !mainlineSet.has(cur)) {
                              visited.add(cur);
                              const c = graphCommitMap.get(cur);
                              if (!c) break;
                              chain.push(cur);
                              cur = c.parents[0] ?? '';
                            }

                            const baseOid = cur && mainlineSet.has(cur) ? cur : '';
                            chain.reverse();
                            return baseOid ? { baseOid, chain } : null;
                          };

                          for (const c of mainline) {
                            if (shown.has(c.oid)) continue;

                            if (c.parents.length > 1) {
                              const mergeFrom = c.parents[1] ?? '';
                              const side = mergeFrom ? buildSideChain(mergeFrom) : null;
                              if (side && shown.has(side.baseOid)) {
                                const tone = GRAPH_BRANCH_COLORS[sideBranchIndex % GRAPH_BRANCH_COLORS.length];
                                sideBranchIndex += 1;
                                const branchName = `b-${mergeFrom.slice(0, 7)}`;
                                const sideBranch = gitgraph.branch({
                                  name: branchName,
                                  from: side.baseOid,
                                  style: {
                                    color: tone,
                                  },
                                });
                                for (const oid of side.chain) {
                                  const sc = graphCommitMap.get(oid);
                                  if (!sc || shown.has(oid)) continue;
                                  sideBranch.commit(createCommitOptions(sc, tone, 'side'));
                                  shown.add(oid);
                                }

                                mainBranch.merge({
                                  branch: sideBranch,
                                  commitOptions: createCommitOptions(c, GRAPH_MERGE_COLOR, 'merge'),
                                });
                                shown.add(c.oid);
                                continue;
                              }
                            }

                            mainBranch.commit(createCommitOptions(c, GRAPH_MAIN_COLOR, 'main'));
                            shown.add(c.oid);
                          }
                        }}
                      </Gitgraph>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="h-full overflow-auto rounded-xl border border-border/60">
                <div className="divide-y divide-border/50">
                  {commits.map((c) => (
                    <button
                      key={c.oid}
                      className={cn(
                        'w-full px-4 py-3 text-left transition hover:bg-white/5',
                        selected === c.oid && 'bg-white/8',
                      )}
                      onClick={() => setSelected(c.oid)}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{firstLine(c.message) || '(no message)'}</div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <span>{c.oid.slice(0, 8)}</span>
                            <span>{c.authorName}</span>
                            <span>{formatDate(c.date)}</span>
                          </div>
                        </div>
                        <div className="shrink-0 text-xs text-muted-foreground">
                          {c.parents.length > 1 ? `merge(${c.parents.length})` : ''}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex min-h-0 flex-col gap-4 overflow-hidden">
        <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileDiff className="h-4 w-4" />
              {selectedCommit ? `${selectedCommit.oid.slice(0, 8)} 变更` : '变更详情'}
            </CardTitle>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 overflow-auto">
            {loadingDiff ? (
              <div className="text-sm text-muted-foreground">加载 diff...</div>
            ) : !diff ? (
              <div className="text-sm text-muted-foreground">请选择一次提交</div>
            ) : diff.files.length === 0 ? (
              <div className="text-sm text-muted-foreground">无文件变更</div>
            ) : (
              <div className="space-y-4">
                {diff.files.map((f) => (
                  <div key={f.path} className="rounded-xl border border-border/60">
                    <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-2">
                      <div className="min-w-0 truncate text-sm font-medium">{f.path}</div>
                      <div className="shrink-0 text-xs text-muted-foreground">{f.status}</div>
                    </div>
                    <div className="p-3">
                      {f.isBinary ? (
                        <div className="text-sm text-muted-foreground">二进制文件，暂不展示 diff</div>
                      ) : (
                        <pre className="whitespace-pre-wrap break-words text-xs leading-5">{f.patch}</pre>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

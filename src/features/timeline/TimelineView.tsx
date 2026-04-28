import { useMemo, useState } from 'react';

import { Icon } from '../../common/components/Atoms';
import { CompareModal } from '../../common/components/CompareModal';
import { ResizablePanels } from '../../common/components/ResizablePanels';
import { formatJson } from '../../common/utils/stateUtils';
import type { StoreDescriptor, TimelineEvent, TimelineKind } from '../zustand-panel/types';

type FilterState = { store: string; kinds: Set<TimelineKind> };

export function TimelineView({
  events,
  stores,
  activeId,
  setActive,
  activeStore,
  onClear,
  onSnapshot,
  onRestoreBefore,
  filtersOpen,
  setFiltersOpen,
  diffOpen,
  setDiffOpen,
}: {
  events: TimelineEvent[];
  stores: StoreDescriptor[];
  activeId: string | null;
  setActive: (id: string) => void;
  activeStore: StoreDescriptor | undefined;
  onClear: () => void;
  onSnapshot: () => void;
  onRestoreBefore: (event: TimelineEvent) => void;
  filtersOpen: boolean;
  setFiltersOpen: (open: boolean) => void;
  diffOpen: boolean;
  setDiffOpen: (open: boolean) => void;
}) {
  const [filters, setFilters] = useState<FilterState>(() => ({ store: '*', kinds: new Set(['edit', 'action', 'replace', 'reset']) }));
  const [compareOpen, setCompareOpen] = useState(false);
  const filteredEvents = useMemo(() => events.filter((event) => (filters.store === '*' || event.storeName === filters.store) && filters.kinds.has(event.kind)), [events, filters]);
  const active = filteredEvents.find((event) => event.id === activeId) ?? filteredEvents[0];
  const storeCounts = stores.map((store) => ({ name: store.name, count: events.filter((event) => event.storeName === store.name).length }));

  const toggleKind = (kind: TimelineKind) => {
    const next = new Set(filters.kinds);
    if (next.has(kind)) next.delete(kind);
    else next.add(kind);
    setFilters({ ...filters, kinds: next });
  };

  const panels = [
    ...(filtersOpen
      ? [
          {
            id: 'filters',
            min: 180,
            initial: 1,
            content: (
              <aside className="zm-pane h-full">
                <div className="zm-pane-header">
                  <span>Filters</span>
                  <div className="zm-h-actions">
                    <button className="zm-icon-btn" title="Hide filters" onClick={() => setFiltersOpen(false)}>
                      <Icon name="x" size={11} />
                    </button>
                  </div>
                </div>
                <FilterList
                  title="By store"
                  entries={[{ name: '*', label: 'All stores', count: events.length }, ...storeCounts.map((entry) => ({ ...entry, label: entry.name }))]}
                  active={filters.store}
                  onPick={(store) => setFilters({ ...filters, store })}
                />
                <div className="px-3 pb-1 pt-3 text-[11px] uppercase tracking-[0.08em] text-[var(--fg-4)]">By kind</div>
                <div className="flex flex-col gap-1 px-3">
                  {(['action', 'edit', 'replace', 'reset'] as TimelineKind[]).map((kind) => (
                    <label key={kind} className="flex items-center gap-2 text-xs text-[var(--fg-2)]">
                      <input type="checkbox" checked={filters.kinds.has(kind)} onChange={() => toggleKind(kind)} /> <span className={`size-2 rounded-full kind-dot-${kind}`} />
                      {kind}
                    </label>
                  ))}
                </div>
              </aside>
            ),
          },
        ]
      : []),
    {
      id: 'events',
      min: 280,
      initial: 3,
      content: (
        <main className="zm-timeline min-w-0 h-full">
          <div className="zm-timeline-bar">
            <Icon name="history" size={13} />
            <span className="text-[var(--fg-1)]">Timeline</span>
            <span className="font-mono text-[11px] text-[var(--fg-4)]">
              · {filteredEvents.length}/{events.length} events
            </span>
            <span className="flex-1" />
            <button className="zm-tb-btn" onClick={onSnapshot}>
              <Icon name="snapshot" size={11} /> Snapshot now
            </button>
            <button className="zm-tb-btn" onClick={onClear}>
              <Icon name="trash" size={11} /> Clear
            </button>
          </div>
          <div className="zm-events">
            {filteredEvents.map((event) => (
              <TimelineRow key={event.id} event={event} active={active?.id === event.id} onPick={() => setActive(event.id)} />
            ))}
            {filteredEvents.length === 0 && (
              <div className="zm-empty h-auto p-6">
                <h3>No events match filters</h3>
                <p>Change filters or mutate state.</p>
              </div>
            )}
          </div>
        </main>
      ),
    },
    ...(diffOpen
      ? [
          {
            id: 'diff',
            min: 240,
            initial: 1.6,
            content: (
              <aside className="zm-pane zm-diff-panel h-full">
                <div className="zm-pane-header">
                  <span>Diff</span>
                  <div className="zm-h-actions">
                    <button className="zm-icon-btn" title="Hide diff" onClick={() => setDiffOpen(false)}>
                      <Icon name="x" size={11} />
                    </button>
                  </div>
                </div>
                <div className="zm-diff-head">
                  <div className="row1">
                    <span className="zm-badge t-string">{active?.storeName ?? activeStore?.name ?? 'No event'}</span>
                    <span className="text-[var(--fg-1)]">{active?.action ?? 'Waiting for changes'}</span>
                    <span className="arrow">→</span>
                    <span className="text-[var(--fg-2)]">{active?.path ?? '—'}</span>
                  </div>
                  <div className="row2">
                    <Icon name="history" size={11} />
                    <span>{active?.ts ?? '—'}</span>
                    <span>·</span>
                    <span>
                      +{active?.added ?? 0} −{active?.removed ?? 0}
                    </span>
                  </div>
                </div>
                <div className="zm-diff-body py-2">
                  {active ? (
                    <>
                      <DiffRow kind="rem" line={formatJson(active.before)} />
                      <DiffRow kind="add" line={formatJson(active.after)} />
                      <div className="border-t border-[var(--line-1)] p-3 text-[11px] uppercase tracking-[0.08em] text-[var(--fg-4)]">Full patch</div>
                      <pre className="max-h-72 overflow-auto px-3 font-mono text-[11px] text-[var(--fg-2)]">
                        {formatJson({ store: active.storeName, action: active.action, path: active.path, before: active.before, after: active.after })}
                      </pre>
                    </>
                  ) : (
                    <div className="p-3 text-xs text-[var(--fg-4)]">No event selected.</div>
                  )}
                </div>
                <div className="zm-diff-foot">
                  <button className="zm-btn" disabled={!active?.beforeState} onClick={() => active && onRestoreBefore(active)}>
                    <Icon name="reset" size={11} /> Restore before
                  </button>
                  <button className="zm-btn" disabled={!active} onClick={() => setCompareOpen(true)}>
                    <Icon name="diff" size={11} /> Compare
                  </button>
                  <span className="flex-1" />
                  <button className="zm-btn is-ghost" disabled={!active} onClick={() => active && navigator.clipboard?.writeText(formatJson(active))}>
                    <Icon name="clipboard" size={11} /> Copy patch
                  </button>
                </div>
              </aside>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="zm-view relative h-full">
      <ResizablePanels panels={panels} className="h-full" />
      {compareOpen && active && (
        <CompareModal
          title={`${active.storeName} · ${active.action}`}
          leftLabel={`Before — ${active.path || 'state'}`}
          rightLabel={`After — ${active.path || 'state'}`}
          left={active.before}
          right={active.after}
          onClose={() => setCompareOpen(false)}
        />
      )}
    </div>
  );
}

function FilterList({ title, entries, active, onPick }: { title: string; entries: { name: string; label: string; count: number }[]; active: string; onPick: (name: string) => void }) {
  return (
    <>
      <div className="px-3 pb-1 pt-2 text-[11px] uppercase tracking-[0.08em] text-[var(--fg-4)]">{title}</div>
      <div className="px-2">
        {entries.map((entry) => (
          <button key={entry.name} className={`zm-store w-full text-left ${active === entry.name ? 'is-active' : ''}`} onClick={() => onPick(entry.name)}>
            <span className="zm-store-icon">
              <Icon name={entry.name === '*' ? 'filter' : 'store'} size={11} />
            </span>
            <span className="zm-store-name text-[11px]">{entry.label}</span>
            <span className="font-mono text-[10px] text-[var(--fg-4)]">{entry.count}</span>
            <span />
          </button>
        ))}
      </div>
    </>
  );
}

function TimelineRow({ event, active, onPick }: { event: TimelineEvent; active: boolean; onPick: () => void }) {
  return (
    <button className={`zm-event kind-${event.kind}${active ? ' is-active' : ''}`} onClick={onPick}>
      <span className="ts">{event.ts}</span>
      <span className="marker">
        <Icon name={event.kind === 'action' ? 'play' : event.kind === 'reset' ? 'reset' : event.kind === 'replace' ? 'wrench' : 'edit'} size={9} />
      </span>
      <span className="label">
        <span className="text-[var(--fg-3)]">{event.store}</span>
        <span className="text-[var(--fg-4)]"> · </span>
        <span>{event.action}</span>
        <span className="label-meta">{event.path}</span>
      </span>
      <span className="deltas">
        <span className="d-add">+{event.added}</span>
        <span className="d-rem">−{event.removed}</span>
      </span>
      <span className="dur">{event.dur.toFixed(1)}ms</span>
    </button>
  );
}

function DiffRow({ kind, line }: { kind: 'add' | 'rem'; line: string }) {
  return (
    <div className={`zm-diff-row ${kind === 'add' ? 'is-add' : 'is-rem'}`}>
      <span className="m">{kind === 'add' ? '+' : '−'}</span>
      <span className="whitespace-pre-wrap">{line}</span>
    </div>
  );
}

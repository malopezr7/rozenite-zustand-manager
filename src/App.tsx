import { useMemo, useState } from 'react';

import { Icon, Kbd } from './common/components/Atoms';
import type { PanelToggleEntry } from './common/components/PanelToggleMenu';
import { PanelToggleMenu } from './common/components/PanelToggleMenu';
import { getPathValue } from './common/utils/stateUtils';
import { InspectorView } from './features/inspector/InspectorView';
import { SnapshotsView } from './features/snapshots/SnapshotsView';
import { TimelineView } from './features/timeline/TimelineView';
import type { TimelineEvent } from './features/zustand-panel/types';
import { useZustandManagerPanel } from './features/zustand-panel/useZustandManagerPanel';
import './tokens.css';
import './app.css';
import './timeline.css';

export default function App() {
  const manager = useZustandManagerPanel();
  const [tab, setTab] = useState<'inspector' | 'timeline' | 'snapshots'>('inspector');
  const [userPickedId, setUserPickedId] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState('');
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [seenUpdates, setSeenUpdates] = useState<Record<string, number>>({});
  const [inspectorStoresOpen, setInspectorStoresOpen] = useState(true);
  const [inspectorDetailOpen, setInspectorDetailOpen] = useState(true);
  const [timelineFiltersOpen, setTimelineFiltersOpen] = useState(true);
  const [timelineDiffOpen, setTimelineDiffOpen] = useState(true);
  const [snapshotsDetailOpen, setSnapshotsDetailOpen] = useState(true);

  const toggleEntries: PanelToggleEntry[] =
    tab === 'inspector'
      ? [
          { id: 'stores', label: 'Stores sidebar', icon: 'store', visible: inspectorStoresOpen, onToggle: () => setInspectorStoresOpen((open) => !open) },
          { id: 'detail', label: 'Inspector detail', icon: 'panel', visible: inspectorDetailOpen, onToggle: () => setInspectorDetailOpen((open) => !open) },
        ]
      : tab === 'timeline'
        ? [
            { id: 'filters', label: 'Filters', icon: 'filter', visible: timelineFiltersOpen, onToggle: () => setTimelineFiltersOpen((open) => !open) },
            { id: 'diff', label: 'Diff', icon: 'diff', visible: timelineDiffOpen, onToggle: () => setTimelineDiffOpen((open) => !open) },
          ]
        : [{ id: 'detail', label: 'Snapshot detail', icon: 'panel', visible: snapshotsDetailOpen, onToggle: () => setSnapshotsDetailOpen((open) => !open) }];

  const activeStore = useMemo(() => (userPickedId ? manager.stores.find((store) => store.id === userPickedId) : undefined) ?? manager.stores[0], [userPickedId, manager.stores]);
  const activeStoreId = activeStore?.id ?? '';

  if (activeStore && seenUpdates[activeStore.name] !== activeStore.updates) {
    setSeenUpdates((prev) => ({ ...prev, [activeStore.name]: activeStore.updates }));
  }

  const unseenStoreIds = useMemo(() => new Set(manager.stores.filter((store) => store.updates > (seenUpdates[store.name] ?? 0)).map((store) => store.id)), [manager.stores, seenUpdates]);

  const onPickStore = (id: string) => {
    setUserPickedId(id);
    setSelectedPath('');
    const picked = manager.stores.find((store) => store.id === id);
    if (picked) setSeenUpdates((prev) => ({ ...prev, [picked.name]: picked.updates }));
  };

  const replaceStoreState = (storeId: string, state: Record<string, unknown>) => manager.replaceState(storeId, state);
  const restoreBefore = (event: TimelineEvent) => event.beforeState && manager.replaceState(event.storeId, event.beforeState);

  return (
    <div className="zm">
      <header className="zm-toolbar">
        <nav className="zm-tabs">
          <button className={`zm-tab ${tab === 'inspector' ? 'is-active' : ''}`} onClick={() => setTab('inspector')}>
            <Icon name="tree" size={11} /> Inspector <span className="zm-tab-count">· {manager.stores.length}</span>
          </button>
          <button className={`zm-tab ${tab === 'timeline' ? 'is-active' : ''}`} onClick={() => setTab('timeline')}>
            <Icon name="history" size={11} /> Timeline <span className="zm-tab-count">· {manager.timeline.length}</span>
          </button>
          <button className={`zm-tab ${tab === 'snapshots' ? 'is-active' : ''}`} onClick={() => setTab('snapshots')}>
            <Icon name="snapshot" size={11} /> Snapshots <span className="zm-tab-count">· {manager.snapshots.length}</span>
          </button>
        </nav>
        <span className="zm-tb-spacer" />
        <span className="font-mono text-[11px] text-[var(--fg-4)]">
          {manager.stores.length} stores · {manager.timeline.length} events
        </span>
        <PanelToggleMenu entries={toggleEntries} />
      </header>

      <main className="min-h-0">
        {tab === 'inspector' && (
          <InspectorView
            stores={manager.stores}
            activeStore={activeStore}
            activeStoreId={activeStoreId}
            setActiveStoreId={onPickStore}
            unseenStoreIds={unseenStoreIds}
            selectedPath={selectedPath}
            setSelectedPath={setSelectedPath}
            patchValue={manager.patchValue}
            deleteValue={manager.deleteValue}
            replaceState={manager.replaceState}
            resetStore={manager.resetStore}
            callAction={manager.callAction}
            storesOpen={inspectorStoresOpen}
            setStoresOpen={setInspectorStoresOpen}
            detailOpen={inspectorDetailOpen}
            setDetailOpen={setInspectorDetailOpen}
          />
        )}
        {tab === 'timeline' && (
          <TimelineView
            events={manager.timeline}
            stores={manager.stores}
            activeId={activeEventId}
            setActive={setActiveEventId}
            activeStore={activeStore}
            onClear={manager.clearTimeline}
            onSnapshot={() => manager.captureSnapshot()}
            onRestoreBefore={restoreBefore}
            filtersOpen={timelineFiltersOpen}
            setFiltersOpen={setTimelineFiltersOpen}
            diffOpen={timelineDiffOpen}
            setDiffOpen={setTimelineDiffOpen}
          />
        )}
        {tab === 'snapshots' && (
          <SnapshotsView
            stores={manager.stores}
            snapshots={manager.snapshots}
            onCapture={() => manager.captureSnapshot()}
            onImport={manager.importSnapshot}
            onRestoreStore={replaceStoreState}
            detailOpen={snapshotsDetailOpen}
            setDetailOpen={setSnapshotsDetailOpen}
          />
        )}
      </main>

      <footer className="zm-statusbar">
        <span className="sb-item">
          <span className="dot" /> live · {manager.timeline.length} events
        </span>
        <span className="sb-item">
          <Icon name="store" size={10} /> {activeStore?.name ?? 'no store'}
        </span>
        <span className="sb-item">{activeStore?.keys ?? 0} keys</span>
        <span className="sb-item">
          Selected: <span className="text-[var(--fg-2)]">{selectedPath || '—'}</span>
        </span>
        <span className="sb-spacer" />
        <span className="sb-item">
          <Kbd>double click</Kbd> edit
        </span>
        <span className="sb-item max-w-[40vw] truncate">{activeStore && selectedPath ? JSON.stringify(getPathValue(activeStore.state, selectedPath)) : ''}</span>
      </footer>
    </div>
  );
}

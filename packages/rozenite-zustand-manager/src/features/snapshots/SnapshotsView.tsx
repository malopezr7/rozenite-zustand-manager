import { useMemo, useState } from 'react';

import { Icon } from '../../common/components/Atoms';
import { CompareModal } from '../../common/components/CompareModal';
import { Modal } from '../../common/components/Modal';
import { ResizablePanels } from '../../common/components/ResizablePanels';
import { downloadJson } from '../../common/utils/stateUtils';
import type { Snapshot, StoreDescriptor } from '../zustand-panel/types';

function snapshotShape(stores: StoreDescriptor[]) {
  return Object.fromEntries(stores.map((store) => [store.id, store.state]));
}

export function SnapshotsView({
  stores,
  snapshots,
  onCapture,
  onImport,
  onRestoreStore,
  detailOpen,
  setDetailOpen,
}: {
  stores: StoreDescriptor[];
  snapshots: Snapshot[];
  onCapture: () => void;
  onImport: (snapshot: Snapshot) => void;
  onRestoreStore: (storeName: string, value: Record<string, unknown>) => void;
  detailOpen: boolean;
  setDetailOpen: (open: boolean) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const selected = useMemo(() => snapshots.find((snapshot) => snapshot.id === selectedId) ?? snapshots[0], [selectedId, snapshots]);
  const panels = [
    { id: 'list', min: 280, initial: 2, content: <SnapshotList snapshots={snapshots} selectedId={selected?.id} onPick={setSelectedId} onCapture={onCapture} onImport={() => setImportOpen(true)} /> },
    ...(detailOpen
      ? [
          {
            id: 'detail',
            min: 240,
            initial: 1.5,
            content: <SnapshotDetail snapshot={selected} onRestoreStore={onRestoreStore} onCompare={() => setCompareOpen(true)} onClose={() => setDetailOpen(false)} />,
          },
        ]
      : []),
  ];
  return (
    <div className="zm-view relative h-full">
      <ResizablePanels className="h-full" panels={panels} />
      {importOpen && <ImportSnapshotModal onClose={() => setImportOpen(false)} onImport={onImport} />}
      {compareOpen && selected && (
        <CompareModal
          title={`Compare ${selected.label} vs current`}
          leftLabel={`Snapshot · ${selected.at}`}
          rightLabel="Current state"
          left={snapshotShape(selected.data)}
          right={snapshotShape(stores)}
          onClose={() => setCompareOpen(false)}
        />
      )}
    </div>
  );
}

function SnapshotList({
  snapshots,
  selectedId,
  onPick,
  onCapture,
  onImport,
}: {
  snapshots: Snapshot[];
  selectedId: string | undefined;
  onPick: (id: string) => void;
  onCapture: () => void;
  onImport: () => void;
}) {
  return (
    <section className="zm-pane h-full">
      <div className="zm-pane-header">
        <span>Snapshots</span>
        <div className="zm-h-actions">
          <button className="zm-tb-btn" onClick={onCapture}>
            <Icon name="snapshot" size={11} /> Capture
          </button>
          <button className="zm-tb-btn" onClick={onImport}>
            <Icon name="clipboard" size={11} /> Import…
          </button>
        </div>
      </div>
      <div className="overflow-auto">
        {snapshots.map((snapshot) => (
          <button
            key={snapshot.id}
            className={`zm-event kind-edit w-full ${selectedId === snapshot.id ? 'is-active' : ''}`}
            style={{ gridTemplateColumns: '80px 18px 1fr 90px 80px' }}
            onClick={() => onPick(snapshot.id)}
          >
            <span className="ts">{snapshot.at}</span>
            <span className="marker">
              <Icon name="snapshot" size={9} />
            </span>
            <span className="label">
              <span className="text-[var(--fg-1)]">{snapshot.label}</span>
              <span className="label-meta">
                {snapshot.id} · {snapshot.stores} stores
              </span>
            </span>
            <span className="text-[11px] text-[var(--fg-3)]">{snapshot.auto ? 'auto' : 'manual'}</span>
            <span className="dur">{snapshot.size}</span>
          </button>
        ))}
        {snapshots.length === 0 && (
          <div className="zm-empty h-auto p-6">
            <h3>No snapshots yet</h3>
            <p>Capture or import JSON.</p>
          </div>
        )}
      </div>
    </section>
  );
}

function SnapshotDetail({
  snapshot,
  onRestoreStore,
  onCompare,
  onClose,
}: {
  snapshot: Snapshot | undefined;
  onRestoreStore: (storeName: string, value: Record<string, unknown>) => void;
  onCompare: () => void;
  onClose: () => void;
}) {
  const snapshotStores = snapshot?.data ?? [];
  return (
    <aside className="zm-pane zm-detail h-full">
      <div className="zm-pane-header">
        <span>{snapshot ? `${snapshot.id} · ${snapshot.label}` : 'No snapshot selected'}</span>
        <div className="zm-h-actions">
          <button className="zm-icon-btn" title="Hide detail" onClick={onClose}>
            <Icon name="x" size={11} />
          </button>
        </div>
      </div>
      <dl className="zm-detail-rows pt-3">
        <dt>captured</dt>
        <dd>{snapshot?.at ?? '—'}</dd>
        <dt>trigger</dt>
        <dd>{snapshot?.auto ? 'auto' : 'manual'}</dd>
        <dt>stores</dt>
        <dd>{snapshot ? `${snapshot.stores} · ${snapshot.keys} keys` : '—'}</dd>
        <dt>size</dt>
        <dd>{snapshot?.size ?? '—'}</dd>
      </dl>
      <div className="zm-action-row">
        <button className="zm-btn is-primary" disabled={!snapshot} onClick={() => snapshotStores.forEach((store) => onRestoreStore(store.id, store.state))}>
          <Icon name="reset" size={11} /> Restore all
        </button>
        <button className="zm-btn" disabled={!snapshot} onClick={onCompare}>
          <Icon name="diff" size={11} /> Compare current
        </button>
        <button className="zm-btn is-ghost" disabled={!snapshot} onClick={() => snapshot && downloadJson(`${snapshot.id}.json`, snapshot)}>
          <Icon name="clipboard" size={11} /> Export JSON
        </button>
      </div>
      <div className="border-t border-[var(--line-1)] px-3 py-2 text-[10px] uppercase tracking-[0.08em] text-[var(--fg-4)]">Stores in snapshot</div>
      <div className="min-h-0 overflow-auto">
        {snapshotStores.map((store) => (
          <div key={store.id} className="zm-store h-7">
            <span className="zm-store-icon">
              <Icon name="store" size={11} />
            </span>
            <span className="zm-store-name">{store.name}</span>
            <span className="font-mono text-[10px] text-[var(--fg-4)]">{store.keys} keys</span>
            <button className="zm-btn h-5 px-1 text-[10px]" onClick={() => onRestoreStore(store.id, store.state)}>
              Restore
            </button>
          </div>
        ))}
      </div>
    </aside>
  );
}

function ImportSnapshotModal({ onClose, onImport }: { onClose: () => void; onImport: (snapshot: Snapshot) => void }) {
  const [raw, setRaw] = useState('');
  const [error, setError] = useState<string | null>(null);
  return (
    <Modal title="Import snapshot JSON" onClose={onClose}>
      <textarea
        className="h-[52vh] w-full resize-none rounded border border-[var(--line-1)] bg-[var(--bg-input)] p-3 font-mono text-xs text-[var(--fg-1)] outline-none focus:border-[var(--accent)]"
        placeholder="Paste snapshot JSON…"
        value={raw}
        onChange={(event) => setRaw(event.target.value)}
      />
      {error && <p className="mt-2 text-xs text-[var(--danger)]">{error}</p>}
      <div className="mt-3 flex justify-end gap-2">
        <button className="zm-btn" onClick={onClose}>
          Cancel
        </button>
        <button
          className="zm-btn is-primary"
          onClick={() => {
            try {
              const parsed = JSON.parse(raw) as Snapshot;
              if (!parsed.data || !Array.isArray(parsed.data)) throw new Error('Snapshot JSON must contain data[].');
              onImport({
                ...parsed,
                id: parsed.id ?? `import_${Date.now()}`,
                at: parsed.at ?? new Date().toLocaleTimeString('en-GB', { hour12: false }),
                label: parsed.label ?? 'Imported snapshot',
                stores: parsed.data.length,
                keys: parsed.data.reduce((total, store) => total + (store.keys ?? 0), 0),
                size: parsed.size ?? `${(new Blob([raw]).size / 1024).toFixed(1)} KB`,
                auto: false,
              });
              onClose();
            } catch (importError) {
              setError(importError instanceof Error ? importError.message : 'Invalid JSON');
            }
          }}
        >
          <Icon name="clipboard" size={11} /> Import
        </button>
      </div>
    </Modal>
  );
}

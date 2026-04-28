import { useMemo, useRef, useState } from 'react';

import { Icon, Kbd, TypeBadge } from '../../common/components/Atoms';
import { Modal } from '../../common/components/Modal';
import { ResizablePanels } from '../../common/components/ResizablePanels';
import type { JsonKind } from '../../common/utils/stateUtils';
import { filterTreeEntries, formatJson, getPathValue, parseEditableValue, previewValue, typeOf } from '../../common/utils/stateUtils';
import type { ActionDescriptor, StoreDescriptor } from '../zustand-panel/types';
import { ActionParamsModal } from './ActionParamsModal';
import { StateTree } from './StateTree';

type InspectorProps = {
  stores: StoreDescriptor[];
  activeStore: StoreDescriptor | undefined;
  activeStoreId: string;
  unseenStoreIds: Set<string>;
  selectedPath: string;
  setActiveStoreId: (id: string) => void;
  setSelectedPath: (path: string) => void;
  patchValue: (storeName: string, path: string, value: unknown) => void;
  deleteValue: (storeName: string, path: string) => void;
  replaceState: (storeName: string, value: Record<string, unknown>) => void;
  resetStore: (storeName: string) => void;
  callAction: (storeName: string, actionName: string, args?: unknown[]) => void;
  storesOpen: boolean;
  setStoresOpen: (open: boolean) => void;
  detailOpen: boolean;
  setDetailOpen: (open: boolean) => void;
};

export function InspectorView(props: InspectorProps) {
  const [storeQuery, setStoreQuery] = useState('');
  const [stateQuery, setStateQuery] = useState('');
  const [view, setView] = useState<'tree' | 'json' | 'table'>('tree');
  const [expandedSet, setExpanded] = useState(() => new Set<string>());
  const [editingPath, setEditingPath] = useState<string | null>(null);
  const [editingError, setEditingError] = useState<string | null>(null);
  const [flashPath, setFlashPath] = useState<string | null>(null);
  const { storesOpen, setStoresOpen, detailOpen, setDetailOpen } = props;
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<ActionDescriptor | null>(null);
  const activeStore = props.activeStore;
  const selectedValue = activeStore ? getPathValue(activeStore.state, props.selectedPath) : undefined;
  const flashTimerRef = useRef<number | null>(null);

  const handleSetEditingPath = (path: string | null) => {
    setEditingPath(path);
    setEditingError(null);
  };

  const onEditCommit = (path: string, raw: string, kind: JsonKind) => {
    if (!activeStore) return;
    try {
      const parsed = parseEditableValue(raw, kind);
      handleSetEditingPath(null);
      if (flashTimerRef.current !== null) clearTimeout(flashTimerRef.current);
      setFlashPath(path);
      flashTimerRef.current = window.setTimeout(() => {
        setFlashPath(null);
        flashTimerRef.current = null;
      }, 800);
      props.patchValue(activeStore.id, path, parsed);
    } catch (error) {
      setEditingError(error instanceof Error ? error.message : 'Invalid value.');
    }
  };

  const panels = [
    ...(storesOpen
      ? [
          {
            id: 'stores',
            min: 180,
            initial: 1,
            content: (
              <StoreSidebar
                stores={props.stores}
                activeId={props.activeStoreId}
                unseenStoreIds={props.unseenStoreIds}
                query={storeQuery}
                setQuery={setStoreQuery}
                onPick={props.setActiveStoreId}
                onClose={() => setStoresOpen(false)}
              />
            ),
          },
        ]
      : []),
    {
      id: 'state',
      min: 280,
      initial: 3,
      content: activeStore ? (
        <StatePane
          store={activeStore}
          view={view}
          setView={setView}
          query={stateQuery}
          setQuery={setStateQuery}
          expandedSet={expandedSet}
          setExpanded={setExpanded}
          selectedPath={props.selectedPath}
          setSelectedPath={props.setSelectedPath}
          editingPath={editingPath}
          setEditingPath={handleSetEditingPath}
          editingError={editingError}
          flashPath={flashPath}
          onEditCommit={onEditCommit}
          onDelete={(path) => props.deleteValue(activeStore.id, path)}
        />
      ) : (
        <EmptyInspector />
      ),
    },
    ...(detailOpen && activeStore
      ? [
          {
            id: 'detail',
            min: 240,
            initial: 1.5,
            content: (
              <DetailPane
                store={activeStore}
                selectedPath={props.selectedPath}
                selectedValue={selectedValue}
                onClose={() => setDetailOpen(false)}
                onStartEdit={() => {
                  if (props.selectedPath) handleSetEditingPath(props.selectedPath);
                }}
                onCopyPath={() => navigator.clipboard?.writeText(props.selectedPath)}
                onResetStore={() => props.resetStore(activeStore.id)}
                onReplace={() => setReplaceOpen(true)}
                onCallAction={(action) => {
                  if (action.arity === 0) props.callAction(activeStore.id, action.name);
                  else setPendingAction(action);
                }}
              />
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="zm-view relative h-full">
      <ResizablePanels panels={panels} className="h-full" />
      {replaceOpen && activeStore && <ReplaceStateModal store={activeStore} onClose={() => setReplaceOpen(false)} onReplace={(value) => props.replaceState(activeStore.id, value)} />}
      {pendingAction && activeStore && (
        <ActionParamsModal storeName={activeStore.name} action={pendingAction} onClose={() => setPendingAction(null)} onCall={(args) => props.callAction(activeStore.id, pendingAction.name, args)} />
      )}
    </div>
  );
}

function StoreSidebar({
  stores,
  activeId,
  unseenStoreIds,
  query,
  setQuery,
  onPick,
  onClose,
}: {
  stores: StoreDescriptor[];
  activeId: string;
  unseenStoreIds: Set<string>;
  query: string;
  setQuery: (value: string) => void;
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  const filtered = stores.filter((store) => store.name.toLowerCase().includes(query.toLowerCase()));
  return (
    <aside className="zm-pane h-full">
      <div className="zm-pane-header">
        <span>Stores</span>
        <div className="zm-h-actions">
          <button className="zm-icon-btn" title="Hide sidebar" onClick={onClose}>
            <Icon name="x" size={11} />
          </button>
        </div>
      </div>
      <div className="zm-search">
        <Icon name="search" size={12} />
        <input placeholder="Filter stores…" value={query} onChange={(event) => setQuery(event.target.value)} />
      </div>
      <div className="zm-section-label">
        <span>List</span>
        <span className="ml-auto font-mono text-[var(--fg-4)]">
          {filtered.length}/{stores.length}
        </span>
      </div>
      <div className="zm-stores">
        {filtered.map((store) => {
          const isUnseen = unseenStoreIds.has(store.id);
          return (
            <button key={store.id} className={`zm-store w-full text-left${activeId === store.id ? ' is-active' : ''}`} onClick={() => onPick(store.id)}>
              <span className="zm-store-icon">
                <Icon name="store" size={12} />
              </span>
              <span className="zm-store-name">{store.name}</span>
              <span className="zm-spark" title={`${store.updates} updates`}>
                {Array.from({ length: 6 }).map((_, index) => (
                  <span key={index} style={{ height: `${2 + ((store.updates * (index + 1)) % 8)}px` }} />
                ))}
              </span>
              <span className={`zm-store-pulse${isUnseen ? ' is-hot' : ''}`} title={isUnseen ? 'Updated since last viewed' : 'Up to date'} />
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function StatePane(props: {
  store: StoreDescriptor;
  view: 'tree' | 'json' | 'table';
  setView: (view: 'tree' | 'json' | 'table') => void;
  query: string;
  setQuery: (query: string) => void;
  expandedSet: Set<string>;
  setExpanded: (value: Set<string>) => void;
  selectedPath: string;
  setSelectedPath: (path: string) => void;
  editingPath: string | null;
  setEditingPath: (path: string | null) => void;
  editingError: string | null;
  flashPath: string | null;
  onEditCommit: (path: string, raw: string, kind: JsonKind) => void;
  onDelete: (path: string) => void;
}) {
  const filteredEntries = useMemo(() => filterTreeEntries(Object.entries(props.store.state), props.query), [props.query, props.store.state]);
  const filteredState = useMemo(() => Object.fromEntries(filteredEntries), [filteredEntries]);
  return (
    <main className="zm-pane zm-inspector h-full">
      <div className="zm-inspector-bar">
        <div className="zm-breadcrumbs">
          <Icon name="store" size={12} />
          <b>{props.store.name}</b>
          <span className="sep">/</span>
          <span>{props.selectedPath || 'state'}</span>
        </div>
        <div className="zm-search bg-transparent p-0">
          <Icon name="search" size={11} />
          <input placeholder="Filter keys & values…" value={props.query} onChange={(event) => props.setQuery(event.target.value)} className="!w-56" />
        </div>
        <div className="zm-segmented" role="tablist">
          <button className={props.view === 'tree' ? 'is-active' : ''} onClick={() => props.setView('tree')}>
            <Icon name="tree" size={11} /> Tree
          </button>
          <button className={props.view === 'json' ? 'is-active' : ''} onClick={() => props.setView('json')}>
            <Icon name="code" size={11} /> JSON
          </button>
          <button className={props.view === 'table' ? 'is-active' : ''} onClick={() => props.setView('table')}>
            <Icon name="table" size={11} /> Table
          </button>
        </div>
      </div>
      <div className="zm-inspector-body">
        {props.view === 'tree' && (
          <StateTree
            state={filteredState}
            expandedSet={props.expandedSet}
            setExpanded={props.setExpanded}
            selectedPath={props.selectedPath}
            setSelectedPath={props.setSelectedPath}
            editingPath={props.editingPath}
            setEditingPath={props.setEditingPath}
            editingError={props.editingError}
            flashPath={props.flashPath}
            onEditCommit={props.onEditCommit}
            onDelete={props.onDelete}
            redactSet={new Set(['session.accessToken', 'session.refreshToken', 'user.email'])}
          />
        )}
        {props.view === 'json' && <JsonView value={filteredState} />}
        {props.view === 'table' && <TableView state={filteredState} setSelectedPath={props.setSelectedPath} setEditingPath={props.setEditingPath} />}
      </div>
    </main>
  );
}

function DetailPane({
  store,
  selectedPath,
  selectedValue,
  onClose,
  onStartEdit,
  onCopyPath,
  onResetStore,
  onReplace,
  onCallAction,
}: {
  store: StoreDescriptor;
  selectedPath: string;
  selectedValue: unknown;
  onClose: () => void;
  onStartEdit: () => void;
  onCopyPath: () => void;
  onResetStore: () => void;
  onReplace: () => void;
  onCallAction: (action: ActionDescriptor) => void;
}) {
  return (
    <aside className="zm-pane zm-detail h-full">
      <div className="zm-pane-header">
        <span>Inspector</span>
        <div className="zm-h-actions">
          <button className="zm-icon-btn" title="Close" onClick={onClose}>
            <Icon name="x" size={11} />
          </button>
        </div>
      </div>
      <section className="zm-detail-section">
        <h4>Store</h4>
        <dl className="zm-detail-rows">
          <dt>name</dt>
          <dd>{store.name}</dd>
          <dt>file</dt>
          <dd>{store.file}</dd>
          <dt>keys</dt>
          <dd>{store.keys}</dd>
          <dt>updates</dt>
          <dd>{store.updates.toLocaleString()}</dd>
          <dt>editable</dt>
          <dd>{store.editable ? 'yes' : 'no'}</dd>
        </dl>
      </section>
      <section className="zm-detail-section">
        <h4>Selection</h4>
        <dl className="zm-detail-rows">
          <dt>path</dt>
          <dd>{selectedPath || '—'}</dd>
          <dt>type</dt>
          <dd>{selectedPath ? typeOf(selectedValue) : '—'}</dd>
          <dt>value</dt>
          <dd className="max-h-32 overflow-auto font-mono whitespace-pre-wrap">{selectedPath ? formatJson(selectedValue) : '—'}</dd>
        </dl>
        <div className="zm-action-row">
          <button className="zm-btn" onClick={onStartEdit} disabled={!selectedPath}>
            <Icon name="edit" size={11} /> Edit <Kbd>↵</Kbd>
          </button>
          <button className="zm-btn" onClick={onCopyPath} disabled={!selectedPath}>
            <Icon name="clipboard" size={11} /> Copy path
          </button>
        </div>
      </section>
      <section className="zm-detail-section">
        <h4>
          Actions <span className="h4-action">{store.actions.length} exposed</span>
        </h4>
        <div className="zm-actions-list">
          {store.actions.map((action) => (
            <button
              key={action.name}
              className="zm-action-btn"
              title={action.arity > 0 ? `${action.name}(${action.params.join(', ')}) — click to fill form` : `${action.name}() — click to call`}
              onClick={() => onCallAction(action)}
            >
              <Icon name="play" size={9} />
              <span className="zm-action-btn-label">
                {action.name}({action.arity > 0 ? action.params.join(', ') : ''})
              </span>
              {action.arity > 0 ? <span className="zm-action-btn-chip">…</span> : null}
            </button>
          ))}
        </div>
      </section>
      <section className="zm-detail-section">
        <h4>Danger zone</h4>
        <div className="zm-action-row flex-wrap">
          <button className="zm-btn is-danger" onClick={onResetStore} disabled={!store.hasInitial}>
            <Icon name="reset" size={11} /> Reset to initial
          </button>
          <button className="zm-btn is-danger" onClick={onReplace}>
            <Icon name="wrench" size={11} /> Replace state…
          </button>
        </div>
        <p className="px-3 pb-3 text-[11px] leading-5 text-[var(--fg-4)]">Destructive. Replaces Zustand state directly. Dev only.</p>
      </section>
    </aside>
  );
}

function ReplaceStateModal({ store, onClose, onReplace }: { store: StoreDescriptor; onClose: () => void; onReplace: (value: Record<string, unknown>) => void }) {
  const [raw, setRaw] = useState(formatJson(store.state));
  const [error, setError] = useState<string | null>(null);
  return (
    <Modal title={`Replace ${store.name} state`} onClose={onClose}>
      <textarea
        className="h-[55vh] w-full resize-none rounded border border-[var(--line-1)] bg-[var(--bg-input)] p-3 font-mono text-xs text-[var(--fg-1)] outline-none focus:border-[var(--accent)]"
        value={raw}
        onChange={(event) => setRaw(event.target.value)}
      />
      {error && <p className="mt-2 text-xs text-[var(--danger)]">{error}</p>}
      <div className="mt-3 flex justify-end gap-2">
        <button className="zm-btn" onClick={onClose}>
          Cancel
        </button>
        <button
          className="zm-btn is-danger"
          onClick={() => {
            try {
              const parsed = JSON.parse(raw) as Record<string, unknown>;
              onReplace(parsed);
              onClose();
            } catch (parseError) {
              setError(parseError instanceof Error ? parseError.message : 'Invalid JSON');
            }
          }}
        >
          <Icon name="wrench" size={11} /> Replace state
        </button>
      </div>
    </Modal>
  );
}

function TableView({ state, setSelectedPath, setEditingPath }: { state: Record<string, unknown>; setSelectedPath: (path: string) => void; setEditingPath: (path: string) => void }) {
  return (
    <div className="zm-tree p-0">
      {Object.entries(state).map(([key, value]) => {
        const preview = previewValue(value);
        return (
          <button
            key={key}
            className="grid w-full grid-cols-[220px_90px_1fr] items-center border-b border-[var(--line-1)] px-3 py-1 text-left hover:bg-[var(--bg-3)]"
            onDoubleClick={() => {
              setSelectedPath(key);
              setEditingPath(key);
            }}
            onClick={() => setSelectedPath(key)}
          >
            <span className="zm-key">{key}</span>
            <TypeBadge type={typeOf(value)} />
            <span className={`zm-val s-${preview.kind}`}>
              {preview.text} {preview.meta}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function JsonView({ value }: { value: unknown }) {
  const lines = formatJson(value).split('\n');
  return (
    <div className="zm-json">
      {lines.map((line, index) => (
        <div key={index} className="ln">
          <span className="ln-no">{index + 1}</span>
          <span className="ln-content">{line}</span>
        </div>
      ))}
    </div>
  );
}

function EmptyInspector() {
  return <main className="zm-pane grid h-full place-items-center text-sm text-[var(--fg-4)]">No stores connected.</main>;
}

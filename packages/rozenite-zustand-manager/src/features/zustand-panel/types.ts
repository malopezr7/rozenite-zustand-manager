export type ActionDescriptor = {
  name: string;
  arity: number;
  params: string[];
};

export type StoreDescriptor = {
  id: string;
  name: string;
  file: string;
  keys: number;
  updates: number;
  hot: boolean;
  actions: ActionDescriptor[];
  hasInitial: boolean;
  editable: boolean;
  state: Record<string, unknown>;
};

export type TimelineKind = 'edit' | 'action' | 'replace' | 'reset';

export type TimelineEvent = {
  id: string;
  ts: string;
  kind: TimelineKind;
  store: string;
  storeId: string;
  storeName: string;
  action: string;
  path: string;
  before?: unknown;
  after?: unknown;
  beforeState?: Record<string, unknown>;
  afterState?: Record<string, unknown>;
  /** True if `beforeState` contains redacted/function placeholders. Restoring would require a runtime guard, which the runtime already applies. */
  redacted: boolean;
  added: number;
  removed: number;
  dur: number;
};

export type Snapshot = {
  id: string;
  at: string;
  label: string;
  stores: number;
  keys: number;
  size: string;
  auto: boolean;
  data: StoreDescriptor[];
};

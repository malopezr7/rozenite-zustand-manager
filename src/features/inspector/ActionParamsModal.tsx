import { useState } from 'react';

import { Icon } from '../../common/components/Atoms';
import { Modal } from '../../common/components/Modal';
import type { ActionDescriptor } from '../zustand-panel/types';

type ParamKind = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null' | 'undefined';

type ParamState = { kind: ParamKind; raw: string };

type ActionParamsModalProps = {
  storeName: string;
  action: ActionDescriptor;
  onClose: () => void;
  onCall: (args: unknown[]) => void;
};

const KIND_OPTIONS: ParamKind[] = ['string', 'number', 'boolean', 'object', 'array', 'null', 'undefined'];

function defaultRaw(kind: ParamKind): string {
  switch (kind) {
    case 'object':
      return '{}';
    case 'array':
      return '[]';
    case 'boolean':
      return 'false';
    case 'number':
      return '0';
    default:
      return '';
  }
}

function convert(state: ParamState, paramName: string): unknown {
  const trimmed = state.raw.trim();
  switch (state.kind) {
    case 'string':
      return state.raw;
    case 'number': {
      if (trimmed === '' || Number.isNaN(Number(trimmed))) {
        throw new Error(`Param "${paramName}" must be a valid number.`);
      }
      return Number(trimmed);
    }
    case 'boolean':
      return trimmed === 'true';
    case 'null':
      return null;
    case 'undefined':
      return undefined;
    case 'object':
    case 'array': {
      if (trimmed === '') return state.kind === 'array' ? [] : {};
      try {
        const parsed = JSON.parse(trimmed);
        if (state.kind === 'array' && !Array.isArray(parsed)) {
          throw new Error(`Param "${paramName}" must be an array.`);
        }
        if (state.kind === 'object' && (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed))) {
          throw new Error(`Param "${paramName}" must be a plain object.`);
        }
        return parsed;
      } catch (err) {
        if (err instanceof SyntaxError) throw new Error(`Param "${paramName}" is not valid JSON.`);
        throw err;
      }
    }
  }
}

export function ActionParamsModal({ storeName, action, onClose, onCall }: ActionParamsModalProps) {
  const [params, setParams] = useState<ParamState[]>(() => Array.from({ length: action.arity }, () => ({ kind: 'string' as ParamKind, raw: '' })));
  const [error, setError] = useState<string | null>(null);

  const updateKind = (index: number, kind: ParamKind) => {
    setParams((current) => current.map((state, i) => (i === index ? { kind, raw: defaultRaw(kind) } : state)));
  };

  const updateRaw = (index: number, raw: string) => {
    setParams((current) => current.map((state, i) => (i === index ? { ...state, raw } : state)));
  };

  const submit = () => {
    try {
      const args = params.map((state, index) => convert(state, action.params[index] ?? `arg${index}`));
      onCall(args);
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Invalid input.');
    }
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <Modal title={`${storeName}.${action.name}(${action.params.join(', ')})`} onClose={onClose}>
      <div className="zm-action-form" onKeyDown={onKeyDown}>
        <p className="text-[11px] text-[var(--fg-3)]">Pick a type per parameter; the input adapts. Strings are passed verbatim (no quotes needed). Objects/arrays expect JSON.</p>
        {params.map((state, index) => (
          <ParamField
            key={index}
            paramName={action.params[index] ?? `arg${index}`}
            index={index}
            state={state}
            onKindChange={(kind) => updateKind(index, kind)}
            onRawChange={(raw) => updateRaw(index, raw)}
          />
        ))}
        {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
        <div className="mt-2 flex justify-end gap-2">
          <button className="zm-btn" onClick={onClose}>
            Cancel
          </button>
          <button className="zm-btn is-primary" onClick={submit}>
            <Icon name="play" size={11} /> Call action <span className="text-[10px] opacity-60">⌘⏎</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}

function ParamField({
  paramName,
  index,
  state,
  onKindChange,
  onRawChange,
}: {
  paramName: string;
  index: number;
  state: ParamState;
  onKindChange: (kind: ParamKind) => void;
  onRawChange: (raw: string) => void;
}) {
  return (
    <div className="zm-action-field">
      <div className="zm-action-field-label">
        <span className="text-[var(--fg-1)] font-mono">{paramName}</span>
        <span className="text-[var(--fg-4)]">arg {index}</span>
        <span className="ml-auto inline-flex gap-1">
          {KIND_OPTIONS.map((kind) => (
            <button key={kind} type="button" className={`zm-kind-pill${state.kind === kind ? ' is-active' : ''}`} onClick={() => onKindChange(kind)}>
              {kind}
            </button>
          ))}
        </span>
      </div>
      <ParamInput state={state} onRawChange={onRawChange} />
    </div>
  );
}

function ParamInput({ state, onRawChange }: { state: ParamState; onRawChange: (raw: string) => void }) {
  if (state.kind === 'null')
    return (
      <div className="zm-action-field-readonly">
        <code className="zm-inline-code">null</code> will be passed
      </div>
    );
  if (state.kind === 'undefined')
    return (
      <div className="zm-action-field-readonly">
        <code className="zm-inline-code">undefined</code> will be passed (no value)
      </div>
    );
  if (state.kind === 'boolean') {
    const value = state.raw.trim() === 'true';
    return (
      <label className="zm-action-field-readonly inline-flex cursor-pointer items-center gap-2">
        <input type="checkbox" checked={value} onChange={(event) => onRawChange(event.target.checked ? 'true' : 'false')} />
        <code className="zm-inline-code">{value ? 'true' : 'false'}</code>
      </label>
    );
  }
  if (state.kind === 'number') {
    return <input type="number" inputMode="decimal" className="zm-action-field-input" placeholder="42" value={state.raw} onChange={(event) => onRawChange(event.target.value)} />;
  }
  if (state.kind === 'string') {
    return <input type="text" className="zm-action-field-input" placeholder="Plain text — no quotes" value={state.raw} onChange={(event) => onRawChange(event.target.value)} />;
  }
  return (
    <textarea
      rows={5}
      className="zm-action-field-input"
      placeholder={state.kind === 'array' ? '[\n  "value"\n]' : '{\n  "key": "value"\n}'}
      value={state.raw}
      onChange={(event) => onRawChange(event.target.value)}
    />
  );
}

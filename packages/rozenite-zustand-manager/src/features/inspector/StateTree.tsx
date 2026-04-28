import { useState } from 'react';

import { Icon, TypeBadge } from '../../common/components/Atoms';
import type { JsonKind } from '../../common/utils/stateUtils';
import { formatJson, previewValue, stringifyEditableValue, typeOf } from '../../common/utils/stateUtils';

const SENSITIVE = /^(password|pass|pwd|token|accessToken|refreshToken|email|secret|apiKey|authorization)$/i;

export function StateTree({
  state,
  expandedSet,
  setExpanded,
  selectedPath,
  setSelectedPath,
  editingPath,
  setEditingPath,
  editingError,
  flashPath,
  onEditCommit,
  onDelete,
  redactSet,
}: {
  state: Record<string, unknown>;
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
  redactSet: Set<string>;
}) {
  return (
    <div className="zm-tree">
      {Object.entries(state).map(([key, value]) => (
        <TreeRow
          key={key}
          label={key}
          value={value}
          depth={0}
          path={key}
          expandedSet={expandedSet}
          setExpanded={setExpanded}
          selectedPath={selectedPath}
          setSelectedPath={setSelectedPath}
          editingPath={editingPath}
          setEditingPath={setEditingPath}
          editingError={editingError}
          flashPath={flashPath}
          onEditCommit={onEditCommit}
          onDelete={onDelete}
          redactSet={redactSet}
        />
      ))}
    </div>
  );
}

function TreeRow({
  label,
  value,
  depth,
  path,
  isArrayIdx,
  expandedSet,
  setExpanded,
  selectedPath,
  setSelectedPath,
  editingPath,
  setEditingPath,
  editingError,
  flashPath,
  onEditCommit,
  onDelete,
  redactSet,
}: {
  label: string | number;
  value: unknown;
  depth: number;
  path: string;
  isArrayIdx?: boolean;
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
  redactSet: Set<string>;
}) {
  const kind = typeOf(value);
  const isContainer = kind === 'object' || kind === 'array';
  const isOpen = expandedSet.has(path);
  const redacted = redactSet.has(path) || SENSITIVE.test(String(label));
  const preview = previewValue(value);
  const isEditing = editingPath === path;

  const toggle = () => {
    if (!isContainer) return;
    const next = new Set(expandedSet);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    setExpanded(next);
  };

  return (
    <>
      <div
        className={`zm-row${selectedPath === path ? ' is-selected' : ''}${isEditing ? ' is-edited' : ''}${flashPath === path ? ' is-flash' : ''}`}
        style={{ paddingLeft: 12 + depth * 14 }}
        onClick={() => setSelectedPath(path)}
        onDoubleClick={() => !redacted && setEditingPath(path)}
      >
        <div className="row-inner">
          <button
            className={`zm-twist${isOpen ? ' is-open' : ''}${!isContainer ? ' is-leaf' : ''}`}
            onClick={(event) => {
              event.stopPropagation();
              toggle();
            }}
          >
            {isContainer ? <Icon name="chevron-right" size={10} /> : null}
          </button>
          <span className={`zm-key ${isArrayIdx ? 'is-array-idx' : ''}`}>{label}</span>
          <span className="zm-colon">:</span>
          {!isEditing && (
            <span className={`zm-val s-${redacted ? 'redacted' : preview.kind}`}>
              {redacted ? (
                <>
                  <Icon name="lock" size={10} /> redacted
                </>
              ) : (
                <>
                  {preview.text}
                  {preview.meta && <span className="preview-meta"> {preview.meta}</span>}
                </>
              )}
            </span>
          )}
          {isEditing && (
            <InlineEditor
              initial={stringifyEditableValue(value)}
              kind={kind}
              multiline={isContainer || kind === 'null' || kind === 'undefined'}
              error={editingError}
              onCommit={(raw) => onEditCommit(path, raw, kind)}
              onCancel={() => setEditingPath(null)}
            />
          )}
          <TypeBadge type={redacted ? 'redacted' : kind} />
        </div>
        {!isEditing && (
          <div className="row-actions">
            {!redacted && (
              <button
                className="zm-icon-btn"
                title="Edit value"
                onClick={(event) => {
                  event.stopPropagation();
                  setSelectedPath(path);
                  setEditingPath(path);
                }}
              >
                <Icon name="edit" size={11} />
              </button>
            )}
            <button
              className="zm-icon-btn"
              title="Copy value"
              onClick={(event) => {
                event.stopPropagation();
                const text = isContainer ? formatJson(value) : kind === 'string' ? String(value) : kind === 'undefined' ? 'undefined' : kind === 'function' ? 'ƒ ()' : String(value);
                navigator.clipboard?.writeText(text);
              }}
            >
              <Icon name="clipboard" size={11} />
            </button>
            <button
              className="zm-icon-btn"
              title="Delete value"
              onClick={(event) => {
                event.stopPropagation();
                onDelete(path);
              }}
            >
              <Icon name="trash" size={11} />
            </button>
          </div>
        )}
      </div>

      {isContainer &&
        isOpen &&
        (Array.isArray(value)
          ? value.map((child, index) => (
              <TreeRow
                key={`${path}[${index}]`}
                label={index}
                value={child}
                depth={depth + 1}
                path={`${path}[${index}]`}
                isArrayIdx
                expandedSet={expandedSet}
                setExpanded={setExpanded}
                selectedPath={selectedPath}
                setSelectedPath={setSelectedPath}
                editingPath={editingPath}
                setEditingPath={setEditingPath}
                editingError={editingError}
                flashPath={flashPath}
                onEditCommit={onEditCommit}
                onDelete={onDelete}
                redactSet={redactSet}
              />
            ))
          : Object.entries(value as Record<string, unknown>).map(([key, child]) => (
              <TreeRow
                key={`${path}.${key}`}
                label={key}
                value={child}
                depth={depth + 1}
                path={`${path}.${key}`}
                expandedSet={expandedSet}
                setExpanded={setExpanded}
                selectedPath={selectedPath}
                setSelectedPath={setSelectedPath}
                editingPath={editingPath}
                setEditingPath={setEditingPath}
                editingError={editingError}
                flashPath={flashPath}
                onEditCommit={onEditCommit}
                onDelete={onDelete}
                redactSet={redactSet}
              />
            )))}
    </>
  );
}

function InlineEditor({
  initial,
  kind,
  multiline,
  error,
  onCommit,
  onCancel,
}: {
  initial: string;
  kind: JsonKind;
  multiline: boolean;
  error: string | null;
  onCommit: (raw: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  const help = error ?? (multiline ? `${kind} — Enter apply · Shift+Enter newline · Esc cancel` : `${kind} — Enter apply · Esc cancel`);
  const common = {
    className: error ? 'is-error' : '',
    value,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setValue(event.target.value),
    onKeyDown: (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        onCommit(value);
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
      }
    },
    onClick: (event: React.MouseEvent) => event.stopPropagation(),
  };

  return (
    <span className={`zm-edit ${multiline ? 'is-multiline' : ''}`}>
      {multiline ? <textarea autoFocus rows={8} {...common} /> : <input autoFocus {...common} />}
      <span className="zm-edit-actions" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="zm-btn is-primary h-6 px-2 text-[11px]" onClick={() => onCommit(value)}>
          <Icon name="edit" size={10} /> Apply
        </button>
        <button type="button" className="zm-btn h-6 px-2 text-[11px]" onClick={onCancel}>
          <Icon name="x" size={10} /> Cancel
        </button>
      </span>
      <span className={`zm-edit-help ${error ? 'is-error' : ''}`}>
        <Icon name={error ? 'warn' : 'info'} size={11} />
        {help}
      </span>
    </span>
  );
}

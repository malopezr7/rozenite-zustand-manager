import { useMemo } from 'react';
import { formatJson } from '../utils/stateUtils';
import { Icon } from './Atoms';
import { Modal } from './Modal';

type CompareModalProps = {
  title: string;
  leftLabel: string;
  rightLabel: string;
  left: unknown;
  right: unknown;
  onClose: () => void;
};

type DiffLine = { kind: 'same' | 'changed' | 'added' | 'removed'; left: string; right: string };

function buildLineDiff(leftLines: string[], rightLines: string[]): DiffLine[] {
  const out: DiffLine[] = [];
  const max = Math.max(leftLines.length, rightLines.length);
  for (let index = 0; index < max; index += 1) {
    if (index >= leftLines.length) out.push({ kind: 'added', left: '', right: rightLines[index] });
    else if (index >= rightLines.length) out.push({ kind: 'removed', left: leftLines[index], right: '' });
    else if (leftLines[index] === rightLines[index]) out.push({ kind: 'same', left: leftLines[index], right: rightLines[index] });
    else out.push({ kind: 'changed', left: leftLines[index], right: rightLines[index] });
  }
  return out;
}

export function CompareModal({ title, leftLabel, rightLabel, left, right, onClose }: CompareModalProps) {
  const leftJson = useMemo(() => formatJson(left), [left]);
  const rightJson = useMemo(() => formatJson(right), [right]);
  const diff = useMemo(() => buildLineDiff(leftJson.split('\n'), rightJson.split('\n')), [leftJson, rightJson]);

  const onCopy = () => {
    navigator.clipboard?.writeText(`# ${leftLabel}\n${leftJson}\n\n# ${rightLabel}\n${rightJson}`);
  };

  return (
    <Modal title={title} onClose={onClose}>
      <div className="zm-compare">
        <div className="zm-compare-head">
          <span className="zm-compare-label">{leftLabel}</span>
          <span className="zm-compare-arrow">→</span>
          <span className="zm-compare-label">{rightLabel}</span>
          <span className="flex-1" />
          <button className="zm-btn" onClick={onCopy}>
            <Icon name="clipboard" size={11} /> Copy both
          </button>
        </div>
        <div className="zm-compare-body">
          <div className="zm-compare-pane">
            {diff.map((line, index) => {
              const cls = line.kind === 'added' ? 'is-empty' : line.kind === 'removed' || line.kind === 'changed' ? 'is-rem' : 'is-same';
              return (
                <div key={`l-${index}`} className={`zm-compare-line ${cls}`}>
                  <span className="ln-no">{index + 1}</span>
                  <span className="ln-content">{line.left}</span>
                </div>
              );
            })}
          </div>
          <div className="zm-compare-pane">
            {diff.map((line, index) => {
              const cls = line.kind === 'removed' ? 'is-empty' : line.kind === 'added' || line.kind === 'changed' ? 'is-add' : 'is-same';
              return (
                <div key={`r-${index}`} className={`zm-compare-line ${cls}`}>
                  <span className="ln-no">{index + 1}</span>
                  <span className="ln-content">{line.right}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}

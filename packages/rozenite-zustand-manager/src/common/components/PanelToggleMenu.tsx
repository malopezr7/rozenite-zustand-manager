import { useEffect, useRef, useState } from 'react';
import type { IconName } from './Atoms';
import { Icon } from './Atoms';

export type PanelToggleEntry = {
  id: string;
  label: string;
  icon?: IconName;
  shortcut?: string;
  visible: boolean;
  onToggle: () => void;
};

export function PanelToggleMenu({ entries, className = '' }: { entries: PanelToggleEntry[]; className?: string }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={`zm-panel-toggle ${className}`}>
      <button type="button" className={`zm-icon-btn${open ? ' is-active' : ''}`} title="Show / hide panels" onClick={() => setOpen((current) => !current)}>
        <Icon name="panel" size={12} />
      </button>
      {open && (
        <div className="zm-panel-toggle-menu" role="menu">
          <div className="zm-panel-toggle-header">Panels</div>
          {entries.map((entry) => (
            <button
              key={entry.id}
              type="button"
              role="menuitemcheckbox"
              aria-checked={entry.visible}
              className="zm-panel-toggle-item"
              onClick={() => {
                entry.onToggle();
              }}
            >
              <Icon name={entry.icon ?? 'panel'} size={12} />
              <span className="zm-panel-toggle-label">{entry.label}</span>
              {entry.shortcut && <span className="zm-panel-toggle-shortcut">{entry.shortcut}</span>}
              <span className="zm-panel-toggle-check">{entry.visible ? <Icon name="check" size={12} /> : null}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

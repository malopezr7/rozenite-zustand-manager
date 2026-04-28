import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';

type Panel = {
  id: string;
  /** Initial weight (any number — only ratio between panels matters). */
  initial: number;
  /** Soft minimum in px. The panel can still shrink below this on extreme widths. */
  min?: number;
  content: ReactNode;
};

const SEPARATOR_PX = 6;
const DEFAULT_MIN_PX = 160;

export function ResizablePanels({ panels, className = '' }: { panels: Panel[]; className?: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragCleanupRef = useRef<(() => void) | null>(null);
  const [weights, setWeights] = useState<number[]>(() => panels.map((panel) => panel.initial));
  const [panelIds, setPanelIds] = useState<string[]>(() => panels.map((panel) => panel.id));

  const currentIds = panels.map((panel) => panel.id);
  if (currentIds.join('\0') !== panelIds.join('\0')) {
    const weightMap = new Map(panelIds.map((id, index) => [id, weights[index] as number]));
    setPanelIds(currentIds);
    setWeights(currentIds.map((id) => weightMap.get(id) ?? panels.find((panel) => panel.id === id)?.initial ?? 1));
  }

  const startResize = (index: number, pointerDown: React.PointerEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return;
    dragCleanupRef.current?.();
    const items = Array.from(container.querySelectorAll<HTMLDivElement>('[data-panel-item]'));
    const itemWidths = items.map((node) => node.getBoundingClientRect().width);
    const startX = pointerDown.clientX;
    const startLeftPx = itemWidths[index] ?? 0;
    const startRightPx = itemWidths[index + 1] ?? 0;
    const totalPx = startLeftPx + startRightPx;
    const minLeftPx = panels[index].min ?? DEFAULT_MIN_PX;
    const minRightPx = panels[index + 1].min ?? DEFAULT_MIN_PX;

    const move = (event: PointerEvent) => {
      if (totalPx <= 0) return;
      const delta = event.clientX - startX;
      const cappedMinLeft = Math.min(minLeftPx, totalPx / 2);
      const cappedMinRight = Math.min(minRightPx, totalPx / 2);
      const nextLeftPx = Math.max(cappedMinLeft, Math.min(totalPx - cappedMinRight, startLeftPx + delta));
      const ratio = nextLeftPx / totalPx;
      setWeights((current) => {
        const totalWeight = (current[index] ?? 0) + (current[index + 1] ?? 0);
        if (totalWeight <= 0) return current;
        return current.map((value, position) => {
          if (position === index) return totalWeight * ratio;
          if (position === index + 1) return totalWeight * (1 - ratio);
          return value;
        });
      });
    };
    const cleanup = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      document.body.style.removeProperty('cursor');
      document.body.style.removeProperty('user-select');
      dragCleanupRef.current = null;
    };
    const up = () => cleanup();
    dragCleanupRef.current = cleanup;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  useEffect(
    () => () => {
      dragCleanupRef.current?.();
      document.body.style.removeProperty('cursor');
      document.body.style.removeProperty('user-select');
    },
    [],
  );

  if (panels.length === 0) return null;

  const gridTemplate = weights.map((weight) => `minmax(0, ${Math.max(0.0001, weight)}fr)`).join(` ${SEPARATOR_PX}px `);

  return (
    <div ref={containerRef} className={`grid min-h-0 min-w-0 ${className}`} style={{ gridTemplateColumns: gridTemplate }}>
      {panels.map((panel, index) => (
        <div key={panel.id} className="contents">
          <div data-panel-item className="min-w-0 min-h-0 overflow-hidden">
            {panel.content}
          </div>
          {index < panels.length - 1 && (
            <div
              className="cursor-col-resize border-x border-[var(--line-1)] bg-[var(--bg-2)] hover:bg-[var(--accent-soft)]"
              onPointerDown={(event) => startResize(index, event)}
              role="separator"
              aria-orientation="vertical"
            />
          )}
        </div>
      ))}
    </div>
  );
}

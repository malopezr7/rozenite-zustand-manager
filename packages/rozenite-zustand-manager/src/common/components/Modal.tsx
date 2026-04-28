import type { ReactNode } from 'react';
import { Icon } from './Atoms';

export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-6" onClick={onClose}>
      <section
        className="flex max-h-[85vh] w-[min(860px,92vw)] flex-col overflow-hidden rounded-md border border-[var(--line-2)] bg-[var(--bg-1)] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex h-9 items-center gap-2 border-b border-[var(--line-1)] bg-[var(--bg-2)] px-3 text-xs uppercase tracking-[0.08em] text-[var(--fg-3)]">
          <span>{title}</span>
          <button className="ml-auto grid size-6 place-items-center rounded text-[var(--fg-3)] hover:bg-[var(--bg-3)] hover:text-[var(--fg-1)]" onClick={onClose} aria-label="Close modal">
            <Icon name="x" size={12} />
          </button>
        </header>
        <div className="min-h-0 overflow-auto p-3">{children}</div>
      </section>
    </div>
  );
}

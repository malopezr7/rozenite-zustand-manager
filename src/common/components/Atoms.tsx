import type { ReactNode } from 'react';

export type IconName =
  | 'chevron-right'
  | 'search'
  | 'store'
  | 'tree'
  | 'code'
  | 'table'
  | 'diff'
  | 'history'
  | 'edit'
  | 'trash'
  | 'play'
  | 'circle'
  | 'x'
  | 'check'
  | 'lock'
  | 'reset'
  | 'filter'
  | 'command'
  | 'info'
  | 'warn'
  | 'danger'
  | 'wrench'
  | 'clipboard'
  | 'more'
  | 'branch'
  | 'snapshot'
  | 'panel';

export function Icon({ name, size = 14 }: { name: IconName; size?: number }) {
  const props = { width: size, height: size, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (name) {
    case 'chevron-right':
      return (
        <svg {...props}>
          <polyline points="6,3 11,8 6,13" />
        </svg>
      );
    case 'search':
      return (
        <svg {...props}>
          <circle cx="7" cy="7" r="4.2" />
          <path d="M10 10l3.5 3.5" />
        </svg>
      );
    case 'store':
      return (
        <svg {...props}>
          <rect x="2.5" y="3.5" width="11" height="9" rx="1.2" />
          <path d="M2.5 6.5h11" />
        </svg>
      );
    case 'tree':
      return (
        <svg {...props}>
          <circle cx="3.5" cy="4" r="1.4" />
          <circle cx="12.5" cy="3" r="1.4" />
          <circle cx="12.5" cy="13" r="1.4" />
          <path d="M5 4h2.5c1 0 1.5.5 1.5 1.5V12c0 1 .5 1.5 1.5 1.5h.5" />
        </svg>
      );
    case 'code':
      return (
        <svg {...props}>
          <polyline points="5,5 2,8 5,11" />
          <polyline points="11,5 14,8 11,11" />
        </svg>
      );
    case 'table':
      return (
        <svg {...props}>
          <rect x="2.5" y="3.5" width="11" height="9" rx="1" />
          <path d="M2.5 7h11M6 3.5v9" />
        </svg>
      );
    case 'diff':
      return (
        <svg {...props}>
          <path d="M5 2v8M5 10l-2-2M5 10l2-2" />
          <path d="M11 14V6M11 6l2 2M11 6l-2 2" />
        </svg>
      );
    case 'history':
      return (
        <svg {...props}>
          <path d="M3 8a5 5 0 1 0 1.5-3.5" />
          <polyline points="2,3 2,5.5 4.5,5.5" />
          <path d="M8 5v3l2 1.5" />
        </svg>
      );
    case 'edit':
      return (
        <svg {...props}>
          <path d="M2.5 13.5h3l7-7-3-3-7 7v3z" />
        </svg>
      );
    case 'trash':
      return (
        <svg {...props}>
          <path d="M2.5 4.5h11M5 4.5V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1.5M4 4.5l.7 8.5a1 1 0 0 0 1 .9h4.6a1 1 0 0 0 1-.9l.7-8.5" />
        </svg>
      );
    case 'play':
      return (
        <svg {...props}>
          <polygon points="4,3 13,8 4,13" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'circle':
      return (
        <svg {...props}>
          <circle cx="8" cy="8" r="4" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'x':
      return (
        <svg {...props}>
          <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
        </svg>
      );
    case 'check':
      return (
        <svg {...props}>
          <polyline points="3,8.5 6.5,12 13,4" />
        </svg>
      );
    case 'lock':
      return (
        <svg {...props}>
          <rect x="3" y="7" width="10" height="7" rx="1" />
          <path d="M5 7V5a3 3 0 0 1 6 0v2" />
        </svg>
      );
    case 'reset':
      return (
        <svg {...props}>
          <path d="M14 8a6 6 0 1 1-1.8-4.3" />
          <polyline points="14,3 14,7 10,7" />
        </svg>
      );
    case 'filter':
      return (
        <svg {...props}>
          <path d="M2 3h12l-4.5 5.5V13l-3 1V8.5z" />
        </svg>
      );
    case 'command':
      return (
        <svg {...props}>
          <path d="M5 4.5a1.5 1.5 0 1 1 1.5 1.5H5V4.5zM5 11.5A1.5 1.5 0 1 0 6.5 10H5v1.5z" />
          <path d="M11 4.5A1.5 1.5 0 1 0 9.5 6H11V4.5zM11 11.5a1.5 1.5 0 1 1-1.5-1.5H11v1.5z" />
          <rect x="5" y="5" width="6" height="6" />
        </svg>
      );
    case 'info':
      return (
        <svg {...props}>
          <circle cx="8" cy="8" r="6" />
          <path d="M8 7v4M8 5v.01" />
        </svg>
      );
    case 'warn':
      return (
        <svg {...props}>
          <path d="M8 2l6.5 11.5h-13z" />
          <path d="M8 6.5v3M8 11.5v.01" />
        </svg>
      );
    case 'danger':
      return (
        <svg {...props}>
          <circle cx="8" cy="8" r="6" />
          <path d="M8 5v4M8 11v.01" />
        </svg>
      );
    case 'wrench':
      return (
        <svg {...props}>
          <path d="M9.5 6.5a3 3 0 1 0-3 3l-4 4 1.5 1.5 4-4a3 3 0 0 0 3-3l-1 1-1.5-1.5z" />
        </svg>
      );
    case 'clipboard':
      return (
        <svg {...props}>
          <rect x="4" y="3" width="8" height="11" rx="1" />
          <path d="M6 3v-.5C6 2 6.4 1.5 7 1.5h2c.6 0 1 .5 1 1V3" />
        </svg>
      );
    case 'more':
      return (
        <svg {...props}>
          <circle cx="3.5" cy="8" r="1" fill="currentColor" />
          <circle cx="8" cy="8" r="1" fill="currentColor" />
          <circle cx="12.5" cy="8" r="1" fill="currentColor" />
        </svg>
      );
    case 'branch':
      return (
        <svg {...props}>
          <circle cx="4" cy="4" r="1.6" />
          <circle cx="4" cy="12" r="1.6" />
          <circle cx="12" cy="6" r="1.6" />
          <path d="M4 5.6v4.8M5.4 6h2c1.4 0 2.6 1 2.6 2.4V4.5" />
        </svg>
      );
    case 'snapshot':
      return (
        <svg {...props}>
          <rect x="2" y="4.5" width="12" height="8.5" rx="1" />
          <circle cx="8" cy="8.7" r="2.4" />
          <path d="M5.5 4.5l1-1.5h3l1 1.5" />
        </svg>
      );
    case 'panel':
      return (
        <svg {...props}>
          <rect x="2" y="3" width="12" height="10" rx="1" />
          <path d="M10 3v10" />
        </svg>
      );
  }
}

export function Kbd({ children }: { children: ReactNode }) {
  return <span className="rounded border border-[var(--line-1)] bg-[var(--bg-3)] px-1 font-mono text-[10px] text-[var(--fg-3)] shadow-[inset_0_-1px_0_var(--line-2)]">{children}</span>;
}

export function TypeBadge({ type }: { type: string }) {
  return <span className={`zm-badge t-${type}`}>{type}</span>;
}

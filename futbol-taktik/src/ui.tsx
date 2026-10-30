import { useEffect, useState, type ReactNode } from 'react';
import { useStore } from './store';

export function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const paths: Record<string, string> = {
    home: 'M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z',
    board: 'M3 5h18v14H3zM12 5v14M12 12m-3 0a3 3 0 106 0a3 3 0 10-6 0',
    calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
    whistle: 'M4 14a5 5 0 1010 0 5 5 0 00-10 0zM9 9V5h12v4l-6 2',
    users: 'M9 11a4 4 0 100-8 4 4 0 000 8zM2 21v-1a6 6 0 0112 0v1M17 11a3 3 0 100-6M22 21v-1a5 5 0 00-4-4.9',
    gear: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-2.7 1.1V21a2 2 0 01-4 0v-.1a1.6 1.6 0 00-2.7-1.1l-.1.1a2 2 0 11-2.8-2.8l.1-.1A1.6 1.6 0 003 15H3a2 2 0 010-4h.1a1.6 1.6 0 001.1-2.7l-.1-.1a2 2 0 112.8-2.8l.1.1A1.6 1.6 0 009 4.6V3a2 2 0 014 0v.1a1.6 1.6 0 002.7 1.1l.1-.1a2 2 0 112.8 2.8l-.1.1a1.6 1.6 0 001.1 2.7H21a2 2 0 010 4h-.1a1.6 1.6 0 00-1.5 1.3z',
    play: 'M7 4l13 8-13 8z',
    pause: 'M7 4h4v16H7zM14 4h4v16h-4z',
    plus: 'M12 5v14M5 12h14',
    trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
    share: 'M18 8a3 3 0 100-6 3 3 0 000 6zM6 15a3 3 0 100-6 3 3 0 000 6zM18 22a3 3 0 100-6 3 3 0 000 6zM8.6 13.5l6.8 4M15.4 6.5l-6.8 4',
    expand: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
    close: 'M6 6l12 12M18 6L6 18',
    move: 'M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3',
    run: 'M4 20c4-1 6-5 9-9s5-6 7-6M20 5l-4 0M20 5l0 4',
    pass: 'M4 19L19 5M19 5h-6M19 5v6',
    dribble: 'M3 15l3-4 3 4 3-4 3 4 3-4 3 4',
    zone: 'M4 5h16v14H4z',
    line: 'M4 12h16',
    eraser: 'M16 3l5 5-11 11H5l-2-2 13-11zM9 19h12',
    prev: 'M15 18l-6-6 6-6',
    next: 'M9 18l6-6-6-6',
    copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
    upload: 'M12 16V4M7 9l5-5 5 5M4 20h16',
    present: 'M3 4h18v12H3zM12 16v4M8 20h8',
    flag: 'M5 21V4h11l-2 4 2 4H5',
    cast: 'M3 7V5h18v14h-7M3 11a8 8 0 018 8M3 15a4 4 0 014 4M3 19h.01',
    grip: 'M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01',
    undo: 'M9 14L4 9l5-5M4 9h11a5 5 0 010 10h-3',
    up: 'M6 15l6-6 6 6',
    down: 'M6 9l6 6 6-6',
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[name] ?? ''} />
    </svg>
  );
}

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' | 'plain'; icon?: string; size?: 'sm' | 'md' | 'lg' };
export function Btn({ variant = 'plain', icon, size = 'md', children, className = '', ...rest }: BtnProps) {
  return (
    <button type="button" className={`btn btn-${variant} btn-${size} ${className}`} {...rest}>
      {icon && <Icon name={icon} size={size === 'lg' ? 22 : size === 'sm' ? 15 : 18} />}
      {children && <span>{children}</span>}
    </button>
  );
}

/** confirm() artifact içinde çalışmaz; iki adımlı onay butonu */
export function ConfirmBtn({ onConfirm, children, label = 'Emin misiniz?', ...rest }: BtnProps & { onConfirm: () => void; label?: string }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3500);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <Btn
      {...rest}
      variant={armed ? 'danger' : rest.variant}
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else setArmed(true);
      }}
    >
      {armed ? label : children}
    </Btn>
  );
}

export function Field({ label, children, hint, wide }: { label: string; children: ReactNode; hint?: string; wide?: boolean }) {
  return (
    <label className={'field' + (wide ? ' wide' : '')}>
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export function Segmented<T extends string>({ value, options, onChange, id }: { value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void; id?: string }) {
  return (
    <div className="seg" role="tablist" id={id}>
      {options.map((o) => (
        <button key={o.value} type="button" role="tab" aria-selected={o.value === value} className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Modal({ title, onClose, children, footer, wide }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="modal-back" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={'modal' + (wide ? ' modal-wide' : '')} role="dialog" aria-label={title}>
        <header className="modal-head">
          <h2>{title}</h2>
          <Btn variant="ghost" icon="close" aria-label="Kapat" onClick={onClose} />
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-foot">{footer}</footer>}
      </div>
    </div>
  );
}

export function Pill({ tone = 'neutral', children }: { tone?: 'good' | 'warn' | 'bad' | 'neutral' | 'accent'; children: ReactNode }) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function Toasts() {
  const { toasts } = useStore();
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={'toast toast-' + t.tone}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

export async function copyText(text: string, fallbackEl?: HTMLElement | null) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    if (fallbackEl) {
      const r = document.createRange();
      r.selectNodeContents(fallbackEl);
      const s = window.getSelection();
      s?.removeAllRanges();
      s?.addRange(r);
    }
    return false;
  }
}

/** Ekran yansıtma / sunum için tam ekran (desteklenmezse sessizce geçer) */
export async function toggleFullscreen(el?: HTMLElement | null) {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await (el ?? document.documentElement).requestFullscreen();
  } catch {
    /* tam ekran izni yok */
  }
}

/** Metin alanı – satır listesi dönüştürücü */
export const lines = (s: string) =>
  s
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean);

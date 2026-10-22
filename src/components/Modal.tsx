import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';

export function Modal({
  title,
  subtitle,
  onClose,
  children,
  narrow = false,
  className = '',
  dismissable = true,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  narrow?: boolean;
  className?: string;
  dismissable?: boolean;
}) {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    (ref.current?.querySelector<HTMLElement>('[data-autofocus]') ?? ref.current)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissable) close.current();
      if (e.key === 'Tab' && ref.current) {
        // Keep keyboard focus inside the dialog.
        const items = [...ref.current.querySelectorAll<HTMLElement>('button, input, [tabindex="0"]')].filter((el) => !el.hasAttribute('disabled'));
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [dismissable]);

  return (
    <div className="modal-backdrop" onPointerDown={(e) => dismissable && e.target === e.currentTarget && onClose()}>
      <div ref={ref} className={`modal${narrow ? ' narrow' : ''} ${className}`} role="dialog" aria-modal="true" aria-labelledby={id} tabIndex={-1}>
        <div className="modal-head">
          <div>
            <h2 id={id}>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          {dismissable && (
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          )}
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 520,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto p-6 sm:items-center"
      style={{ background: "rgba(4,7,14,0.6)", backdropFilter: "blur(6px)" }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="panel animate-pop my-auto w-full overflow-hidden"
        style={{ maxWidth: width, boxShadow: "var(--shadow-pop)" }}
        role="dialog"
        aria-modal="true"
      >
        <header className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] px-5 py-4">
          <div>
            <h3 className="text-base text-[var(--color-fg)]">{title}</h3>
            {subtitle && <p className="mt-0.5 text-xs text-[var(--color-faint)]">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-lg text-[var(--color-faint)] transition-colors hover:bg-[var(--color-surface-3)] hover:text-[var(--color-fg)]"
          >
            <X size={16} />
          </button>
        </header>
        <div className="px-5 py-5">{children}</div>
        {footer && (
          <footer className="flex justify-end gap-2 border-t border-[var(--color-border)] bg-[var(--color-overlay)] px-5 py-3.5">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}

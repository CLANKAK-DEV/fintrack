import { useEffect } from "react";
import { Check, Info, AlertTriangle, X } from "lucide-react";
import { useToast, type Toast } from "../../store/useToast";

const META: Record<Toast["kind"], { color: string; icon: React.ReactNode }> = {
  success: { color: "var(--color-positive)", icon: <Check size={15} /> },
  info: { color: "var(--color-info)", icon: <Info size={15} /> },
  danger: { color: "var(--color-negative)", icon: <AlertTriangle size={15} /> },
};

export function ToastHost() {
  const toasts = useToast((s) => s.toasts);
  const dismiss = useToast((s) => s.dismiss);

  return (
    <div
      className="pointer-events-none fixed bottom-5 right-5 z-[200] flex w-[340px] flex-col gap-2.5"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
      ))}
    </div>
  );
}

function ToastCard({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const meta = META[toast.kind];

  useEffect(() => {
    const id = setTimeout(onDismiss, toast.duration);
    return () => clearTimeout(id);
  }, [toast.duration, onDismiss]);

  return (
    <div
      className="glass animate-pop pointer-events-auto flex items-center gap-3 rounded-xl px-3.5 py-3"
      style={{ boxShadow: "var(--shadow-pop)" }}
      role="status"
    >
      <span
        className="grid h-7 w-7 shrink-0 place-items-center rounded-lg"
        style={{ color: meta.color, background: `color-mix(in oklab, ${meta.color} 16%, transparent)` }}
      >
        {meta.icon}
      </span>
      <span className="flex-1 text-sm text-[var(--color-fg)]">{toast.message}</span>
      {toast.actionLabel && toast.onAction && (
        <button
          onClick={() => {
            toast.onAction!();
            onDismiss();
          }}
          className="num shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors"
          style={{ color: meta.color, background: `color-mix(in oklab, ${meta.color} 14%, transparent)` }}
        >
          {toast.actionLabel}
        </button>
      )}
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-[var(--color-faint)] transition-colors hover:bg-[var(--color-surface-3)] hover:text-[var(--color-fg)]"
      >
        <X size={13} />
      </button>
    </div>
  );
}

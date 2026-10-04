import { type ReactNode } from "react";
import { Delta } from "./index";

export function StatTile({
  label,
  value,
  delta,
  icon,
  accent = "var(--color-fg)",
  footer,
  glow,
}: {
  label: string;
  value: ReactNode;
  delta?: number;
  icon?: ReactNode;
  accent?: string;
  footer?: ReactNode;
  glow?: string;
}) {
  return (
    <div className="panel relative overflow-hidden p-4">
      {glow && (
        <div
          className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full blur-2xl"
          style={{ background: glow, opacity: 0.22 }}
        />
      )}
      <div className="mb-3 flex items-center justify-between">
        <span className="label mb-0">{label}</span>
        {icon && (
          <span
            className="grid h-7 w-7 place-items-center rounded-lg"
            style={{ color: accent, background: "var(--color-surface-3)" }}
          >
            {icon}
          </span>
        )}
      </div>
      <div className="num text-2xl font-bold leading-none tracking-tight" style={{ color: accent }}>
        {value}
      </div>
      <div className="mt-2.5 flex items-center gap-2">
        {typeof delta === "number" && <Delta value={delta} />}
        {footer && <span className="text-xs text-[var(--color-faint)]">{footer}</span>}
      </div>
    </div>
  );
}

import { type ReactNode } from "react";
import { pct } from "../../lib/format";

/* ---------- Panel ---------- */
export function Panel({
  children,
  className = "",
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section className={`panel ${padded ? "p-5" : ""} ${className}`}>{children}</section>
  );
}

export function SectionTitle({
  title,
  subtitle,
  icon,
  action,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex items-center gap-2.5">
        {icon && <span className="text-[var(--color-muted)]">{icon}</span>}
        <div>
          <h3 className="text-[15px] leading-tight text-[var(--color-fg)]">{title}</h3>
          {subtitle && (
            <p className="mt-0.5 text-xs text-[var(--color-faint)]">{subtitle}</p>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}

/* ---------- Delta badge ---------- */
export function Delta({ value, suffix = "" }: { value: number; suffix?: string }) {
  const up = value >= 0;
  const color = up ? "var(--color-positive)" : "var(--color-negative)";
  return (
    <span
      className="num inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
      style={{ color, background: up ? "rgba(52,211,153,0.12)" : "rgba(251,113,133,0.12)" }}
    >
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path
          d={up ? "M5 1.5 L8.5 6 H1.5 Z" : "M5 8.5 L1.5 4 H8.5 Z"}
          fill={color}
        />
      </svg>
      {pct(value)}
      {suffix}
    </span>
  );
}

/* ---------- Badge / Chip ---------- */
export function Badge({
  children,
  color,
  tint,
}: {
  children: ReactNode;
  color?: string;
  tint?: string;
}) {
  return (
    <span
      className="chip num"
      style={color ? { color, background: tint, borderColor: "transparent" } : undefined}
    >
      {children}
    </span>
  );
}

/* ---------- Empty state ---------- */
export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-faint)]">
        {icon}
      </div>
      <div>
        <p className="font-medium text-[var(--color-fg)]">{title}</p>
        {hint && <p className="mt-1 text-sm text-[var(--color-faint)]">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

/* ---------- Progress ring ---------- */
export function ProgressRing({
  value,
  size = 56,
  stroke = 6,
  color = "var(--color-primary)",
  label,
}: {
  value: number; // 0..1
  size?: number;
  stroke?: number;
  color?: string;
  label?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-surface-3)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped)}
          style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.16,1,0.3,1)" }}
        />
      </svg>
      {label && (
        <div className="absolute inset-0 grid place-items-center">
          <span className="num text-sm font-semibold">{label}</span>
        </div>
      )}
    </div>
  );
}

/* ---------- Segmented control ---------- */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-[10px] border border-[var(--color-border)] bg-[var(--color-overlay)] p-0.5">
      {options.map((o) => {
        const active = o === value;
        return (
          <button
            key={o}
            onClick={() => onChange(o)}
            className="num rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
            style={{
              background: active ? "var(--color-surface-3)" : "transparent",
              color: active ? "var(--color-fg)" : "var(--color-faint)",
              boxShadow: active ? "0 1px 0 rgba(255,255,255,0.05) inset" : "none",
            }}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Toggle ---------- */
export function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative h-6 w-11 rounded-full transition-colors"
      style={{ background: checked ? "var(--color-primary)" : "var(--color-surface-3)" }}
    >
      <span
        className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform"
        style={{ transform: checked ? "translateX(22px)" : "translateX(2px)" }}
      />
    </button>
  );
}

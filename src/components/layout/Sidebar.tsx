import {
  LayoutDashboard,
  Wallet2,
  Repeat,
  ListChecks,
  CalendarDays,
  LineChart,
  Settings as SettingsIcon,
} from "lucide-react";
import { useStore, type View } from "../../store/useStore";

const NAV: { view: View; label: string; icon: React.ReactNode; group?: string }[] = [
  { view: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
  { view: "finance", label: "Finance", icon: <Wallet2 size={18} /> },
  { view: "subscriptions", label: "Subscriptions", icon: <Repeat size={18} /> },
  { view: "tasks", label: "Tasks", icon: <ListChecks size={18} /> },
  { view: "calendar", label: "Calendar", icon: <CalendarDays size={18} /> },
  { view: "analytics", label: "Analytics", icon: <LineChart size={18} /> },
];

export function Sidebar() {
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  const usingSqlite = useStore((s) => s.usingSqlite);

  return (
    <aside className="flex w-[232px] shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-overlay)]/60">
      {/* section label */}
      <div className="px-6 pb-1.5 pt-5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-faint)]">
          Menu
        </span>
      </div>

      {/* nav */}
      <nav className="flex-1 space-y-0.5 px-3 py-1">
        {NAV.map((item) => {
          const active = item.view === view;
          return (
            <button
              key={item.view}
              onClick={() => setView(item.view)}
              className="group relative flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium transition-colors"
              style={{
                background: active ? "var(--color-surface-2)" : "transparent",
                color: active ? "var(--color-fg)" : "var(--color-muted)",
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.background = "var(--color-surface)";
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.background = "transparent";
              }}
            >
              {active && (
                <span
                  className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full"
                  style={{ background: "var(--color-primary)" }}
                />
              )}
              <span style={{ color: active ? "var(--color-primary)" : "inherit" }}>{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* footer */}
      <div className="px-3 pb-3">
        <button
          onClick={() => setView("settings")}
          className="flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium transition-colors"
          style={{
            background: view === "settings" ? "var(--color-surface-2)" : "transparent",
            color: view === "settings" ? "var(--color-fg)" : "var(--color-muted)",
          }}
        >
          <SettingsIcon size={18} style={{ color: view === "settings" ? "var(--color-primary)" : "inherit" }} />
          Settings
        </button>
        <div className="mt-2 flex items-center gap-2 px-3 py-2 text-[10px] text-[var(--color-faint)]">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: "var(--color-positive)" }}
          />
          {usingSqlite ? "SQLite · local" : "Browser · local"} · offline
        </div>
      </div>
    </aside>
  );
}

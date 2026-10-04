import { Plus, Sparkles } from "lucide-react";
import { useStore, type View } from "../../store/useStore";
import { labelFull } from "../../lib/date";
import { NotificationBell } from "../NotificationBell";

const TITLES: Record<View, string> = {
  dashboard: "Dashboard",
  finance: "Finance",
  subscriptions: "Subscriptions",
  tasks: "Tasks",
  calendar: "Calendar",
  analytics: "Analytics",
  settings: "Settings",
};

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Burning the midnight oil";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export function Topbar() {
  const view = useStore((s) => s.view);
  const name = useStore((s) => s.settings.displayName);
  const openQuickAdd = useStore((s) => s.openQuickAdd);
  const today = labelFull(new Date().toISOString().slice(0, 10));

  return (
    <header className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] px-7 py-4">
      <div>
        {view === "dashboard" ? (
          <h1 className="text-xl font-bold tracking-tight">
            {greeting()}
            {name.trim() && (
              <>
                , <span style={{ color: "var(--color-primary)" }}>{name}</span>
              </>
            )}
          </h1>
        ) : (
          <h1 className="text-xl font-bold tracking-tight">{TITLES[view]}</h1>
        )}
        <p className="mt-0.5 text-xs text-[var(--color-faint)]">{today}</p>
      </div>

      <div className="flex items-center gap-2.5">
        <div className="chip hidden sm:flex">
          <Sparkles size={13} style={{ color: "var(--color-accent)" }} />
          V1 · Core
        </div>
        <NotificationBell />
        <button className="btn btn-primary" onClick={() => openQuickAdd()}>
          <Plus size={16} strokeWidth={2.5} />
          Quick Add
          <kbd className="num ml-1 rounded bg-black/15 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide">
            N
          </kbd>
        </button>
      </div>
    </header>
  );
}

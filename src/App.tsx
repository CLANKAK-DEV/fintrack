import { useEffect } from "react";
import { useStore, type View } from "./store/useStore";
import { runPaymentReminders } from "./lib/reminders";
import { TitleBar } from "./components/layout/TitleBar";
import { Sidebar } from "./components/layout/Sidebar";
import { Topbar } from "./components/layout/Topbar";
import { ToastHost } from "./components/ui/ToastHost";
import { TransactionModal } from "./components/TransactionModal";
import { Dashboard } from "./pages/Dashboard";
import { Finance } from "./pages/Finance";
import { Subscriptions } from "./pages/Subscriptions";
import { Tasks } from "./pages/Tasks";
import { Calendar } from "./pages/Calendar";
import { Analytics } from "./pages/Analytics";
import { Settings } from "./pages/Settings";

const NAV_ORDER: View[] = [
  "dashboard",
  "finance",
  "subscriptions",
  "tasks",
  "calendar",
  "analytics",
  "settings",
];

export default function App() {
  const ready = useStore((s) => s.ready);
  const view = useStore((s) => s.view);
  const init = useStore((s) => s.init);
  const setView = useStore((s) => s.setView);
  const quickAdd = useStore((s) => s.quickAdd);
  const openQuickAdd = useStore((s) => s.openQuickAdd);
  const closeQuickAdd = useStore((s) => s.closeQuickAdd);
  const subscriptions = useStore((s) => s.subscriptions);

  useEffect(() => {
    init();
  }, [init]);

  // fire desktop payment reminders shortly after launch (once data is loaded)
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => runPaymentReminders(subscriptions), 2500);
    return () => clearTimeout(t);
  }, [ready, subscriptions]);

  // global keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      const typing =
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.tagName === "SELECT" ||
          el.isContentEditable);
      const mod = e.ctrlKey || e.metaKey;

      // Ctrl/Cmd+K or plain "n" → Quick Add
      if ((mod && e.key.toLowerCase() === "k") || (!mod && !typing && e.key.toLowerCase() === "n")) {
        e.preventDefault();
        openQuickAdd();
        return;
      }
      // Ctrl/Cmd+1..8 → navigate
      if (mod && /^[1-8]$/.test(e.key)) {
        e.preventDefault();
        setView(NAV_ORDER[Number(e.key) - 1]);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openQuickAdd, setView]);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <TitleBar />
      {!ready ? (
        <Splash />
      ) : (
        <div className="flex min-h-0 flex-1">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar />
            <main className="flex-1 overflow-y-auto px-7 py-6">
              <div key={view} className="animate-rise mx-auto max-w-[1400px]">
                {view === "dashboard" && <Dashboard />}
                {view === "finance" && <Finance />}
                {view === "subscriptions" && <Subscriptions />}
                {view === "tasks" && <Tasks />}
                {view === "calendar" && <Calendar />}
                {view === "analytics" && <Analytics />}
                {view === "settings" && <Settings />}
              </div>
            </main>
          </div>
        </div>
      )}

      {/* global singletons */}
      <TransactionModal open={quickAdd.open} defaultType={quickAdd.type} onClose={closeQuickAdd} />
      <ToastHost />
    </div>
  );
}

function Splash() {
  return (
    <div className="grid flex-1 place-items-center">
      <div className="animate-fade flex flex-col items-center gap-4">
        <div
          className="grid h-14 w-14 place-items-center rounded-2xl"
          style={{
            background: "linear-gradient(135deg, var(--color-primary), #ff9f1c)",
            boxShadow: "0 12px 30px -10px rgba(245,181,68,0.6)",
            animation: "drift 3s ease-in-out infinite",
          }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <path d="M8 6 L4 12 L8 18 M16 6 L20 12 L16 18" stroke="#1a1206" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="text-center">
          <div className="font-display text-lg font-bold">FinTrack</div>
          <div className="text-xs text-[var(--color-faint)]">Loading your command center…</div>
        </div>
      </div>
    </div>
  );
}

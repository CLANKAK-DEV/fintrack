import { useEffect, useState } from "react";
import { Minus, Square, Copy, X, Command } from "lucide-react";
import { isTauri } from "../../lib/db/Database";

/** Frameless-window title bar: brand on the left, a draggable middle, and
 *  native window controls on the right. In a plain browser (dev preview) the
 *  controls are hidden and the bar is purely decorative. */
export function TitleBar() {
  const tauri = isTauri();
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    if (!tauri) return;
    let unlisten: (() => void) | undefined;
    (async () => {
      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        const w = getCurrentWindow();
        setMaximized(await w.isMaximized());
        unlisten = await w.onResized(async () => setMaximized(await w.isMaximized()));
      } catch {
        /* ignore */
      }
    })();
    return () => unlisten?.();
  }, [tauri]);

  async function ctl(action: "min" | "max" | "close") {
    if (!tauri) return;
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const w = getCurrentWindow();
      if (action === "min") await w.minimize();
      else if (action === "max") await w.toggleMaximize();
      else await w.close();
    } catch {
      /* ignore */
    }
  }

  return (
    <div
      data-tauri-drag-region
      className="glass flex h-9 shrink-0 select-none items-center justify-between border-b border-[var(--color-border)] pl-3.5"
      style={{ WebkitUserSelect: "none" }}
    >
      {/* brand */}
      <div data-tauri-drag-region className="pointer-events-none flex items-center gap-2">
        <span
          className="grid h-5 w-5 place-items-center rounded-md"
          style={{ background: "linear-gradient(135deg, var(--color-primary), #ff9f1c)" }}
        >
          <Command size={11} color="#1a1206" strokeWidth={3} />
        </span>
        <span className="font-display text-xs font-semibold tracking-tight text-[var(--color-fg)]">FinTrack</span>
        <span className="text-[10px] text-[var(--color-faint)]">Finance Tracker</span>
      </div>

      {/* window controls */}
      {tauri ? (
        <div className="flex items-center">
          <WinBtn label="Minimize" onClick={() => ctl("min")}>
            <Minus size={15} />
          </WinBtn>
          <WinBtn label={maximized ? "Restore" : "Maximize"} onClick={() => ctl("max")}>
            {maximized ? <Copy size={12} /> : <Square size={12} />}
          </WinBtn>
          <WinBtn label="Close" danger onClick={() => ctl("close")}>
            <X size={15} />
          </WinBtn>
        </div>
      ) : (
        <span className="px-3 text-[10px] text-[var(--color-faint)]">web preview</span>
      )}
    </div>
  );
}

function WinBtn({
  children,
  onClick,
  label,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid h-9 w-11 place-items-center text-[var(--color-muted)] transition-colors"
      style={{ WebkitUserSelect: "none" }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = danger ? "var(--color-negative)" : "var(--color-surface-3)";
        e.currentTarget.style.color = danger ? "#fff" : "var(--color-fg)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = "var(--color-muted)";
      }}
    >
      {children}
    </button>
  );
}

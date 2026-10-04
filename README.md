# FinTrack — Personal Finance & Productivity Command Center

A clean, **local-first desktop app** to track the money you make and spend, your subscriptions, tasks, and daily/monthly analytics — all from one dark, modern dashboard. Everything is stored **offline on your own computer**.

Built with **Tauri 2 · React · TypeScript · Vite · Tailwind CSS v4** and a local **SQLite** database.

---

## ✨ Features

- **Dashboard** — net profit (all-time / this month / today), a 30-day profit chart, today's tasks, upcoming subscriptions and recent activity at a glance.
- **Finance** — a full ledger of income, expenses, transfers, withdrawals and deposits. Grouped by day, filterable by type, searchable, with a withdrawals ledger (profit · withdrawn · remaining).
- **Subscriptions** — recurring payments with normalized monthly/yearly cost and upcoming renewals.
- **Tasks** — one-time / daily / weekly / monthly to-dos with times and a completion ring.
- **Calendar** — a month grid showing each day's net profit; click a day for a full breakdown.
- **Analytics** — profit trend (7D/30D/3M/1Y/ALL), income-vs-expense bars, category donuts, best/worst/average day.
- **Payment reminders** — a notification bell plus real desktop notifications when a subscription is due in 7 / 3 / 1 / 0 days, with a one-click **Mark paid**.
- **Quick Add & shortcuts** — press `N` to add a transaction, `Ctrl/Cmd + 1–6` to switch pages.
- **Backup** — export all your data to a JSON file any time (Settings → Export backup).

### The one rule that keeps your numbers correct
> **Profit = Income − Expenses.**
> Transfers, withdrawals and deposits are treated as **movements** between your own accounts — they are never counted as profit, so moving money around never inflates your earnings.

---

## 🖥️ Download & run (no coding needed)

Grab the latest installer from the [**Releases**](../../releases) page and run it:

- **Windows:** `FinTrack_x.x.x_x64-setup.exe` → double-click → Next → Finish. Launch from the Start Menu.

That's it. The app runs fully offline; your data stays on your machine.

> No release yet? Build it yourself with the steps below — it takes one command.

---

## 🛠️ Run from source

### 1. Prerequisites (one-time setup)

| Tool | Why | Install |
|------|-----|---------|
| **Node.js 18+** | runs the UI build | https://nodejs.org |
| **Rust** | builds the desktop app | https://rustup.rs |
| **OS build tools** | Tauri requirement | See https://v2.tauri.app/start/prerequisites — on **Windows 11** you only need the **Microsoft C++ Build Tools** (WebView2 is already installed). |

### 2. Get the code & install

```bash
git clone https://github.com/<your-username>/fintrack.git
cd fintrack
npm install
```

### 3. Run it

```bash
# Run the full desktop app (recommended)
npm run app:dev

# …or just preview the UI in your browser (no Rust needed)
npm run dev        # then open http://localhost:1420
```

### 4. Build an installer to share

```bash
npm run app:build
```

The installer is created at:

```
src-tauri/target/release/bundle/
```

(On Windows that's an `.exe` setup under `bundle/nsis/`.)

---

## 💾 Where your data lives

Everything is saved in a single local **SQLite** file — nothing is ever uploaded:

- **Windows:** `%APPDATA%\com.fintrack.app\fintrack.db`
- **macOS:** `~/Library/Application Support/com.fintrack.app/fintrack.db`
- **Linux:** `~/.config/com.fintrack.app/fintrack.db`

You can back it up any time from **Settings → Export backup (JSON)**.

---

## 🧱 Tech & project structure

```
src/
├─ lib/
│  ├─ db/            local database layer (SQLite + browser fallback)
│  ├─ finance.ts     pure profit/aggregation engine
│  ├─ reminders.ts   payment reminders & notifications
│  ├─ date.ts · format.ts · theme.ts
│  ├─ store/useStore.ts   app state (Zustand)
├─ components/       UI primitives, charts, modals, layout
└─ pages/            Dashboard · Finance · Subscriptions · Tasks · Calendar · Analytics · Settings

src-tauri/           Rust desktop shell (Tauri 2)
```

In the browser it uses `localStorage`; in the packaged desktop app it uses **SQLite**. The finance logic is pure TypeScript shared by both.

---

## 📜 License

[MIT](LICENSE) — free to use, modify and share.

---

Made with FinTrack. Contributions and ideas welcome — open an issue or a pull request.

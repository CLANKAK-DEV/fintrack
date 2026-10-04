import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, ListChecks, Clock } from "lucide-react";
import { useStore } from "../store/useStore";
import { Panel, SectionTitle, EmptyState, Segmented, ProgressRing, Badge } from "../components/ui";
import { Modal } from "../components/ui/Modal";
import { Field, Select, TextInput } from "../components/ui/Field";
import { todayISO } from "../lib/date";
import { toast } from "../store/useToast";
import type { Recurrence, Task } from "../lib/db/types";
import { uid } from "../lib/id";

const RECURRENCES: Recurrence[] = ["once", "daily", "weekly", "monthly"];
const REC_LABEL: Record<Recurrence, string> = { once: "One-time", daily: "Daily", weekly: "Weekly", monthly: "Monthly" };
const FILTERS = ["Today", "Daily", "Weekly", "Monthly", "All"] as const;
type Filter = (typeof FILTERS)[number];

export function Tasks() {
  const { tasks, saveTask, toggleTask, removeTask } = useStore();
  const [filter, setFilter] = useState<Filter>("Today");

  const deleteTask = (t: Task) => {
    removeTask(t.id);
    toast.undo("Task deleted", () => saveTask(t));
  };
  const [modal, setModal] = useState<{ open: boolean; editing: Task | null }>({ open: false, editing: null });

  const visible = useMemo(() => {
    const today = todayISO();
    let list = tasks;
    if (filter === "Today") list = tasks.filter((t) => t.recurrence === "daily" || t.date === today);
    else if (filter !== "All") list = tasks.filter((t) => t.recurrence === filter.toLowerCase());
    return [...list].sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      return (a.time || "99:99").localeCompare(b.time || "99:99");
    });
  }, [tasks, filter]);

  const done = visible.filter((t) => t.done).length;

  return (
    <div className="space-y-5">
      <Panel padded={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <SectionTitle
            title="Tasks & Planner"
            subtitle="One-time, daily, weekly & monthly routines"
            icon={<ListChecks size={16} />}
          />
          <div className="flex items-center gap-3">
            <ProgressRing
              value={visible.length ? done / visible.length : 0}
              size={40}
              stroke={4}
              color="var(--color-positive)"
              label={<span className="text-[10px]">{done}/{visible.length}</span>}
            />
            <button className="btn btn-primary h-9" onClick={() => setModal({ open: true, editing: null })}>
              <Plus size={15} strokeWidth={2.5} /> Add
            </button>
          </div>
        </div>

        <div className="px-5 pb-3">
          <Segmented options={FILTERS} value={filter} onChange={setFilter} />
        </div>

        <div className="px-3 pb-4">
          {visible.length === 0 ? (
            <EmptyState
              icon={<ListChecks size={22} />}
              title="Nothing here yet"
              hint="Add a task or a recurring routine."
              action={
                <button className="btn btn-ghost" onClick={() => setModal({ open: true, editing: null })}>
                  <Plus size={15} /> New task
                </button>
              }
            />
          ) : (
            <div className="space-y-1">
              {visible.map((t) => (
                <div key={t.id} className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-[var(--color-surface-2)]">
                  <button
                    onClick={() => toggleTask(t.id)}
                    aria-label={t.done ? "Mark incomplete" : "Mark complete"}
                    className="grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-all"
                    style={{
                      borderColor: t.done ? "var(--color-positive)" : "var(--color-border)",
                      background: t.done ? "var(--color-positive)" : "transparent",
                    }}
                  >
                    {t.done && (
                      <svg width="11" height="11" viewBox="0 0 12 12">
                        <path d="M2.5 6 L5 8.5 L9.5 3.5" stroke="#06231a" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className={`text-sm font-medium ${t.done ? "text-[var(--color-faint)] line-through" : ""}`}>
                      {t.title}
                    </div>
                  </div>
                  {t.time && (
                    <span className="num flex items-center gap-1 text-[11px] text-[var(--color-faint)]">
                      <Clock size={11} /> {t.time}
                    </span>
                  )}
                  <Badge>{REC_LABEL[t.recurrence]}</Badge>
                  <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <button onClick={() => setModal({ open: true, editing: t })} aria-label="Edit" className="grid h-7 w-7 place-items-center rounded-md text-[var(--color-faint)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-fg)]">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => deleteTask(t)} aria-label="Delete" className="grid h-7 w-7 place-items-center rounded-md text-[var(--color-faint)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-negative)]">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Panel>

      <TaskModal
        open={modal.open}
        editing={modal.editing}
        onClose={() => setModal((m) => ({ ...m, open: false }))}
        onSave={saveTask}
      />
    </div>
  );
}

function TaskModal({
  open,
  editing,
  onClose,
  onSave,
}: {
  open: boolean;
  editing: Task | null;
  onClose: () => void;
  onSave: (t: Task) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [recurrence, setRecurrence] = useState<Recurrence>("daily");
  const [time, setTime] = useState("");
  const [date, setDate] = useState(todayISO());

  useEffect(() => {
    if (!open) return;
    setTitle(editing?.title ?? "");
    setRecurrence(editing?.recurrence ?? "daily");
    setTime(editing?.time ?? "");
    setDate(editing?.date ?? todayISO());
  }, [open, editing]);

  const valid = title.trim().length > 0;

  async function submit() {
    if (!valid) return;
    await onSave({
      id: editing?.id ?? uid(),
      title: title.trim(),
      recurrence,
      time,
      done: editing?.done ?? false,
      date,
      createdAt: editing?.createdAt ?? Date.now(),
    });
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit task" : "New task"}
      width={500}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={submit} disabled={!valid}>
            {editing ? "Save" : "Add task"}
          </button>
        </>
      }
    >
      <Field label="Task">
        <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Check wallet activity" autoFocus />
      </Field>
      <div className="mt-4 grid grid-cols-3 gap-4">
        <Field label="Repeat">
          <Select value={recurrence} onChange={(e) => setRecurrence(e.target.value as Recurrence)}>
            {RECURRENCES.map((r) => (
              <option key={r} value={r}>
                {REC_LABEL[r]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Time">
          <TextInput type="time" value={time} onChange={(e) => setTime(e.target.value)} className="num" />
        </Field>
        <Field label="Date">
          <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} className="num" />
        </Field>
      </div>
    </Modal>
  );
}

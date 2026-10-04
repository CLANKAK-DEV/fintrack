import { create } from "zustand";
import { uid } from "../lib/id";

export type ToastKind = "success" | "info" | "danger";

export interface Toast {
  id: string;
  message: string;
  kind: ToastKind;
  /** optional action button, e.g. Undo */
  actionLabel?: string;
  onAction?: () => void;
  duration: number;
}

interface ToastState {
  toasts: Toast[];
  push: (t: Omit<Toast, "id" | "duration"> & { duration?: number }) => string;
  dismiss: (id: string) => void;
}

export const useToast = create<ToastState>((set) => ({
  toasts: [],
  push: (t) => {
    const id = uid();
    const duration = t.duration ?? (t.actionLabel ? 5000 : 3000);
    set((s) => ({ toasts: [...s.toasts, { ...t, id, duration }] }));
    return id;
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}));

/* convenience helpers */
export const toast = {
  success: (message: string) => useToast.getState().push({ message, kind: "success" }),
  info: (message: string) => useToast.getState().push({ message, kind: "info" }),
  danger: (message: string) => useToast.getState().push({ message, kind: "danger" }),
  /** deletion toast with an Undo action */
  undo: (message: string, onAction: () => void) =>
    useToast.getState().push({ message, kind: "info", actionLabel: "Undo", onAction }),
};

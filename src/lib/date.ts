import {
  addDays,
  differenceInCalendarDays,
  endOfMonth,
  format,
  isSameDay,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";

export const todayISO = () => format(new Date(), "yyyy-MM-dd");
export const iso = (d: Date) => format(d, "yyyy-MM-dd");
export const parse = (s: string) => parseISO(s);

export function labelDay(s: string) {
  return format(parseISO(s), "MMM d");
}
export function labelFull(s: string) {
  return format(parseISO(s), "EEEE, MMMM d, yyyy");
}
export function labelMonth(d: Date) {
  return format(d, "MMMM yyyy");
}

export { addDays, differenceInCalendarDays, endOfMonth, isSameDay, startOfMonth, startOfWeek, format };

/** inclusive list of ISO dates between two dates */
export function dateRange(from: Date, to: Date): string[] {
  const out: string[] = [];
  const n = differenceInCalendarDays(to, from);
  for (let i = 0; i <= n; i++) out.push(iso(addDays(from, i)));
  return out;
}

/** days until an ISO date (negative = overdue) */
export function daysUntil(isoDate: string): number {
  return differenceInCalendarDays(parseISO(isoDate), new Date());
}

export function relativeDue(isoDate: string): string {
  const d = daysUntil(isoDate);
  if (d < 0) return `${Math.abs(d)}d overdue`;
  if (d === 0) return "Today";
  if (d === 1) return "Tomorrow";
  if (d < 30) return `in ${d}d`;
  const months = Math.round(d / 30);
  return `in ${months}mo`;
}

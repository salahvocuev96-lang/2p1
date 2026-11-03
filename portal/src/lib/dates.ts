import type { ISODate } from "./types";

export const WEEKDAYS = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];
export const WEEKDAYS_SHORT = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
const MONTHS_GEN = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
export const MONTHS = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];

/** Время звонков (пары по 90 минут) */
export const BELLS = ["08:30-10:00", "10:10-11:40", "12:10-13:40", "13:50-15:20", "15:30-17:00", "17:10-18:40"];

export function toISO(d: Date): ISODate {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromISO(s: ISODate): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function today(): ISODate {
  return toISO(new Date());
}

export function addDays(s: ISODate, n: number): ISODate {
  const d = fromISO(s);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

/** 1 = понедельник ... 7 = воскресенье */
export function weekday(s: ISODate): number {
  const w = fromISO(s).getDay();
  return w === 0 ? 7 : w;
}

export function startOfWeek(s: ISODate): ISODate {
  return addDays(s, 1 - weekday(s));
}

export function formatLong(s: ISODate): string {
  const d = fromISO(s);
  return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`;
}

export function formatShort(s: ISODate): string {
  const d = fromISO(s);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function formatWithWeekday(s: ISODate): string {
  return `${WEEKDAYS[weekday(s) - 1] ?? "Воскресенье"}, ${formatLong(s)}`;
}

export function formatTime(ts: number): string {
  const d = new Date(ts);
  const sameDay = toISO(d) === today();
  const hm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return sameDay ? hm : `${formatShort(toISO(d))} ${hm}`;
}

export function* dateRange(from: ISODate, to: ISODate): Generator<ISODate> {
  for (let d = from; d <= to; d = addDays(d, 1)) yield d;
}

// ---- Учебные периоды ----

export type PeriodKind = "month" | "semester" | "year";

export interface Period {
  kind: PeriodKind;
  from: ISODate;
  to: ISODate;
  label: string;
}

/** Год начала учебного года: сентябрь 2026 -> 2026, март 2027 -> 2026 */
export function academicYear(s: ISODate): number {
  const d = fromISO(s);
  return d.getMonth() >= 8 ? d.getFullYear() : d.getFullYear() - 1;
}

export function yearPeriod(s: ISODate): Period {
  const y = academicYear(s);
  return { kind: "year", from: `${y}-09-01`, to: `${y + 1}-06-30`, label: `${y}/${y + 1} учебный год` };
}

export function semesterPeriod(s: ISODate): Period {
  const y = academicYear(s);
  const first = fromISO(s).getMonth() >= 8;
  return first
    ? { kind: "semester", from: `${y}-09-01`, to: `${y}-12-31`, label: "1 семестр" }
    : { kind: "semester", from: `${y + 1}-01-01`, to: `${y + 1}-06-30`, label: "2 семестр" };
}

export function monthPeriod(s: ISODate): Period {
  const d = fromISO(s);
  const from = toISO(new Date(d.getFullYear(), d.getMonth(), 1));
  const to = toISO(new Date(d.getFullYear(), d.getMonth() + 1, 0));
  return { kind: "month", from, to, label: MONTHS[d.getMonth()] };
}

export function periodFor(kind: PeriodKind, s: ISODate): Period {
  return kind === "month" ? monthPeriod(s) : kind === "semester" ? semesterPeriod(s) : yearPeriod(s);
}

export const inPeriod = (date: ISODate, p: Period) => date >= p.from && date <= p.to;

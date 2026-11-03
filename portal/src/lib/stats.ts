// Расчёт средних баллов: обычное арифметическое среднее.
import type { DB } from "./seed";
import type { AttendanceStatus, Grade, ID, ISODate } from "./types";
import { Period, inPeriod, dateRange, weekday } from "./dates";

export function average(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export const fmtAvg = (v: number | null) => (v === null ? "-" : v.toFixed(2).replace(".", ","));

export function gradesOf(db: DB, studentId: ID, opts: { subjectId?: ID; period?: Period } = {}): Grade[] {
  const out: Grade[] = [];
  for (const g of Object.values(db.grades)) {
    if (g.studentId !== studentId) continue;
    if (opts.subjectId && g.subjectId !== opts.subjectId) continue;
    if (opts.period && !inPeriod(g.date, opts.period)) continue;
    out.push(g);
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

export function studentAverage(db: DB, studentId: ID, opts: { subjectId?: ID; period?: Period } = {}) {
  return average(gradesOf(db, studentId, opts).map((g) => g.value));
}

/** Средний балл по каждому предмету студента */
export function subjectAverages(db: DB, studentId: ID, period?: Period) {
  const by = new Map<ID, number[]>();
  for (const g of gradesOf(db, studentId, { period })) by.set(g.subjectId, [...(by.get(g.subjectId) ?? []), g.value]);
  return by;
}

export function groupAverage(db: DB, groupId: ID, opts: { subjectId?: ID; period?: Period } = {}) {
  const ids = new Set(db.students.filter((s) => s.groupId === groupId).map((s) => s.id));
  const vals: number[] = [];
  for (const g of Object.values(db.grades)) {
    if (!ids.has(g.studentId)) continue;
    if (opts.subjectId && g.subjectId !== opts.subjectId) continue;
    if (opts.period && !inPeriod(g.date, opts.period)) continue;
    vals.push(g.value);
  }
  return average(vals);
}

/** Сколько занятий было у группы по расписанию в периоде (сдвоенная пара = 1 занятие) */
export function lessonsHeld(db: DB, groupId: ID, from: ISODate, to: ISODate, subjectId?: ID) {
  const list: { date: ISODate; subjectId: ID }[] = [];
  const byDay = new Map<number, Set<ID>>();
  db.schedule.filter((s) => s.groupId === groupId && (!subjectId || s.subjectId === subjectId)).forEach((s) => {
    if (!byDay.has(s.weekday)) byDay.set(s.weekday, new Set());
    byDay.get(s.weekday)!.add(s.subjectId);
  });
  for (const iso of dateRange(from, to)) {
    byDay.get(weekday(iso))?.forEach((sid) => list.push({ date: iso, subjectId: sid }));
  }
  return list;
}

export interface AttendanceSummary {
  total: number;
  present: number;
  late: number;
  absent: number;
  sick: number;
  rate: number; // % присутствия (опоздание считается присутствием)
}

export function attendanceSummary(db: DB, studentId: ID, period: Period, until: ISODate): AttendanceSummary {
  const st = db.students.find((s) => s.id === studentId);
  const res: AttendanceSummary = { total: 0, present: 0, late: 0, absent: 0, sick: 0, rate: 100 };
  if (!st) return res;
  const to = until < period.to ? until : period.to;
  for (const l of lessonsHeld(db, st.groupId, period.from, to)) {
    res.total++;
    const status: AttendanceStatus = db.attendance[`${studentId}|${l.subjectId}|${l.date}`]?.status ?? "present";
    res[status]++;
  }
  res.rate = res.total ? Math.round(((res.present + res.late) / res.total) * 100) : 100;
  return res;
}

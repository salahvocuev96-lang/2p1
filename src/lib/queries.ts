// Выборки для экранов. Чистые функции над DB: легко покрыть тестами и перенести на сервер.
import type { DB } from "./db-types";
import type { Homework, HomeworkStatus, ID, ISODate, ScheduleSlot } from "./types";
import { addDays, BELLS, weekday } from "./dates";

export interface LessonView extends ScheduleSlot {
  subject: string;
  teacher: string;
  group: string;
  time: string;
  changeKind?: "cancel" | "substitute";
  changeNote?: string;
}

function view(db: DB, s: ScheduleSlot): LessonView {
  return {
    ...s,
    subject: db.subjects.find((x) => x.id === s.subjectId)?.name ?? "",
    teacher: db.teachers.find((x) => x.id === s.teacherId)?.name ?? "",
    group: db.groups.find((x) => x.id === s.groupId)?.code ?? "",
    time: BELLS[s.slot - 1] ?? "",
  };
}

function applyChanges(db: DB, lessons: LessonView[], date: ISODate): LessonView[] {
  const changes = db.scheduleChanges?.filter((c) => c.date === date) ?? [];
  if (!changes.length) return lessons;
  return lessons.map((l) => {
    const ch = changes.find((c) => c.groupId === l.groupId && c.slot === l.slot);
    if (!ch) return l;
    if (ch.kind === "cancel") return { ...l, changeKind: "cancel", changeNote: ch.note };
    const newTeacher = ch.newTeacherId ? (db.teachers.find((t) => t.id === ch.newTeacherId)?.name ?? l.teacher) : l.teacher;
    return { ...l, teacherId: ch.newTeacherId ?? l.teacherId, teacher: newTeacher, room: ch.newRoom ?? l.room, changeKind: "substitute", changeNote: ch.note };
  });
}

export function groupLessons(db: DB, groupId: ID, date: ISODate): LessonView[] {
  const wd = weekday(date);
  const lessons = db.schedule.filter((s) => s.groupId === groupId && s.weekday === wd).sort((a, b) => a.slot - b.slot).map((s) => view(db, s));
  return applyChanges(db, lessons, date);
}

export function teacherLessons(db: DB, teacherId: ID, date: ISODate): LessonView[] {
  const wd = weekday(date);
  const lessons = db.schedule.filter((s) => s.teacherId === teacherId && s.weekday === wd).sort((a, b) => a.slot - b.slot).map((s) => view(db, s));
  return applyChanges(db, lessons, date);
}

/** Ближайший учебный день начиная с даты (воскресенье пропускаем) */
export function nextSchoolDay(date: ISODate): ISODate {
  return weekday(date) === 7 ? addDays(date, 1) : date;
}

/** Даты занятий группы по предмету (для журнала) */
export function lessonDates(db: DB, groupId: ID, subjectId: ID, from: ISODate, to: ISODate): ISODate[] {
  const days = new Set(db.schedule.filter((s) => s.groupId === groupId && s.subjectId === subjectId).map((s) => s.weekday));
  const out: ISODate[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) if (days.has(weekday(d))) out.push(d);
  return out;
}

export const subjectName = (db: DB, id: ID) => db.subjects.find((s) => s.id === id)?.name ?? "";
export const groupCode = (db: DB, id: ID) => db.groups.find((g) => g.id === id)?.code ?? "";

/** Статус задания у студента: «новое», «выполняется», «выполнено», «просрочено» */
export function homeworkStatus(db: DB, hw: Homework, studentId: ID, todayIso: ISODate): HomeworkStatus {
  const p = db.homeworkProgress[`${hw.id}|${studentId}`];
  if (p === "done") return "done";
  if (hw.due < todayIso) return "overdue";
  return p ?? "new";
}

export const HW_STATUS_META: Record<HomeworkStatus, { label: string; tone: "brand" | "gold" | "green" | "red" }> = {
  new: { label: "Новое", tone: "brand" },
  in_progress: { label: "Выполняется", tone: "gold" },
  done: { label: "Выполнено", tone: "green" },
  overdue: { label: "Просрочено", tone: "red" },
};

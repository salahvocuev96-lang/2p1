// Форма данных, с которой работают экраны и бизнес-логика.
// Сервер собирает её из SQLite и отдаёт каждому пользователю только разрешённую часть (src/server/scope.ts).
import type {
  Attendance, AuditEntry, Grade, Group, Homework, HomeworkProgress, Load, Message, Notification,
  Parent, ScheduleChange, ScheduleSlot, Settings, Staff, Student, Subject, Teacher,
} from "./types";

export interface DB {
  groups: Group[];
  students: Student[];
  parents: Parent[];
  teachers: Teacher[];
  staff: Staff[];
  subjects: Subject[];
  schedule: ScheduleSlot[];
  loads: Load[];
  grades: Record<string, Grade>; // ключ: studentId|subjectId|date
  attendance: Record<string, Attendance>; // тот же ключ, отдельная таблица
  homework: Homework[];
  homeworkProgress: Record<string, HomeworkProgress>; // hwId|studentId
  messages: Message[];
  notifications: Notification[];
  settings: Settings;
  userPhotos: Record<string, string>; // userId → base64 data URL
  scheduleChanges: ScheduleChange[];
}

/** Агрегаты для администрации: сырые оценки ей не передаются */
export interface GroupStat {
  groupId: string;
  students: number;
  avg: number | null;
  attendanceRate: number | null;
}

/** То, что получает браузер: часть базы, разрешённая роли, плюс служебные поля */
export interface Snapshot extends DB {
  groupStats: GroupStat[];
  audit: AuditEntry[];
  serverToday: string;
  /** Только для администрации: средний балл студента за семестр */
  studentAvg?: Record<string, number | null>;
}

export const EMPTY_DB_EXTRAS = { userPhotos: {} as Record<string, string>, scheduleChanges: [] as ScheduleChange[] };

export const DEFAULT_SETTINGS: Settings = {
  semester1: { from: "09-01", to: "12-31" },
  semester2: { from: "01-12", to: "06-30" },
  finalGradeRule: "mean_round",
};

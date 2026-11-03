"use client";
// Хранилище демо-версии.
// База = детерминированные демо-данные (seed) + изменения пользователя, которые сохраняются в LocalStorage.
// Компоненты работают только через actions, поэтому позже их легко перевести на REST/Supabase.
import { useSyncExternalStore } from "react";
import { buildSeed, key, type DB } from "./seed";
import { canEditJournal, canMessage, viewedStudentId } from "./access";
import type {
  Attendance, AttendanceStatus, Grade, GradeValue, Group, Homework, ID, ISODate, Message, Notification,
  NotificationKind, SessionUser, Student, Subject, Teacher,
} from "./types";
import { addDays, today } from "./dates";

const STORAGE_KEY = "nk-portal-v1";
const SESSION_KEY = "nk-portal-session";

interface Persisted {
  grades: Record<string, Grade | null>;
  attendance: Record<string, Attendance | null>;
  homework: Homework[];
  homeworkDone: Record<string, true>;
  messages: Message[];
  notifications: Notification[];
  groups: Group[];
  students: Student[];
  teachers: Teacher[];
  subjects: Subject[];
}

const emptyPersisted = (): Persisted => ({
  grades: {}, attendance: {}, homework: [], homeworkDone: {}, messages: [], notifications: [],
  groups: [], students: [], teachers: [], subjects: [],
});

type Result = { ok: true; info?: string } | { ok: false; error: string };

let db: DB | null = null;
let persisted: Persisted = emptyPersisted();
let session: SessionUser | null = null;
let version = 0;
const listeners = new Set<() => void>();

function read<T>(k: string): T | null {
  try {
    const s = localStorage.getItem(k);
    return s ? (JSON.parse(s) as T) : null;
  } catch {
    return null;
  }
}
function write(k: string, v: unknown) {
  try {
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* приватный режим: работаем только в памяти */
  }
}

let idCounter = 0;
const uid = (p: string) => `${p}_${Date.now().toString(36)}${(idCounter++).toString(36)}`;

function applyPersisted(base: DB, p: Persisted) {
  for (const [k, g] of Object.entries(p.grades)) g ? (base.grades[k] = g) : delete base.grades[k];
  for (const [k, a] of Object.entries(p.attendance)) a ? (base.attendance[k] = a) : delete base.attendance[k];
  base.homework.push(...p.homework);
  Object.assign(base.homeworkDone, p.homeworkDone);
  base.messages.push(...p.messages);
  base.notifications.push(...p.notifications);
  base.groups.push(...p.groups);
  base.subjects.push(...p.subjects);
  base.teachers.push(...p.teachers);
  for (const s of p.students) {
    base.students.push(s);
    base.parents.push({ id: s.parentId, name: `Родитель: ${s.name}`, childIds: [s.id], phone: "" });
  }
}

/** Стартовые сообщения и уведомления, чтобы демо не выглядело пустым */
function demoExtras(base: DB): Persisted {
  const p = emptyPersisted();
  const st = base.students.find((s) => s.groupId === "2p1");
  const teacher = base.teachers.find((t) => t.name.startsWith("Кудинова"));
  if (!st || !teacher) return p;
  const now = Date.now();
  p.messages.push(
    { id: uid("m"), from: st.id, to: teacher.id, text: "Здравствуйте! Можно пересдать самостоятельную по численным методам?", at: now - 86400000 * 2, read: true },
    { id: uid("m"), from: teacher.id, to: st.id, text: "Здравствуйте. Да, приходите в четверг после 4 пары в 201 кабинет", at: now - 86400000 * 2 + 3600000, read: false },
    { id: uid("m"), from: st.parentId, to: teacher.id, text: "Добрый день! Подскажите, как у сына успехи по математике?", at: now - 3600000 * 5, read: false },
  );
  p.notifications.push(
    { id: uid("n"), userId: st.id, kind: "message", title: "Новое сообщение", text: `${teacher.name}: Да, приходите в четверг после 4 пары`, at: now - 86400000 * 2 + 3600000, read: false, href: "/messages/" },
  );
  return p;
}

function ensure(): DB {
  if (db) return db;
  db = buildSeed();
  const saved = typeof window !== "undefined" ? read<Persisted>(STORAGE_KEY) : null;
  persisted = saved ? { ...emptyPersisted(), ...saved } : demoExtras(db);
  applyPersisted(db, persisted);
  session = typeof window !== "undefined" ? read<SessionUser>(SESSION_KEY) : null;
  return db;
}

function commit() {
  write(STORAGE_KEY, persisted);
  version++;
  listeners.forEach((l) => l());
}

function notify(userId: ID, kind: NotificationKind, title: string, text: string, href: string) {
  const n: Notification = { id: uid("n"), userId, kind, title, text, at: Date.now(), read: false, href };
  db!.notifications.push(n);
  persisted.notifications.push(n);
}

// ---------- Подписка для React ----------

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useStore() {
  useSyncExternalStore(subscribe, () => version, () => -1);
  return { db: ensure(), session, version };
}

// ---------- Сессия ----------

export function login(user: SessionUser) {
  ensure();
  session = user;
  write(SESSION_KEY, user);
  commit();
}

export function logout() {
  session = null;
  write(SESSION_KEY, null);
  commit();
}

export function resetDemo() {
  write(STORAGE_KEY, null);
  db = null;
  ensure();
  commit();
}

// ---------- Журнал: оценки и посещаемость (две независимые таблицы) ----------

const subjName = (id: ID) => db!.subjects.find((s) => s.id === id)?.name ?? "";

export function setGrade(studentId: ID, subjectId: ID, date: ISODate, value: GradeValue | null): Result {
  const base = ensure();
  const st = base.students.find((s) => s.id === studentId);
  if (!st) return { ok: false, error: "Студент не найден" };
  if (!canEditJournal(base, session, st.groupId, subjectId)) return { ok: false, error: "Нет прав на этот предмет и группу" };
  const k = key(studentId, subjectId, date);
  const att = base.attendance[k]?.status;
  if (value !== null && (att === "absent" || att === "sick")) return { ok: false, error: "Студент отсутствовал на занятии" };
  if (value === null) {
    delete base.grades[k];
    persisted.grades[k] = null;
  } else {
    const g: Grade = { studentId, subjectId, date, value, teacherId: session!.id };
    base.grades[k] = g;
    persisted.grades[k] = g;
    const text = `${value} по предмету «${subjName(subjectId)}»`;
    notify(studentId, "grade", "Новая оценка", text, "/grades/");
    notify(st.parentId, "grade", "Новая оценка ребёнка", text, "/grades/");
  }
  commit();
  return { ok: true };
}

export function setAttendance(studentId: ID, subjectId: ID, date: ISODate, status: AttendanceStatus): Result {
  const base = ensure();
  const st = base.students.find((s) => s.id === studentId);
  if (!st) return { ok: false, error: "Студент не найден" };
  if (!canEditJournal(base, session, st.groupId, subjectId)) return { ok: false, error: "Нет прав на этот предмет и группу" };
  const k = key(studentId, subjectId, date);
  let info: string | undefined;
  if (status === "present") {
    delete base.attendance[k];
    persisted.attendance[k] = null;
  } else {
    const a: Attendance = { studentId, subjectId, date, status };
    base.attendance[k] = a;
    persisted.attendance[k] = a;
    if ((status === "absent" || status === "sick") && base.grades[k]) {
      delete base.grades[k];
      persisted.grades[k] = null;
      info = "Оценка за это занятие снята, так как студент отсутствовал";
    }
    if (status === "absent") notify(st.parentId, "attendance", "Пропуск занятия", `«${subjName(subjectId)}», ${date.split("-").reverse().join(".")}`, "/attendance/");
  }
  commit();
  return { ok: true, info };
}

// ---------- Домашние задания ----------

export function addHomework(groupId: ID, subjectId: ID, text: string, due: ISODate): Result {
  const base = ensure();
  if (!canEditJournal(base, session, groupId, subjectId)) return { ok: false, error: "Нет прав на этот предмет и группу" };
  if (!text.trim()) return { ok: false, error: "Введите текст задания" };
  const hw: Homework = { id: uid("hw"), groupId, subjectId, teacherId: session!.id, issued: today(), due: due || addDays(today(), 7), text: text.trim() };
  base.homework.push(hw);
  persisted.homework.push(hw);
  base.students.filter((s) => s.groupId === groupId).forEach((s) => notify(s.id, "homework", "Новое домашнее задание", `«${subjName(subjectId)}»: ${hw.text}`, "/homework/"));
  commit();
  return { ok: true };
}

export function toggleHomeworkDone(hwId: ID): Result {
  const base = ensure();
  if (session?.role !== "student") return { ok: false, error: "Отмечать выполнение может только студент" };
  const k = `${hwId}|${session.id}`;
  if (base.homeworkDone[k]) {
    delete base.homeworkDone[k];
    delete persisted.homeworkDone[k];
  } else {
    base.homeworkDone[k] = true;
    persisted.homeworkDone[k] = true;
  }
  commit();
  return { ok: true };
}

// ---------- Сообщения и уведомления ----------

export function sendMessage(to: ID, text: string): Result {
  const base = ensure();
  if (!text.trim()) return { ok: false, error: "Пустое сообщение" };
  if (!canMessage(base, session, to)) return { ok: false, error: "Нельзя написать этому пользователю" };
  const m: Message = { id: uid("m"), from: session!.id, to, text: text.trim(), at: Date.now(), read: false };
  base.messages.push(m);
  persisted.messages.push(m);
  notify(to, "message", "Новое сообщение", `${session!.name}: ${m.text.slice(0, 80)}`, "/messages/");
  commit();
  return { ok: true };
}

export function markThreadRead(otherId: ID) {
  const base = ensure();
  let changed = false;
  for (const m of base.messages) {
    if (m.from === otherId && m.to === session?.id && !m.read) {
      m.read = true;
      changed = true;
      const pm = persisted.messages.find((x) => x.id === m.id);
      if (pm) pm.read = true;
      else persisted.messages.push(m);
    }
  }
  if (changed) commit();
}

export function markNotificationsRead() {
  const base = ensure();
  let changed = false;
  for (const n of base.notifications) {
    if (n.userId === session?.id && !n.read) {
      n.read = true;
      changed = true;
      const pn = persisted.notifications.find((x) => x.id === n.id);
      if (pn) pn.read = true;
    }
  }
  if (changed) commit();
}

// ---------- Администрирование ----------

function requireAdmin(): Result | null {
  return session?.role === "admin" ? null : { ok: false, error: "Доступно только администратору" };
}

export function addGroup(course: Group["course"], specialty: string): Result {
  const deny = requireAdmin();
  if (deny) return deny;
  const base = ensure();
  const n = base.groups.filter((g) => g.course === course && g.specialty === specialty).length + 1;
  const code = `${course}${specialty}${n}`;
  const g: Group = { id: uid("g"), code, course, specialty };
  base.groups.push(g);
  persisted.groups.push(g);
  commit();
  return { ok: true, info: `Группа ${code} создана` };
}

export function addStudent(name: string, groupId: ID): Result {
  const deny = requireAdmin();
  if (deny) return deny;
  if (name.trim().split(/\s+/).length < 2) return { ok: false, error: "Введите фамилию и имя" };
  const base = ensure();
  const id = uid("st");
  const s: Student = { id, name: name.trim(), groupId, parentId: "pr" + id, email: "", phone: "" };
  base.students.push(s);
  base.parents.push({ id: s.parentId, name: `Родитель: ${s.name}`, childIds: [id], phone: "" });
  persisted.students.push(s);
  commit();
  return { ok: true, info: "Студент добавлен" };
}

export function addTeacher(name: string): Result {
  const deny = requireAdmin();
  if (deny) return deny;
  if (!name.trim()) return { ok: false, error: "Введите ФИО" };
  const t: Teacher = { id: uid("t"), name: name.trim(), email: "" };
  ensure().teachers.push(t);
  persisted.teachers.push(t);
  commit();
  return { ok: true, info: "Преподаватель добавлен" };
}

export function addSubject(name: string): Result {
  const deny = requireAdmin();
  if (deny) return deny;
  const base = ensure();
  if (!name.trim()) return { ok: false, error: "Введите название" };
  if (base.subjects.some((s) => s.name.toLowerCase() === name.trim().toLowerCase())) return { ok: false, error: "Такой предмет уже есть" };
  const s: Subject = { id: uid("s"), name: name.trim(), graded: true };
  base.subjects.push(s);
  persisted.subjects.push(s);
  commit();
  return { ok: true, info: "Предмет добавлен" };
}

export { viewedStudentId };

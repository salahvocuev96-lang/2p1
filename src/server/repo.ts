// Слой хранения. Единственное место, где выполняется SQL для учебных данных.
// Данные держатся в памяти процесса (для быстрых выборок демо-масштаба) и сразу записываются в SQLite.
// При переходе на PostgreSQL меняется только этот файл и sqlite.ts.
import "server-only";
import type { DatabaseSync } from "node:sqlite";
import type { DB } from "@/lib/db-types";
import { DEFAULT_SETTINGS } from "@/lib/db-types";
import { key } from "@/lib/constants";
import type {
  Attendance, AuditEntry, Grade, Group, Homework, HomeworkProgress, ID, Load, Message, Notification,
  Role, ScheduleSlot, Settings, Student, Subject, Teacher,
} from "@/lib/types";
import { transaction } from "./sqlite";

export interface Ctx {
  sql: DatabaseSync;
  db: DB;
}

type Row = Record<string, unknown>;
const all = (sql: DatabaseSync, q: string, ...p: (string | number | null)[]) => sql.prepare(q).all(...p) as Row[];

// ---------- Загрузка ----------

export function loadDB(sql: DatabaseSync): DB {
  const S = (v: unknown) => String(v ?? "");
  const N = (v: unknown) => Number(v);
  const parentOf = new Map<string, string>();
  const childrenOf = new Map<string, string[]>();
  for (const r of all(sql, "SELECT parent_id, student_id FROM parent_children")) {
    parentOf.set(S(r.student_id), S(r.parent_id));
    childrenOf.set(S(r.parent_id), [...(childrenOf.get(S(r.parent_id)) ?? []), S(r.student_id)]);
  }
  const db: DB = {
    groups: all(sql, "SELECT * FROM groups ORDER BY course, code").map((r) => ({
      id: S(r.id), code: S(r.code), course: N(r.course) as Group["course"], specialty: S(r.specialty),
      ...(r.curator_id ? { curatorId: S(r.curator_id) } : {}), ...(N(r.is_demo) ? { isDemo: true } : {}),
    })),
    students: all(sql, "SELECT * FROM students ORDER BY name").map((r) => ({
      id: S(r.id), name: S(r.name), groupId: S(r.group_id), parentId: parentOf.get(S(r.id)) ?? "", email: S(r.email), phone: S(r.phone),
    })),
    parents: all(sql, "SELECT * FROM parents").map((r) => ({ id: S(r.id), name: S(r.name), phone: S(r.phone), childIds: childrenOf.get(S(r.id)) ?? [] })),
    teachers: all(sql, "SELECT * FROM teachers ORDER BY name").map((r) => ({ id: S(r.id), name: S(r.name), email: S(r.email) })),
    staff: all(sql, "SELECT * FROM staff").map((r) => ({ id: S(r.id), name: S(r.name), role: S(r.role) as "college_admin" | "tech_admin" })),
    subjects: all(sql, "SELECT * FROM subjects ORDER BY name").map((r) => ({ id: S(r.id), name: S(r.name), graded: N(r.graded) === 1 })),
    schedule: all(sql, "SELECT * FROM schedule_slots").map((r) => ({
      id: N(r.id), groupId: S(r.group_id), weekday: N(r.weekday), slot: N(r.slot), subjectId: S(r.subject_id), teacherId: S(r.teacher_id), room: S(r.room),
    })),
    loads: all(sql, "SELECT * FROM teaching_loads").map((r) => ({ teacherId: S(r.teacher_id), subjectId: S(r.subject_id), groupId: S(r.group_id) })),
    grades: {},
    attendance: {},
    homework: all(sql, "SELECT * FROM homework").map((r) => ({
      id: S(r.id), groupId: S(r.group_id), subjectId: S(r.subject_id), teacherId: S(r.teacher_id), issued: S(r.issued), due: S(r.due), title: S(r.title), text: S(r.description),
    })),
    homeworkProgress: {},
    messages: all(sql, "SELECT * FROM messages ORDER BY at").map((r) => ({ id: S(r.id), from: S(r.from_id), to: S(r.to_id), text: S(r.text), at: N(r.at), read: N(r.read) === 1 })),
    notifications: all(sql, "SELECT * FROM notifications ORDER BY at").map((r) => ({
      id: S(r.id), userId: S(r.user_id), kind: S(r.kind) as Notification["kind"], title: S(r.title), text: S(r.text), at: N(r.at), read: N(r.read) === 1, href: S(r.href),
    })),
    settings: loadSettings(sql),
    userPhotos: {},
    scheduleChanges: [],
  };
  for (const r of all(sql, "SELECT id, photo FROM users WHERE photo IS NOT NULL")) db.userPhotos[S(r.id)] = S(r.photo);
  db.scheduleChanges = (all(sql, "SELECT * FROM schedule_changes ORDER BY date, slot") as Record<string, unknown>[]).map((r) => ({
    id: N(r.id), date: S(r.date), groupId: S(r.group_id), slot: N(r.slot),
    kind: S(r.kind) as "cancel" | "substitute",
    newTeacherId: r.new_teacher_id ? S(r.new_teacher_id) : undefined,
    newRoom: r.new_room !== null && r.new_room !== undefined ? S(r.new_room) : undefined,
    note: r.note ? S(r.note) : undefined,
    createdAt: N(r.created_at),
  }));
  for (const r of all(sql, "SELECT * FROM grades")) {
    const g: Grade = { studentId: S(r.student_id), subjectId: S(r.subject_id), date: S(r.date), value: N(r.value) as Grade["value"], teacherId: S(r.teacher_id), updatedAt: N(r.updated_at) };
    db.grades[key(g.studentId, g.subjectId, g.date)] = g;
  }
  for (const r of all(sql, "SELECT * FROM attendance")) {
    const a: Attendance = { studentId: S(r.student_id), subjectId: S(r.subject_id), date: S(r.date), status: S(r.status) as Attendance["status"] };
    db.attendance[key(a.studentId, a.subjectId, a.date)] = a;
  }
  for (const r of all(sql, "SELECT * FROM homework_progress")) db.homeworkProgress[`${S(r.homework_id)}|${S(r.student_id)}`] = S(r.status) as HomeworkProgress;
  return db;
}

function loadSettings(sql: DatabaseSync): Settings {
  const out: Settings = structuredClone(DEFAULT_SETTINGS);
  for (const r of all(sql, "SELECT key, value FROM settings")) {
    try {
      (out as unknown as Record<string, unknown>)[String(r.key)] = JSON.parse(String(r.value));
    } catch {
      /* битое значение: остаётся значение по умолчанию */
    }
  }
  return out;
}

// ---------- Первичное заполнение ----------

export function isEmpty(sql: DatabaseSync) {
  return Number((sql.prepare("SELECT COUNT(*) AS n FROM groups").get() as Row).n) === 0;
}

export function insertAll(sql: DatabaseSync, db: DB) {
  transaction(sql, () => {
    const run = (q: string) => sql.prepare(q);
    const t = run("INSERT INTO teachers (id, name, email) VALUES (?, ?, ?)");
    db.teachers.forEach((x) => t.run(x.id, x.name, x.email));
    const st = run("INSERT INTO staff (id, name, role) VALUES (?, ?, ?)");
    db.staff.forEach((x) => st.run(x.id, x.name, x.role));
    db.groups.forEach((g) => insertGroupRow(sql, g));
    const sj = run("INSERT INTO subjects (id, name, graded) VALUES (?, ?, ?)");
    db.subjects.forEach((x) => sj.run(x.id, x.name, x.graded ? 1 : 0));
    db.students.forEach((s) => insertStudentRow(sql, s));
    const p = run("INSERT INTO parents (id, name, phone) VALUES (?, ?, ?)");
    const pc = run("INSERT INTO parent_children (parent_id, student_id) VALUES (?, ?)");
    db.parents.forEach((x) => {
      p.run(x.id, x.name, x.phone);
      x.childIds.forEach((c) => pc.run(x.id, c));
    });
    const l = run("INSERT INTO teaching_loads (teacher_id, subject_id, group_id) VALUES (?, ?, ?)");
    db.loads.forEach((x) => l.run(x.teacherId, x.subjectId, x.groupId));
    const sc = run("INSERT INTO schedule_slots (id, group_id, weekday, slot, subject_id, teacher_id, room) VALUES (?, ?, ?, ?, ?, ?, ?)");
    db.schedule.forEach((x) => sc.run(x.id, x.groupId, x.weekday, x.slot, x.subjectId, x.teacherId, x.room));
    const now = Date.now();
    const gr = run("INSERT INTO grades (student_id, subject_id, date, value, teacher_id, updated_at) VALUES (?, ?, ?, ?, ?, ?)");
    Object.values(db.grades).forEach((x) => gr.run(x.studentId, x.subjectId, x.date, x.value, x.teacherId, x.updatedAt ?? now));
    const at = run("INSERT INTO attendance (student_id, subject_id, date, status) VALUES (?, ?, ?, ?)");
    Object.values(db.attendance).forEach((x) => x.status !== "present" && at.run(x.studentId, x.subjectId, x.date, x.status));
    db.homework.forEach((h) => insertHomeworkRow(sql, h));
    db.messages.forEach((m) => insertMessageRow(sql, m));
    db.notifications.forEach((n) => insertNotificationRow(sql, n));
  });
}

// ---------- Записи (SQL + кэш в памяти) ----------

function insertGroupRow(sql: DatabaseSync, g: Group) {
  sql.prepare("INSERT INTO groups (id, code, course, specialty, curator_id, is_demo) VALUES (?, ?, ?, ?, ?, ?)").run(g.id, g.code, g.course, g.specialty, g.curatorId ?? null, g.isDemo ? 1 : 0);
}
function insertStudentRow(sql: DatabaseSync, s: Student) {
  sql.prepare("INSERT INTO students (id, name, group_id, email, phone) VALUES (?, ?, ?, ?, ?)").run(s.id, s.name, s.groupId, s.email, s.phone);
}
function insertHomeworkRow(sql: DatabaseSync, h: Homework) {
  sql.prepare("INSERT INTO homework (id, group_id, subject_id, teacher_id, issued, due, title, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(h.id, h.groupId, h.subjectId, h.teacherId, h.issued, h.due, h.title, h.text);
}
function insertMessageRow(sql: DatabaseSync, m: Message) {
  sql.prepare("INSERT INTO messages (id, from_id, to_id, text, at, read) VALUES (?, ?, ?, ?, ?, ?)").run(m.id, m.from, m.to, m.text, m.at, m.read ? 1 : 0);
}
function insertNotificationRow(sql: DatabaseSync, n: Notification) {
  sql.prepare("INSERT INTO notifications (id, user_id, kind, title, text, at, read, href) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(n.id, n.userId, n.kind, n.title, n.text, n.at, n.read ? 1 : 0, n.href);
}

export const repo = {
  putGrade(c: Ctx, g: Grade) {
    c.sql.prepare(
      "INSERT INTO grades (student_id, subject_id, date, value, teacher_id, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (student_id, subject_id, date) DO UPDATE SET value = excluded.value, teacher_id = excluded.teacher_id, updated_at = excluded.updated_at",
    ).run(g.studentId, g.subjectId, g.date, g.value, g.teacherId, g.updatedAt ?? Date.now());
    c.db.grades[key(g.studentId, g.subjectId, g.date)] = g;
  },
  deleteGrade(c: Ctx, studentId: ID, subjectId: ID, date: string) {
    c.sql.prepare("DELETE FROM grades WHERE student_id = ? AND subject_id = ? AND date = ?").run(studentId, subjectId, date);
    delete c.db.grades[key(studentId, subjectId, date)];
  },
  putAttendance(c: Ctx, a: Attendance) {
    const k = key(a.studentId, a.subjectId, a.date);
    if (a.status === "present") {
      c.sql.prepare("DELETE FROM attendance WHERE student_id = ? AND subject_id = ? AND date = ?").run(a.studentId, a.subjectId, a.date);
      delete c.db.attendance[k];
      return;
    }
    c.sql.prepare("INSERT INTO attendance (student_id, subject_id, date, status) VALUES (?, ?, ?, ?) ON CONFLICT (student_id, subject_id, date) DO UPDATE SET status = excluded.status").run(a.studentId, a.subjectId, a.date, a.status);
    c.db.attendance[k] = a;
  },
  insertHomework(c: Ctx, h: Homework) {
    insertHomeworkRow(c.sql, h);
    c.db.homework.push(h);
  },
  setHomeworkProgress(c: Ctx, hwId: ID, studentId: ID, status: HomeworkProgress | null) {
    const k = `${hwId}|${studentId}`;
    if (status === null) {
      c.sql.prepare("DELETE FROM homework_progress WHERE homework_id = ? AND student_id = ?").run(hwId, studentId);
      delete c.db.homeworkProgress[k];
      return;
    }
    c.sql.prepare("INSERT INTO homework_progress (homework_id, student_id, status) VALUES (?, ?, ?) ON CONFLICT (homework_id, student_id) DO UPDATE SET status = excluded.status").run(hwId, studentId, status);
    c.db.homeworkProgress[k] = status;
  },
  insertMessage(c: Ctx, m: Message) {
    insertMessageRow(c.sql, m);
    c.db.messages.push(m);
  },
  markMessagesRead(c: Ctx, fromId: ID, toId: ID) {
    c.sql.prepare("UPDATE messages SET read = 1 WHERE from_id = ? AND to_id = ? AND read = 0").run(fromId, toId);
    c.db.messages.forEach((m) => m.from === fromId && m.to === toId && (m.read = true));
  },
  insertNotification(c: Ctx, n: Notification) {
    insertNotificationRow(c.sql, n);
    c.db.notifications.push(n);
  },
  markNotificationsRead(c: Ctx, userId: ID, id?: ID) {
    if (id) c.sql.prepare("UPDATE notifications SET read = 1 WHERE user_id = ? AND id = ?").run(userId, id);
    else c.sql.prepare("UPDATE notifications SET read = 1 WHERE user_id = ?").run(userId);
    c.db.notifications.forEach((n) => n.userId === userId && (!id || n.id === id) && (n.read = true));
  },
  insertGroup(c: Ctx, g: Group) {
    insertGroupRow(c.sql, g);
    c.db.groups.push(g);
    c.db.groups.sort((a, b) => a.course - b.course || a.code.localeCompare(b.code, "ru"));
  },
  updateGroup(c: Ctx, id: ID, patch: { curatorId?: ID | null }) {
    c.sql.prepare("UPDATE groups SET curator_id = ? WHERE id = ?").run(patch.curatorId ?? null, id);
    const g = c.db.groups.find((x) => x.id === id);
    if (g) {
      if (patch.curatorId) g.curatorId = patch.curatorId;
      else delete g.curatorId;
    }
  },
  insertStudentWithParent(c: Ctx, s: Student, parentName: string) {
    insertStudentRow(c.sql, s);
    c.sql.prepare("INSERT INTO parents (id, name, phone) VALUES (?, ?, '')").run(s.parentId, parentName);
    c.sql.prepare("INSERT INTO parent_children (parent_id, student_id) VALUES (?, ?)").run(s.parentId, s.id);
    c.db.students.push(s);
    c.db.parents.push({ id: s.parentId, name: parentName, childIds: [s.id], phone: "" });
  },
  updateStudent(c: Ctx, id: ID, patch: { name: string; groupId: ID; email: string; phone: string }) {
    c.sql.prepare("UPDATE students SET name = ?, group_id = ?, email = ?, phone = ? WHERE id = ?").run(patch.name, patch.groupId, patch.email, patch.phone, id);
    const s = c.db.students.find((x) => x.id === id);
    if (s) Object.assign(s, patch);
  },
  insertTeacher(c: Ctx, t: Teacher) {
    c.sql.prepare("INSERT INTO teachers (id, name, email) VALUES (?, ?, ?)").run(t.id, t.name, t.email);
    c.db.teachers.push(t);
    c.db.teachers.sort((a, b) => a.name.localeCompare(b.name, "ru"));
  },
  updateTeacher(c: Ctx, id: ID, patch: { name: string; email: string }) {
    c.sql.prepare("UPDATE teachers SET name = ?, email = ? WHERE id = ?").run(patch.name, patch.email, id);
    const t = c.db.teachers.find((x) => x.id === id);
    if (t) Object.assign(t, patch);
  },
  updateParent(c: Ctx, id: ID, patch: { name: string; phone: string }) {
    c.sql.prepare("UPDATE parents SET name = ?, phone = ? WHERE id = ?").run(patch.name, patch.phone, id);
    const p = c.db.parents.find((x) => x.id === id);
    if (p) Object.assign(p, patch);
  },
  insertSubject(c: Ctx, s: Subject) {
    c.sql.prepare("INSERT INTO subjects (id, name, graded) VALUES (?, ?, ?)").run(s.id, s.name, s.graded ? 1 : 0);
    c.db.subjects.push(s);
    c.db.subjects.sort((a, b) => a.name.localeCompare(b.name, "ru"));
  },
  updateSubject(c: Ctx, id: ID, patch: { name: string; graded: boolean }) {
    c.sql.prepare("UPDATE subjects SET name = ?, graded = ? WHERE id = ?").run(patch.name, patch.graded ? 1 : 0, id);
    const s = c.db.subjects.find((x) => x.id === id);
    if (s) Object.assign(s, patch);
  },
  insertLoad(c: Ctx, l: Load) {
    c.sql.prepare("INSERT OR IGNORE INTO teaching_loads (teacher_id, subject_id, group_id) VALUES (?, ?, ?)").run(l.teacherId, l.subjectId, l.groupId);
    if (!c.db.loads.some((x) => x.teacherId === l.teacherId && x.subjectId === l.subjectId && x.groupId === l.groupId)) c.db.loads.push(l);
  },
  deleteLoad(c: Ctx, l: Load) {
    c.sql.prepare("DELETE FROM teaching_loads WHERE teacher_id = ? AND subject_id = ? AND group_id = ?").run(l.teacherId, l.subjectId, l.groupId);
    c.db.loads = c.db.loads.filter((x) => !(x.teacherId === l.teacherId && x.subjectId === l.subjectId && x.groupId === l.groupId));
  },
  upsertSlot(c: Ctx, s: Omit<ScheduleSlot, "id">): ScheduleSlot {
    c.sql.prepare(
      "INSERT INTO schedule_slots (group_id, weekday, slot, subject_id, teacher_id, room) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (group_id, weekday, slot) DO UPDATE SET subject_id = excluded.subject_id, teacher_id = excluded.teacher_id, room = excluded.room",
    ).run(s.groupId, s.weekday, s.slot, s.subjectId, s.teacherId, s.room);
    const id = Number((c.sql.prepare("SELECT id FROM schedule_slots WHERE group_id = ? AND weekday = ? AND slot = ?").get(s.groupId, s.weekday, s.slot) as Row).id);
    const slot: ScheduleSlot = { id, ...s };
    c.db.schedule = c.db.schedule.filter((x) => !(x.groupId === s.groupId && x.weekday === s.weekday && x.slot === s.slot));
    c.db.schedule.push(slot);
    return slot;
  },
  deleteSlot(c: Ctx, groupId: ID, weekday: number, slot: number) {
    c.sql.prepare("DELETE FROM schedule_slots WHERE group_id = ? AND weekday = ? AND slot = ?").run(groupId, weekday, slot);
    c.db.schedule = c.db.schedule.filter((x) => !(x.groupId === groupId && x.weekday === weekday && x.slot === slot));
  },
  saveSettings(c: Ctx, s: Settings) {
    const st = c.sql.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value");
    for (const [k, v] of Object.entries(s)) st.run(k, JSON.stringify(v));
    c.db.settings = s;
  },
};

// ---------- Аудит (только добавление: UPDATE/DELETE запрещены триггерами) ----------

export function audit(c: Ctx, e: Omit<AuditEntry, "id" | "at">) {
  c.sql
    .prepare("INSERT INTO audit_log (at, actor_id, actor_role, action, entity, entity_id, before, after, reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run(Date.now(), e.actorId, e.actorRole, e.action, e.entity, e.entityId, e.before, e.after, e.reason);
}

export function readAudit(c: Ctx, opts: { entityPrefix?: string; entityIds?: string[]; limit?: number } = {}): AuditEntry[] {
  let q = "SELECT * FROM audit_log";
  const params: string[] = [];
  const where: string[] = [];
  if (opts.entityPrefix) {
    where.push("entity = ?");
    params.push(opts.entityPrefix);
  }
  if (opts.entityIds) {
    if (!opts.entityIds.length) return [];
    where.push(`entity_id IN (${opts.entityIds.map(() => "?").join(",")})`);
    params.push(...opts.entityIds);
  }
  if (where.length) q += " WHERE " + where.join(" AND ");
  q += ` ORDER BY id DESC LIMIT ${Math.min(opts.limit ?? 200, 1000)}`;
  return all(c.sql, q, ...params).map((r) => ({
    id: Number(r.id), at: Number(r.at), actorId: String(r.actor_id), actorRole: String(r.actor_role) as Role,
    action: String(r.action), entity: String(r.entity), entityId: String(r.entity_id),
    before: (r.before as string) ?? null, after: (r.after as string) ?? null, reason: (r.reason as string) ?? null,
  }));
}

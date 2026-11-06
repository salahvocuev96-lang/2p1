// Какие данные получает браузер пользователя. Всё, что не попало в снимок, клиенту недоступно,
// даже если подделать запрос: отдельного «чтения чужих данных» в API нет.
import "server-only";
import type { DB, GroupStat, Snapshot } from "@/lib/db-types";
import type { Grade, Attendance, ID, SessionUser } from "@/lib/types";
import { contactsFor, teacherLoads, visibleStudentIds } from "@/lib/access";
import { average, attendanceSummary } from "@/lib/stats";
import { semesterPeriod, today } from "@/lib/dates";
import { readAudit, type Ctx } from "./repo";

const pickRecord = <T,>(rec: Record<string, T>, ok: (v: T) => boolean) => {
  const out: Record<string, T> = {};
  for (const [k, v] of Object.entries(rec)) if (ok(v)) out[k] = v;
  return out;
};

const pickPhotos = (all: Record<string, string>, ids: Set<string>) => {
  const out: Record<string, string> = {};
  for (const id of ids) if (all[id]) out[id] = all[id];
  return out;
};

function groupStats(db: DB): GroupStat[] {
  const now = today();
  const sem = semesterPeriod(now, db.settings);
  const byStudent = new Map<ID, number[]>();
  for (const g of Object.values(db.grades)) {
    if (g.date < sem.from || g.date > sem.to) continue;
    const list = byStudent.get(g.studentId) ?? [];
    list.push(g.value);
    byStudent.set(g.studentId, list);
  }
  return db.groups.map((g) => {
    const sts = db.students.filter((s) => s.groupId === g.id);
    const vals = sts.flatMap((s) => byStudent.get(s.id) ?? []);
    const rates = sts.map((s) => attendanceSummary(db, s.id, sem, now).rate);
    return { groupId: g.id, students: sts.length, avg: average(vals), attendanceRate: rates.length ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length) : null };
  });
}

/** Средние баллы по студентам для администрации (без самих оценок) */
export function studentAverages(db: DB): Record<ID, number | null> {
  const sem = semesterPeriod(today(), db.settings);
  const by = new Map<ID, number[]>();
  for (const g of Object.values(db.grades)) if (g.date >= sem.from && g.date <= sem.to) by.set(g.studentId, [...(by.get(g.studentId) ?? []), g.value]);
  const out: Record<ID, number | null> = {};
  db.students.forEach((s) => (out[s.id] = average(by.get(s.id) ?? [])));
  return out;
}

export function snapshotFor(c: Ctx, user: SessionUser): Snapshot {
  const db = c.db;
  const base = {
    subjects: db.subjects,
    settings: db.settings,
    serverToday: today(),
    messages: db.messages.filter((m) => m.from === user.id || m.to === user.id),
    notifications: db.notifications.filter((n) => n.userId === user.id),
    staff: db.staff,
    groupStats: [] as GroupStat[],
    audit: [] as Snapshot["audit"],
  };

  if (user.role === "student" || user.role === "parent") {
    const ids = visibleStudentIds(db, user);
    const students = db.students.filter((s) => ids.has(s.id));
    const groupIds = new Set(students.map((s) => s.groupId));
    const loads = db.loads.filter((l) => groupIds.has(l.groupId));
    const teacherIds = new Set([...loads.map((l) => l.teacherId), ...base.messages.flatMap((m) => [m.from, m.to])]);
    const gradeKeys = Object.keys(db.grades).filter((k) => ids.has(k.split("|")[0]));
    const visibleTeachers = db.teachers.filter((t) => teacherIds.has(t.id));
    return {
      ...base,
      groups: db.groups.filter((g) => groupIds.has(g.id)),
      students,
      parents: db.parents.filter((p) => p.childIds.some((c) => ids.has(c))),
      teachers: visibleTeachers,
      schedule: db.schedule.filter((s) => groupIds.has(s.groupId)),
      loads,
      grades: pickRecord(db.grades, (g) => ids.has(g.studentId)),
      attendance: pickRecord(db.attendance, (a) => ids.has(a.studentId)),
      homework: db.homework.filter((h) => groupIds.has(h.groupId)),
      homeworkProgress: Object.fromEntries(Object.entries(db.homeworkProgress).filter(([k]) => ids.has(k.split("|")[1]))),
      audit: readAudit(c, { entityPrefix: "grade", entityIds: gradeKeys, limit: 300 }),
      userPhotos: pickPhotos(db.userPhotos, new Set([user.id, ...ids, ...visibleTeachers.map((t) => t.id)])),
      scheduleChanges: db.scheduleChanges.filter((c) => groupIds.has(c.groupId)),
    };
  }

  if (user.role === "teacher") {
    const loads = teacherLoads(db, user.id);
    const ids = visibleStudentIds(db, user);
    const students = db.students.filter((s) => ids.has(s.id));
    const groupIds = new Set(students.map((s) => s.groupId));
    loads.forEach((l) => groupIds.add(l.groupId));
    const curated = new Set(db.groups.filter((g) => g.curatorId === user.id).map((g) => g.id));
    const allowed = new Set(loads.map((l) => `${l.groupId}|${l.subjectId}`));
    const groupOf = new Map(students.map((s) => [s.id, s.groupId]));
    const visible = (r: Grade | Attendance) => {
      const gid = groupOf.get(r.studentId);
      return !!gid && (curated.has(gid) || allowed.has(`${gid}|${r.subjectId}`));
    };
    const grades = pickRecord(db.grades, visible);
    const contacts = new Set(contactsFor(db, user).map((x) => x.id));
    const groupTeachers = new Set(db.loads.filter((l) => groupIds.has(l.groupId)).map((l) => l.teacherId));
    const visibleTeachersT = db.teachers.filter((t) => t.id === user.id || contacts.has(t.id) || groupTeachers.has(t.id));
    return {
      ...base,
      groups: db.groups.filter((g) => groupIds.has(g.id)),
      students,
      parents: db.parents.filter((p) => p.childIds.some((c) => ids.has(c))),
      teachers: visibleTeachersT,
      schedule: db.schedule.filter((s) => s.teacherId === user.id || groupIds.has(s.groupId)),
      loads: db.loads.filter((l) => groupIds.has(l.groupId)),
      grades,
      attendance: pickRecord(db.attendance, visible),
      homework: db.homework.filter((h) => groupIds.has(h.groupId)),
      homeworkProgress: Object.fromEntries(Object.entries(db.homeworkProgress).filter(([k]) => ids.has(k.split("|")[1]))),
      audit: readAudit(c, { entityPrefix: "grade", entityIds: Object.keys(grades), limit: 500 }),
      userPhotos: pickPhotos(db.userPhotos, new Set([user.id, ...ids, ...visibleTeachersT.map((t) => t.id)])),
      scheduleChanges: db.scheduleChanges.filter((c) => groupIds.has(c.groupId)),
    };
  }

  if (user.role === "college_admin") {
    return {
      ...base,
      groups: db.groups,
      students: db.students,
      parents: db.parents,
      teachers: db.teachers,
      schedule: db.schedule,
      loads: db.loads,
      grades: {},
      attendance: {},
      homework: [],
      homeworkProgress: {},
      groupStats: groupStats(db),
      studentAvg: studentAverages(db),
      audit: readAudit(c, { limit: 300 }),
      userPhotos: db.userPhotos,
      scheduleChanges: db.scheduleChanges,
    };
  }

  return {
    ...base,
    groups: [],
    students: [],
    parents: [],
    teachers: [],
    schedule: [],
    loads: [],
    grades: {},
    attendance: {},
    homework: [],
    homeworkProgress: {},
    audit: readAudit(c, { limit: 300 }).map((e) => ({ ...e, before: null, after: null, reason: e.reason ? "скрыто" : null })),
    userPhotos: pickPhotos(db.userPhotos, new Set([user.id])),
    scheduleChanges: [],
  };
}

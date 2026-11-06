// Администрация колледжа: справочники, назначения, расписание, аккаунты, объявления, импорт
import "server-only";
import { z } from "zod";
import { SPECIALTIES } from "@/lib/constants";
import { WEEKDAYS } from "@/lib/dates";
import { translit } from "@/lib/names";
import type { Role, SessionUser } from "@/lib/types";
import { audit, repo, type Ctx } from "../repo";
import { closeResetRequest, createAccount, findUserById, findUserByLogin, resetPassword, setActive } from "../auth";
import { fail, notify, ok, requireRole, subjName, uid, type Result } from "./common";

const name = z.string().trim().min(3, "Слишком короткое имя").max(120);
const fio = name.refine((v) => v.split(/\s+/).length >= 2, "Введите фамилию и имя");
const id = z.string().min(1);

function log(c: Ctx, u: SessionUser, action: string, entity: string, entityId: string, after: unknown, before: unknown = null) {
  audit(c, { actorId: u.id, actorRole: u.role, action, entity, entityId, before: before === null ? null : JSON.stringify(before), after: after === null ? null : JSON.stringify(after), reason: null });
}

const admin = <T,>(fn: (c: Ctx, u: SessionUser, raw: unknown) => T) => (c: Ctx, u: SessionUser, raw: unknown) => {
  requireRole(u, "college_admin");
  return fn(c, u, raw);
};

function nextGroupCode(c: Ctx, course: number, specialty: string) {
  let n = 1;
  while (c.db.groups.some((g) => g.code === `${course}${specialty}${n}`)) n++;
  return `${course}${specialty}${n}`;
}

function addStudent(c: Ctx, u: SessionUser, studentName: string, groupId: string, parentName?: string) {
  const sid = uid("st");
  const s = { id: sid, name: studentName, groupId, parentId: uid("pr"), email: "", phone: "" };
  repo.insertStudentWithParent(c, s, parentName?.trim() || `Родитель: ${studentName}`);
  log(c, u, "student.create", "student", sid, { name: studentName, groupId });
  return s;
}

export const adminActions = {
  "group.create": admin((c, u, raw) => {
    const p = z.object({ course: z.number().int().min(1).max(4), specialty: z.string().refine((v) => v in SPECIALTIES, "Неизвестная специальность") }).parse(raw);
    const code = nextGroupCode(c, p.course, p.specialty);
    const g = { id: "g" + translit(code.toLowerCase()) + "_" + uid("").slice(1, 6), code, course: p.course as 1 | 2 | 3 | 4, specialty: p.specialty };
    repo.insertGroup(c, g);
    log(c, u, "group.create", "group", g.id, g);
    return ok(`Группа ${code} создана`);
  }),
  "group.update": admin((c, u, raw) => {
    const p = z.object({ id, curatorId: z.string().nullable() }).parse(raw);
    if (p.curatorId && !c.db.teachers.some((t) => t.id === p.curatorId)) return fail("Преподаватель не найден");
    repo.updateGroup(c, p.id, { curatorId: p.curatorId });
    log(c, u, "group.update", "group", p.id, { curatorId: p.curatorId });
    return ok("Куратор назначен");
  }),
  "student.create": admin((c, u, raw) => {
    const p = z.object({ name: fio, groupId: id, parentName: z.string().max(120).optional() }).parse(raw);
    if (!c.db.groups.some((g) => g.id === p.groupId)) return fail("Группа не найдена");
    addStudent(c, u, p.name, p.groupId, p.parentName);
    return ok("Студент добавлен");
  }),
  "student.update": admin((c, u, raw) => {
    const p = z.object({ id, name: fio, groupId: id, email: z.string().max(120), phone: z.string().max(40) }).parse(raw);
    const before = c.db.students.find((s) => s.id === p.id);
    if (!before) return fail("Студент не найден");
    if (!c.db.groups.some((g) => g.id === p.groupId)) return fail("Группа не найдена");
    log(c, u, "student.update", "student", p.id, { name: p.name, groupId: p.groupId }, { name: before.name, groupId: before.groupId });
    repo.updateStudent(c, p.id, { name: p.name, groupId: p.groupId, email: p.email, phone: p.phone });
    return ok("Данные студента сохранены");
  }),
  "parent.update": admin((c, u, raw) => {
    const p = z.object({ id, name: fio, phone: z.string().max(40) }).parse(raw);
    if (!c.db.parents.some((x) => x.id === p.id)) return fail("Родитель не найден");
    repo.updateParent(c, p.id, { name: p.name, phone: p.phone });
    log(c, u, "parent.update", "parent", p.id, { name: p.name });
    return ok("Данные родителя сохранены");
  }),
  "teacher.create": admin((c, u, raw) => {
    const p = z.object({ name, email: z.string().max(120).default("") }).parse(raw);
    const t = { id: uid("t"), name: p.name, email: p.email };
    repo.insertTeacher(c, t);
    log(c, u, "teacher.create", "teacher", t.id, t);
    return ok("Преподаватель добавлен");
  }),
  "teacher.update": admin((c, u, raw) => {
    const p = z.object({ id, name, email: z.string().max(120) }).parse(raw);
    if (!c.db.teachers.some((t) => t.id === p.id)) return fail("Преподаватель не найден");
    repo.updateTeacher(c, p.id, { name: p.name, email: p.email });
    log(c, u, "teacher.update", "teacher", p.id, p);
    return ok("Данные преподавателя сохранены");
  }),
  "subject.create": admin((c, u, raw) => {
    const p = z.object({ name, graded: z.boolean().default(true) }).parse(raw);
    if (c.db.subjects.some((s) => s.name.toLowerCase() === p.name.toLowerCase())) return fail("Такой предмет уже есть");
    const s = { id: uid("s"), name: p.name, graded: p.graded };
    repo.insertSubject(c, s);
    log(c, u, "subject.create", "subject", s.id, s);
    return ok("Предмет добавлен");
  }),
  "subject.update": admin((c, u, raw) => {
    const p = z.object({ id, name, graded: z.boolean() }).parse(raw);
    if (c.db.subjects.some((s) => s.id !== p.id && s.name.toLowerCase() === p.name.toLowerCase())) return fail("Такой предмет уже есть");
    repo.updateSubject(c, p.id, { name: p.name, graded: p.graded });
    log(c, u, "subject.update", "subject", p.id, p);
    return ok("Предмет сохранён");
  }),
  "load.add": admin((c, u, raw) => {
    const p = z.object({ teacherId: id, subjectId: id, groupId: id }).parse(raw);
    if (!c.db.teachers.some((t) => t.id === p.teacherId) || !c.db.subjects.some((s) => s.id === p.subjectId) || !c.db.groups.some((g) => g.id === p.groupId)) return fail("Неверные данные назначения");
    repo.insertLoad(c, p);
    log(c, u, "load.add", "load", `${p.teacherId}|${p.subjectId}|${p.groupId}`, p);
    notify(c, p.teacherId, "schedule", "Новое назначение", `«${subjName(c, p.subjectId)}» в группе ${c.db.groups.find((g) => g.id === p.groupId)?.code}`, "/groups/");
    return ok("Назначение добавлено");
  }),
  "load.remove": admin((c, u, raw) => {
    const p = z.object({ teacherId: id, subjectId: id, groupId: id }).parse(raw);
    if (c.db.schedule.some((s) => s.teacherId === p.teacherId && s.subjectId === p.subjectId && s.groupId === p.groupId)) return fail("Сначала уберите эти занятия из расписания группы");
    repo.deleteLoad(c, p);
    log(c, u, "load.remove", "load", `${p.teacherId}|${p.subjectId}|${p.groupId}`, null, p);
    return ok("Назначение снято");
  }),
  "schedule.setSlot": admin((c, u, raw) => {
    const p = z.object({ groupId: id, weekday: z.number().int().min(1).max(6), slot: z.number().int().min(1).max(6), subjectId: id, teacherId: id, room: z.string().trim().max(30) }).parse(raw);
    const g = c.db.groups.find((x) => x.id === p.groupId);
    if (!g || !c.db.subjects.some((s) => s.id === p.subjectId) || !c.db.teachers.some((t) => t.id === p.teacherId)) return fail("Неверные данные занятия");
    const busy = c.db.schedule.find((s) => s.teacherId === p.teacherId && s.weekday === p.weekday && s.slot === p.slot && s.groupId !== p.groupId);
    if (busy && !c.db.groups.find((x) => x.id === busy.groupId)?.isDemo) return fail(`Преподаватель в это время ведёт занятие в группе ${c.db.groups.find((x) => x.id === busy.groupId)?.code}`);
    const roomBusy = p.room && c.db.schedule.find((s) => s.room === p.room && s.weekday === p.weekday && s.slot === p.slot && s.groupId !== p.groupId && s.teacherId !== p.teacherId);
    if (roomBusy && !c.db.groups.find((x) => x.id === roomBusy.groupId)?.isDemo) return fail(`Аудитория ${p.room} занята группой ${c.db.groups.find((x) => x.id === roomBusy.groupId)?.code}`);
    const before = c.db.schedule.find((s) => s.groupId === p.groupId && s.weekday === p.weekday && s.slot === p.slot) ?? null;
    repo.upsertSlot(c, p);
    repo.insertLoad(c, { teacherId: p.teacherId, subjectId: p.subjectId, groupId: p.groupId });
    log(c, u, "schedule.update", "schedule", `${p.groupId}|${p.weekday}|${p.slot}`, p, before);
    const text = `${g.code}, ${WEEKDAYS[p.weekday - 1].toLowerCase()}, ${p.slot} пара: «${subjName(c, p.subjectId)}»${p.room ? `, ауд. ${p.room}` : ""}`;
    c.db.students.filter((s) => s.groupId === g.id).forEach((s) => notify(c, s.id, "schedule", "Изменение расписания", text, "/schedule/"));
    notify(c, p.teacherId, "schedule", "Изменение расписания", text, "/schedule/");
    return ok("Занятие сохранено");
  }),
  "schedule.clearSlot": admin((c, u, raw) => {
    const p = z.object({ groupId: id, weekday: z.number().int().min(1).max(6), slot: z.number().int().min(1).max(6) }).parse(raw);
    const before = c.db.schedule.find((s) => s.groupId === p.groupId && s.weekday === p.weekday && s.slot === p.slot);
    if (!before) return fail("Занятие не найдено");
    repo.deleteSlot(c, p.groupId, p.weekday, p.slot);
    log(c, u, "schedule.delete", "schedule", `${p.groupId}|${p.weekday}|${p.slot}`, null, before);
    const g = c.db.groups.find((x) => x.id === p.groupId)!;
    const text = `${g.code}, ${WEEKDAYS[p.weekday - 1].toLowerCase()}, ${p.slot} пара отменена`;
    c.db.students.filter((s) => s.groupId === g.id).forEach((s) => notify(c, s.id, "schedule", "Изменение расписания", text, "/schedule/"));
    notify(c, before.teacherId, "schedule", "Изменение расписания", text, "/schedule/");
    return ok("Занятие удалено из расписания");
  }),
  "schedule.addChange": admin((c, u, raw) => {
    const p = z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      groupId: id,
      slot: z.number().int().min(1).max(8),
      kind: z.enum(["cancel", "substitute"]),
      newTeacherId: z.string().optional(),
      newRoom: z.string().max(80).optional(),
      note: z.string().max(200).optional(),
    }).parse(raw);
    if (!c.db.groups.some((g) => g.id === p.groupId)) return fail("Группа не найдена");
    if (p.newTeacherId && !c.db.teachers.some((t) => t.id === p.newTeacherId)) return fail("Преподаватель не найден");
    c.sql.prepare(
      "INSERT INTO schedule_changes (date, group_id, slot, kind, new_teacher_id, new_room, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(date, group_id, slot) DO UPDATE SET kind=excluded.kind, new_teacher_id=excluded.new_teacher_id, new_room=excluded.new_room, note=excluded.note, created_at=excluded.created_at"
    ).run(p.date, p.groupId, p.slot, p.kind, p.newTeacherId ?? null, p.newRoom ?? null, p.note ?? null, Date.now());
    const g = c.db.groups.find((x) => x.id === p.groupId)!;
    const slot = c.db.schedule.find((s) => s.groupId === p.groupId && s.slot === p.slot);
    const subj = slot ? (c.db.subjects.find((s) => s.id === slot.subjectId)?.name ?? "") : `${p.slot} пара`;
    const dateStr = p.date.split("-").reverse().join(".");
    const text = p.kind === "cancel" ? `${g.code}, ${dateStr}: ${subj} отменена` : `${g.code}, ${dateStr}: замена — ${subj}`;
    c.db.students.filter((s) => s.groupId === g.id).forEach((s) => notify(c, s.id, "schedule", "Изменение расписания", text, "/schedule/"));
    if (slot) notify(c, slot.teacherId, "schedule", "Изменение расписания", text, "/schedule/");
    if (p.newTeacherId && p.newTeacherId !== slot?.teacherId) notify(c, p.newTeacherId, "schedule", "Вы назначены на замену", text, "/schedule/");
    c.db.scheduleChanges = c.db.scheduleChanges.filter((x) => !(x.date === p.date && x.groupId === p.groupId && x.slot === p.slot));
    c.db.scheduleChanges.push({ id: 0, date: p.date, groupId: p.groupId, slot: p.slot, kind: p.kind, newTeacherId: p.newTeacherId, newRoom: p.newRoom, note: p.note, createdAt: Date.now() });
    return ok(p.kind === "cancel" ? "Пара отменена, студенты уведомлены" : "Замена добавлена, студенты уведомлены");
  }),
  "schedule.removeChange": admin((c, u, raw) => {
    const p = z.object({ date: z.string(), groupId: id, slot: z.number().int().min(1).max(8) }).parse(raw);
    c.sql.prepare("DELETE FROM schedule_changes WHERE date = ? AND group_id = ? AND slot = ?").run(p.date, p.groupId, p.slot);
    c.db.scheduleChanges = c.db.scheduleChanges.filter((x) => !(x.date === p.date && x.groupId === p.groupId && x.slot === p.slot));
    return ok("Замена удалена, расписание восстановлено");
  }),
  "settings.update": admin((c, u, raw) => {
    const md = z.string().regex(/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, "Формат ММ-ДД");
    const p = z.object({ semester1: z.object({ from: md, to: md }), semester2: z.object({ from: md, to: md }), finalGradeRule: z.enum(["mean_round", "mean_floor"]) }).parse(raw);
    log(c, u, "settings.update", "settings", "main", p, c.db.settings);
    repo.saveSettings(c, p);
    return ok("Настройки сохранены");
  }),
  "announcement.send": admin((c, u, raw) => {
    const p = z.object({ audience: z.string(), title: z.string().trim().min(3).max(120), text: z.string().trim().min(3).max(1000) }).parse(raw);
    let ids: string[] = [];
    if (p.audience === "all") ids = [...c.db.students, ...c.db.parents, ...c.db.teachers].map((x) => x.id);
    else if (p.audience === "students") ids = c.db.students.map((x) => x.id);
    else if (p.audience === "parents") ids = c.db.parents.map((x) => x.id);
    else if (p.audience === "teachers") ids = c.db.teachers.map((x) => x.id);
    else if (p.audience.startsWith("group:")) {
      const gid = p.audience.slice(6);
      const sts = c.db.students.filter((s) => s.groupId === gid);
      ids = [...sts.map((s) => s.id), ...sts.map((s) => s.parentId).filter(Boolean)];
    }
    if (!ids.length) return fail("Получатели не найдены");
    ids.forEach((x) => notify(c, x, "announcement", p.title, p.text, "/notifications/"));
    log(c, u, "announcement.send", "announcement", p.audience, { title: p.title, recipients: ids.length });
    return ok(`Объявление отправлено: ${ids.length} получателей`);
  }),
  "account.create": admin((c, u, raw) => {
    const p = z.object({ personId: id, login: z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,32}$/, "Логин: латиница, цифры, точка, дефис, 3-32 символа") }).parse(raw);
    let role: Role | null = null;
    if (c.db.students.some((x) => x.id === p.personId)) role = "student";
    else if (c.db.teachers.some((x) => x.id === p.personId)) role = "teacher";
    else if (c.db.parents.some((x) => x.id === p.personId)) role = "parent";
    if (!role) return fail("Человек не найден");
    if (findUserById(c.sql, p.personId)) return fail("У этого человека уже есть учётная запись");
    if (findUserByLogin(c.sql, p.login)) return fail("Логин занят");
    const temp = createAccount(c.sql, p.personId, p.login, role);
    log(c, u, "account.create", "user", p.personId, { login: p.login, role });
    return ok("Учётная запись создана", { login: p.login, tempPassword: temp });
  }),
  "account.resetPassword": admin((c, u, raw) => {
    const p = z.object({ id, requestId: z.number().optional() }).parse(raw);
    const user = findUserById(c.sql, p.id);
    if (!user) return fail("Учётная запись не найдена");
    if (user.role === "tech_admin" || user.role === "college_admin") return fail("Пароль сотрудника администрации сбрасывается техническим администратором");
    const temp = resetPassword(c.sql, p.id);
    if (p.requestId) closeResetRequest(c.sql, p.requestId);
    log(c, u, "account.resetPassword", "user", p.id, { mustChangePassword: true });
    return ok("Выдан временный пароль", { login: user.login, tempPassword: temp });
  }),
  "account.setActive": admin((c, u, raw) => {
    const p = z.object({ id, active: z.boolean() }).parse(raw);
    if (p.id === u.id) return fail("Нельзя заблокировать самого себя");
    const user = findUserById(c.sql, p.id);
    if (!user) return fail("Учётная запись не найдена");
    setActive(c.sql, p.id, p.active);
    log(c, u, p.active ? "account.unblock" : "account.block", "user", p.id, { active: p.active });
    return ok(p.active ? "Доступ восстановлен" : "Доступ заблокирован");
  }),
  "resetRequest.close": admin((c, u, raw) => {
    const p = z.object({ id: z.number() }).parse(raw);
    closeResetRequest(c.sql, p.id);
    return ok("Заявка закрыта");
  }),
  "import.studentsCsv": admin((c, u, raw) => {
    const p = z.object({ csv: z.string().max(200_000), dryRun: z.boolean().default(false) }).parse(raw);
    const lines = p.csv.replace(/^﻿/, "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length && /фио|name/i.test(lines[0])) lines.shift();
    const errors: string[] = [];
    const rows: { name: string; groupId: string; parent?: string }[] = [];
    lines.forEach((l, i) => {
      const [n, g, par] = l.split(/[;,\t]/).map((x) => x?.trim().replace(/^"|"$/g, ""));
      const group = c.db.groups.find((x) => x.code.toLowerCase() === (g ?? "").replace("-", "").toLowerCase());
      if (!n || n.split(/\s+/).length < 2) errors.push(`Строка ${i + 1}: нет ФИО`);
      else if (!group) errors.push(`Строка ${i + 1}: группа «${g ?? ""}» не найдена`);
      else rows.push({ name: n, groupId: group.id, parent: par });
    });
    if (errors.length) return fail(errors.slice(0, 8).join("\n") + (errors.length > 8 ? `\n…и ещё ${errors.length - 8}` : ""));
    if (!rows.length) return fail("Файл пустой");
    if (p.dryRun) return ok(`Проверка пройдена: ${rows.length} студентов`, { count: rows.length });
    rows.forEach((r) => addStudent(c, u, r.name, r.groupId, r.parent));
    return ok(`Импортировано студентов: ${rows.length}`);
  }),
};

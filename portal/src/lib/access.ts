// Права доступа. Единая точка: UI спрашивает здесь, хранилище проверяет здесь же перед записью.
import type { DB } from "./seed";
import type { ID, SessionUser } from "./types";

export function teacherLoads(db: DB, teacherId: ID) {
  return db.loads.filter((l) => l.teacherId === teacherId);
}

/** Преподаватель ставит оценки только по своей связке «предмет + группа» */
export function canEditJournal(db: DB, user: SessionUser | null, groupId: ID, subjectId: ID): boolean {
  if (!user || user.role !== "teacher") return false;
  return db.loads.some((l) => l.teacherId === user.id && l.groupId === groupId && l.subjectId === subjectId);
}

/** Студент для которого показываем данные: сам студент или ребёнок родителя */
export function viewedStudentId(db: DB, user: SessionUser | null): ID | null {
  if (!user) return null;
  if (user.role === "student") return user.id;
  if (user.role === "parent") return db.parents.find((p) => p.id === user.id)?.childIds[0] ?? null;
  return null;
}

/** С кем пользователь может переписываться */
export function contactsFor(db: DB, user: SessionUser): { id: ID; name: string; hint: string }[] {
  if (user.role === "student" || user.role === "parent") {
    const sid = viewedStudentId(db, user);
    const st = db.students.find((s) => s.id === sid);
    if (!st) return [];
    const map = new Map<ID, string[]>();
    db.loads.filter((l) => l.groupId === st.groupId).forEach((l) => {
      const subj = db.subjects.find((s) => s.id === l.subjectId)?.name ?? "";
      map.set(l.teacherId, [...(map.get(l.teacherId) ?? []), subj]);
    });
    return [...map.entries()]
      .map(([id, subjs]) => ({ id, name: db.teachers.find((t) => t.id === id)?.name ?? id, hint: subjs.join(", ") }))
      .sort((a, b) => a.name.localeCompare(b.name, "ru"));
  }
  if (user.role === "teacher") {
    const groupIds = new Set(teacherLoads(db, user.id).map((l) => l.groupId));
    const out: { id: ID; name: string; hint: string }[] = [];
    db.students.filter((s) => groupIds.has(s.groupId)).forEach((s) => {
      const g = db.groups.find((x) => x.id === s.groupId)?.code ?? "";
      out.push({ id: s.id, name: s.name, hint: `Студент, ${g}` });
      const p = db.parents.find((x) => x.id === s.parentId);
      if (p) out.push({ id: p.id, name: p.name, hint: `Родитель, ${g}` });
    });
    return out;
  }
  return db.teachers.map((t) => ({ id: t.id, name: t.name, hint: "Преподаватель" }));
}

export function canMessage(db: DB, user: SessionUser | null, to: ID): boolean {
  if (!user) return false;
  if (db.messages.some((m) => m.from === to && m.to === user.id)) return true; // ответить можно всегда
  return contactsFor(db, user).some((c) => c.id === to);
}

export function nameOf(db: DB, id: ID): string {
  return (
    db.teachers.find((x) => x.id === id)?.name ??
    db.students.find((x) => x.id === id)?.name ??
    db.parents.find((x) => x.id === id)?.name ??
    (id === "admin" ? "Администрация колледжа" : id)
  );
}

"use client";
import { useStore } from "@/lib/store";
import { viewedStudentId } from "@/lib/access";

/** Для кабинетов студента и родителя: чьи данные показываем */
export function useViewer() {
  const store = useStore();
  const { db, session } = store;
  const sid = viewedStudentId(db, session);
  const student = db.students.find((s) => s.id === sid) ?? null;
  const group = student ? db.groups.find((g) => g.id === student.groupId) ?? null : null;
  return { ...store, student, group, isParent: session?.role === "parent" };
}

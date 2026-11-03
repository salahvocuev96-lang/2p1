"use client";
import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { teacherLoads } from "@/lib/access";

/** Нагрузка преподавателя определяется автоматически из расписания */
export function useTeacher() {
  const store = useStore();
  const { db, session } = store;
  const loads = useMemo(() => teacherLoads(db, session!.id), [db, session]);
  const groups = useMemo(() => db.groups.filter((g) => loads.some((l) => l.groupId === g.id)), [db, loads]);
  const subjects = useMemo(() => db.subjects.filter((s) => loads.some((l) => l.subjectId === s.id)), [db, loads]);
  return { ...store, loads, groups, subjects };
}

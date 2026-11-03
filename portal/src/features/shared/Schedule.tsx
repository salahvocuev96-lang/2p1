"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { viewedStudentId } from "@/lib/access";
import { Card, PageHeader, Select, cx } from "@/components/ui";
import { BELLS, WEEKDAYS, weekday, today } from "@/lib/dates";
import { groupLessons, teacherLessons, type LessonView } from "@/lib/queries";
import { addDays, startOfWeek } from "@/lib/dates";

/** Недельное расписание: для студента и родителя по группе, для преподавателя по его парам */
export function Schedule() {
  const { db, session } = useStore();
  const sid = viewedStudentId(db, session);
  const defaultGroup = db.students.find((s) => s.id === sid)?.groupId ?? db.groups[0].id;
  const [groupId, setGroupId] = useState(defaultGroup);
  const isTeacher = session?.role === "teacher";
  const isAdmin = session?.role === "admin";
  const week = startOfWeek(today());
  const todayWd = weekday(today());

  const byDay: LessonView[][] = WEEKDAYS.map((_, i) => {
    const d = addDays(week, i);
    return isTeacher ? teacherLessons(db, session!.id, d) : groupLessons(db, groupId, d);
  });

  return (
    <div>
      <PageHeader
        title="Расписание"
        subtitle={isTeacher ? "Ваши пары на неделю во всех группах" : `Группа ${db.groups.find((g) => g.id === groupId)?.code}. Время пар: ${BELLS[0]}, далее с перерывами`}
        action={isAdmin && (
          <Select value={groupId} onChange={(e) => setGroupId(e.target.value)} className="w-32">
            {db.groups.map((g) => <option key={g.id} value={g.id}>{g.code}</option>)}
          </Select>
        )}
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {byDay.map((lessons, i) => (
          <Card key={i} className={cx("overflow-hidden", todayWd === i + 1 && "ring-2 ring-gold-500")}>
            <div className={cx("flex items-center justify-between px-5 py-3", todayWd === i + 1 ? "bg-brand-900 text-white" : "border-b border-line")}>
              <p className="font-semibold">{WEEKDAYS[i]}</p>
              <p className={cx("text-xs", todayWd === i + 1 ? "text-gold-400" : "text-muted")}>{todayWd === i + 1 ? "Сегодня" : `${lessons.length} пар`}</p>
            </div>
            {lessons.length === 0 ? <p className="px-5 py-6 text-sm text-muted">Пар нет</p> : (
              <ul className="divide-y divide-line">
                {lessons.map((l) => (
                  <li key={l.slot + l.groupId} className="flex gap-3 px-5 py-3">
                    <div className="w-[72px] shrink-0">
                      <p className="text-[13px] font-bold text-brand-900">{l.slot} пара</p>
                      <p className="text-[11px] text-muted">{l.time}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-snug">{l.subject}</p>
                      <p className="text-xs text-muted">{isTeacher ? `Группа ${l.group}` : l.teacher}{l.room && ` · каб. ${l.room}`}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

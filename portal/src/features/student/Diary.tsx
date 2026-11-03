"use client";
import { useMemo, useState } from "react";
import { useViewer } from "../useViewer";
import { Button, Card, GradeChip, PageHeader, cx } from "@/components/ui";
import { Icon } from "@/components/icons";
import { addDays, formatLong, formatShort, startOfWeek, today, WEEKDAYS } from "@/lib/dates";
import { groupLessons } from "@/lib/queries";
import { key } from "@/lib/seed";
import { ATT_META } from "@/features/shared/attendance";

export function Diary() {
  const { db, version, student } = useViewer();
  const now = today();
  const [week, setWeek] = useState(startOfWeek(now));
  const days = useMemo(() => Array.from({ length: 6 }, (_, i) => addDays(week, i)), [week]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const hwByDue = useMemo(() => db.homework.filter((h) => h.groupId === student?.groupId), [db, version, student]);
  if (!student) return null;

  return (
    <div>
      <PageHeader
        title="Электронный дневник"
        subtitle={`Неделя ${formatLong(week)} - ${formatLong(addDays(week, 5))}`}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setWeek(addDays(week, -7))} aria-label="Предыдущая неделя"><Icon name="chevronLeft" className="size-4" /></Button>
            <Button variant="outline" onClick={() => setWeek(startOfWeek(now))}>Текущая неделя</Button>
            <Button variant="outline" onClick={() => setWeek(addDays(week, 7))} aria-label="Следующая неделя"><Icon name="chevronRight" className="size-4" /></Button>
          </div>
        }
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {days.map((d, i) => {
          const lessons = groupLessons(db, student.groupId, d);
          const isToday = d === now;
          return (
            <Card key={d} className={cx("overflow-hidden", isToday && "ring-2 ring-gold-500")}>
              <div className={cx("flex items-center justify-between px-5 py-3", isToday ? "bg-brand-900 text-white" : "border-b border-line")}>
                <p className="font-semibold">{WEEKDAYS[i]}</p>
                <p className={cx("text-sm", isToday ? "text-gold-400" : "text-muted")}>{isToday ? "Сегодня" : formatShort(d)}</p>
              </div>
              {lessons.length === 0 ? <p className="px-5 py-6 text-sm text-muted">Пар нет</p> : (
                <ul className="divide-y divide-line">
                  {lessons.map((l) => {
                    const k = key(student.id, l.subjectId, d);
                    const g = db.grades[k];
                    const a = db.attendance[k];
                    const hw = hwByDue.find((h) => h.subjectId === l.subjectId && h.due === d);
                    return (
                      <li key={l.slot} className="flex gap-3 px-5 py-3">
                        <span className="mt-0.5 w-5 shrink-0 text-center text-sm font-bold text-gold-600">{l.slot}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium leading-snug">{l.subject}</p>
                          <p className="text-xs text-muted">{l.time}{l.room && ` · каб. ${l.room}`}</p>
                          {hw && <p className="mt-1 text-xs text-brand-700"><span className="font-semibold">ДЗ:</span> {hw.text}</p>}
                        </div>
                        <div className="flex shrink-0 items-start gap-1">
                          {a && <span className={cx("grid size-7 place-items-center rounded-lg text-xs font-bold", ATT_META[a.status].chip)} title={ATT_META[a.status].label}>{ATT_META[a.status].short}</span>}
                          {g && <GradeChip value={g.value} size="sm" />}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

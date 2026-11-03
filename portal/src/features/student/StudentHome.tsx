"use client";
import Link from "next/link";
import { useMemo } from "react";
import { useViewer } from "../useViewer";
import { Card, HeroCard, CardHeader, Empty, GradeChip, StatCard } from "@/components/ui";
import { attendanceSummary, gradesOf, studentAverage, fmtAvg } from "@/lib/stats";
import { formatLong, formatShort, formatWithWeekday, semesterPeriod, today } from "@/lib/dates";
import { groupLessons, nextSchoolDay, subjectName } from "@/lib/queries";
import { SPECIALTIES } from "@/lib/seed";
import { key } from "@/lib/seed";

export function StudentHome() {
  const { db, version, student, group, isParent } = useViewer();
  const now = today();
  const data = useMemo(() => {
    if (!student || !group) return null;
    const sem = semesterPeriod(now);
    const day = nextSchoolDay(now);
    return {
      sem,
      day,
      avg: studentAverage(db, student.id, { period: sem }),
      att: attendanceSummary(db, student.id, sem, now),
      lessons: groupLessons(db, group.id, day),
      recent: gradesOf(db, student.id).slice(-8).reverse(),
      hw: db.homework.filter((h) => h.groupId === group.id && h.due >= now && !db.homeworkDone[`${h.id}|${student.id}`]).sort((a, b) => a.due.localeCompare(b.due)),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, version, student, group, now]);
  if (!student || !group || !data) return <Card><Empty title="Студент не найден" /></Card>;

  const firstName = student.name.split(" ")[1];
  return (
    <div className="space-y-6">
      <HeroCard>
        <p className="text-sm text-white/60">{formatWithWeekday(now)}</p>
        <h1 className="mt-1 text-2xl font-bold md:text-3xl">
          {isParent ? `Успеваемость: ${student.name.split(" ").slice(0, 2).join(" ")}` : `Здравствуйте, ${firstName}!`}
        </h1>
        <div className="mt-4 flex flex-wrap gap-2 text-[13px]">
          <span className="rounded-full bg-gold-500 px-3 py-1 font-bold text-brand-950">Группа {group.code}</span>
          <span className="rounded-full bg-white/10 px-3 py-1">{group.course} курс</span>
          <span className="rounded-full bg-white/10 px-3 py-1">{SPECIALTIES[group.specialty] ?? group.specialty}</span>
        </div>
      </HeroCard>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Средний балл" value={fmtAvg(data.avg)} hint={data.sem.label} icon="star" tone="gold" />
        <StatCard label="Посещаемость" value={`${data.att.rate}%`} hint={`${data.att.absent} Н, ${data.att.sick} Б`} icon="check" tone={data.att.rate >= 90 ? "green" : "red"} />
        <StatCard label="Пар сегодня" value={data.day === now ? data.lessons.length : 0} hint={data.day === now ? "по расписанию" : "сегодня выходной"} icon="calendar" />
        <StatCard label="Задания" value={data.hw.length} hint="ещё не сданы" icon="task" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader icon="calendar" title={data.day === now ? "Расписание на сегодня" : `Расписание на ${formatLong(data.day)}`} action={<Link href="/schedule/" className="text-[13px] font-semibold text-gold-600">Вся неделя</Link>} />
          {data.lessons.length === 0 ? (
            <Empty icon="calendar" title="Пар нет" />
          ) : (
            <ul className="divide-y divide-line">
              {data.lessons.map((l) => {
                const g = db.grades[key(student.id, l.subjectId, data.day)];
                return (
                  <li key={l.slot} className="flex items-center gap-4 px-5 py-3.5">
                    <div className="w-[78px] shrink-0">
                      <p className="text-[13px] font-bold text-brand-900">{l.slot} пара</p>
                      <p className="text-xs text-muted">{l.time}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-ink">{l.subject}</p>
                      <p className="truncate text-xs text-muted">{l.teacher}{l.room && ` · каб. ${l.room}`}</p>
                    </div>
                    {g && <GradeChip value={g.value} size="sm" />}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader icon="star" title="Последние оценки" action={<Link href="/grades/" className="text-[13px] font-semibold text-gold-600">Все оценки</Link>} />
          {data.recent.length === 0 ? (
            <Empty icon="star" title="Оценок пока нет" />
          ) : (
            <ul className="divide-y divide-line">
              {data.recent.map((g) => (
                <li key={g.subjectId + g.date} className="flex items-center gap-3 px-5 py-3">
                  <GradeChip value={g.value} size="sm" />
                  <p className="min-w-0 flex-1 truncate text-sm">{subjectName(db, g.subjectId)}</p>
                  <span className="text-xs text-muted">{formatShort(g.date)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader icon="task" title="Домашние задания" action={<Link href="/homework/" className="text-[13px] font-semibold text-gold-600">Все задания</Link>} />
        {data.hw.length === 0 ? (
          <Empty icon="task" title="Все задания сданы" />
        ) : (
          <ul className="grid gap-3 p-4 md:grid-cols-2">
            {data.hw.slice(0, 4).map((h) => (
              <li key={h.id} className="rounded-xl border border-line p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-brand-900">{subjectName(db, h.subjectId)}</p>
                  <span className="shrink-0 rounded-full bg-gold-50 px-2.5 py-0.5 text-xs font-semibold text-gold-600">до {formatShort(h.due)}</span>
                </div>
                <p className="mt-1.5 text-sm text-muted">{h.text}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>

    </div>
  );
}

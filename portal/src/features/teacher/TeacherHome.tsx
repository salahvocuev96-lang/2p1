"use client";
import Link from "next/link";
import { useTeacher } from "./useTeacher";
import { AvgBadge, Card, HeroCard, CardHeader, Empty, StatCard } from "@/components/ui";
import { formatLong, formatWithWeekday, semesterPeriod, today } from "@/lib/dates";
import { nextSchoolDay, teacherLessons } from "@/lib/queries";
import { groupAverage } from "@/lib/stats";

export function TeacherHome() {
  const { db, session, loads, groups, subjects } = useTeacher();
  const now = today();
  const day = nextSchoolDay(now);
  const lessons = teacherLessons(db, session!.id, day);
  const sem = semesterPeriod(now);
  const students = db.students.filter((s) => groups.some((g) => g.id === s.groupId)).length;
  const unread = db.messages.filter((m) => m.to === session!.id && !m.read).length;
  const weekly = db.schedule.filter((s) => s.teacherId === session!.id).length;

  return (
    <div className="space-y-6">
      <HeroCard>
        <p className="text-sm text-white/60">{formatWithWeekday(now)}</p>
        <h1 className="mt-1 text-2xl font-bold md:text-3xl">Добрый день, {session!.name}</h1>
        <p className="mt-2 text-sm text-white/70">Нагрузка определена по расписанию: {groups.length} групп, {subjects.length} предметов, {weekly} пар в неделю</p>
        <Link href="/journal/" className="mt-5 inline-flex h-11 items-center rounded-xl bg-gold-500 px-5 text-sm font-semibold text-brand-950 hover:bg-gold-400">Открыть журнал</Link>
      </HeroCard>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Мои группы" value={groups.length} icon="users" />
        <StatCard label="Студентов" value={students} icon="user" />
        <StatCard label="Пар сегодня" value={day === now ? lessons.length : 0} icon="calendar" tone="gold" />
        <StatCard label="Новые сообщения" value={unread} icon="chat" tone={unread ? "red" : "green"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader icon="calendar" title={day === now ? "Мои пары сегодня" : `Пары на ${formatLong(day)}`} />
          {lessons.length === 0 ? <Empty icon="calendar" title="Пар нет" /> : (
            <ul className="divide-y divide-line">
              {lessons.map((l) => (
                <li key={l.slot + l.groupId} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="w-[78px] shrink-0"><p className="text-[13px] font-bold text-brand-900">{l.slot} пара</p><p className="text-xs text-muted">{l.time}</p></div>
                  <div className="min-w-0 flex-1"><p className="truncate font-medium">{l.subject}</p><p className="text-xs text-muted">Группа {l.group}{l.room && ` · каб. ${l.room}`}</p></div>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <CardHeader icon="chart" title="Успеваемость групп" action={<span className="text-xs text-muted">{sem.label}</span>} />
          <ul className="divide-y divide-line">
            {groups.map((g) => {
              const subjIds = loads.filter((l) => l.groupId === g.id).map((l) => l.subjectId);
              const vals = subjIds.map((sid) => groupAverage(db, g.id, { subjectId: sid, period: sem })).filter((v): v is number => v !== null);
              return (
                <li key={g.id} className="flex items-center justify-between px-5 py-3">
                  <span><span className="font-semibold text-brand-900">{g.code}</span> <span className="text-xs text-muted">{g.course} курс</span></span>
                  <AvgBadge value={vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null} />
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </div>
  );
}

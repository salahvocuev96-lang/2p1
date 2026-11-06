"use client";
import Link from "next/link";
import { useTeacher } from "./useTeacher";
import { AvgBadge, Card, CardHeader, Empty, Hero, MoreLink, avgBarTone, cx, heroBtn } from "@/components/ui";
import { Icon } from "@/components/icons";
import { addDays, formatTime, formatWithWeekday, semesterPeriod } from "@/lib/dates";
import { nextSchoolDay, teacherLessons } from "@/lib/queries";
import { groupAverage } from "@/lib/stats";
import { nameOf } from "@/lib/access";
import { key } from "@/lib/constants";
import { LessonTimeline, NowCard, useNowMinutes, type DayLesson } from "@/features/shared/Today";

export function TeacherHome() {
  const { db, session, loads, groups, subjects } = useTeacher();
  const now = db.serverToday;
  const nowMin = useNowMinutes();
  // Если сегодня пар нет, показываем ближайший день, в который они есть
  let day = nextSchoolDay(now);
  let lessons = teacherLessons(db, session!.id, day);
  for (let i = 1; i <= 7 && lessons.length === 0; i++) {
    const d = nextSchoolDay(addDays(now, i));
    const ls = teacherLessons(db, session!.id, d);
    if (ls.length) { day = d; lessons = ls; }
  }
  const isToday = day === now;
  const sem = semesterPeriod(now, db.settings);
  // Необходимые действия: сегодняшние занятия без единой отметки, непрочитанные письма
  const todo: { text: string; href: string; icon: "journal" | "chat" | "task" }[] = [];
  if (day === now) {
    const seen = new Set<string>();
    for (const l of lessons) {
      const id = l.groupId + l.subjectId;
      if (seen.has(id) || !db.subjects.find((x) => x.id === l.subjectId)?.graded) continue;
      seen.add(id);
      const sts = db.students.filter((x) => x.groupId === l.groupId);
      const filled = sts.some((x) => db.grades[key(x.id, l.subjectId, now)] || db.attendance[key(x.id, l.subjectId, now)]);
      if (!filled) todo.push({ text: `Заполнить журнал: ${l.group}, «${l.subject}»`, href: `/journal/?group=${l.groupId}&subject=${l.subjectId}&date=${now}`, icon: "journal" });
    }
  }
  const lastMessages = [...db.messages].filter((m) => m.to === session!.id).sort((a, b) => b.at - a.at).slice(0, 4);
  const students = db.students.filter((s) => groups.some((g) => g.id === s.groupId)).length;
  const unread = db.messages.filter((m) => m.to === session!.id && !m.read).length;
  const weekly = db.schedule.filter((s) => s.teacherId === session!.id).length;

  const todayCount = isToday ? lessons.filter((l) => l.changeKind !== "cancel").length : 0;
  // Потоковая пара (один предмет у нескольких групп в одно время) показывается одной строкой
  const merged = new Map<string, typeof lessons>();
  for (const l of lessons) {
    const k = `${l.slot}|${l.subjectId}|${l.changeKind ?? ""}`;
    merged.set(k, [...(merged.get(k) ?? []), l]);
  }
  const dayLessons: DayLesson[] = [...merged.values()].map((ls) => {
    const l = ls[0];
    const rooms = [...new Set(ls.map((x) => x.room).filter(Boolean))].join(", ");
    return {
      key: l.slot + l.groupId,
      slot: l.slot,
      title: l.subject,
      meta: <>{ls.length > 1 ? "Группы" : "Группа"} {ls.map((x) => x.group).join(", ")}{rooms && ` · ауд. ${rooms}`}</>,
      href: isToday ? `/journal/?group=${l.groupId}&subject=${l.subjectId}&date=${day}` : "/schedule/",
      cancelled: l.changeKind === "cancel",
      substitute: l.changeKind === "substitute",
      note: l.changeNote,
      right: <Icon name="chevronRight" className="size-4 shrink-0 text-slate-300 transition-colors group-hover:text-brand-600" />,
    };
  });
  const groupRows = groups.map((g) => {
    const subjIds = loads.filter((l) => l.groupId === g.id).map((l) => l.subjectId);
    const vals = subjIds.map((sid) => groupAverage(db, g.id, { subjectId: sid, period: sem })).filter((v): v is number => v !== null);
    return { g, avg: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null, n: db.students.filter((s) => s.groupId === g.id).length };
  });

  return (
    <div className="stagger space-y-4 sm:space-y-5">
      <Hero
        eyebrow="Кабинет преподавателя"
        title={<>Добрый день, {session!.name}</>}
        meta={<span>{groups.length} групп · {subjects.length} предметов · {weekly} пар в неделю</span>}
        actions={<>
          <Link href="/journal/" className={heroBtn(true)}><Icon name="journal" className="size-4" />Открыть журнал</Link>
          <Link href="/homework/" className={heroBtn()}><Icon name="task" className="size-4" />Задания</Link>
          <Link href="/attendance/" className={cx(heroBtn(), "max-sm:hidden")}><Icon name="check" className="size-4" />Посещаемость</Link>
        </>}
        aside={<NowCard lessons={dayLessons} isToday={isToday} nowMin={nowMin} dayLabel={formatWithWeekday(day)} />}
        metrics={[
          { label: "Мои группы", value: groups.length, hint: `${students} студентов` },
          { label: "Пар сегодня", value: todayCount, hint: isToday ? "по расписанию" : "сегодня нет пар" },
          { label: "Пар в неделю", value: weekly, hint: `${subjects.length} предметов` },
          { label: "Новые сообщения", value: unread, hint: unread ? "ждут ответа" : "всё прочитано" },
        ]}
      />

      <div className="grid gap-4 sm:gap-5 lg:grid-cols-12">
        <div className="min-w-0 space-y-4 sm:space-y-5 lg:col-span-7">
          <Card>
            <CardHeader icon="calendar" title={isToday ? "Мои пары сегодня" : `Ближайшие пары: ${formatWithWeekday(day).toLowerCase()}`} subtitle={isToday ? "Нажмите на пару, чтобы открыть журнал" : "Сегодня у вас занятий нет"} action={<Link href="/schedule/"><MoreLink>Неделя</MoreLink></Link>} />
            {dayLessons.length === 0 ? <Empty icon="calendar" title="На этой неделе пар нет" /> : <LessonTimeline lessons={dayLessons} isToday={isToday} nowMin={nowMin} />}
          </Card>
          <Card>
            <CardHeader icon="chat" title="Последние сообщения" action={<Link href="/messages/"><MoreLink>Все</MoreLink></Link>} />
            {lastMessages.length === 0 ? <Empty icon="chat" title="Сообщений нет" /> : (
              <ul className="divide-y divide-line">
                {lastMessages.map((m) => (
                  <li key={m.id}>
                    <Link href="/messages/" className="flex items-start gap-3 px-4 py-3 text-sm transition-colors hover:bg-subtle sm:px-5">
                      <span className={cx("mt-1.5 size-2 shrink-0 rounded-full", m.read ? "bg-transparent" : "bg-brand-600")} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-3">
                          <span className={cx("truncate", m.read ? "text-ink" : "font-semibold text-ink")}>{nameOf(db, m.from)}</span>
                          <span className="shrink-0 text-xs tabular-nums text-muted">{formatTime(m.at)}</span>
                        </span>
                        <span className="mt-0.5 block truncate text-[13px] text-muted">{m.text}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
        <div className="min-w-0 space-y-4 sm:space-y-5 lg:col-span-5">
          <Card>
            <CardHeader icon="alert" tone="gold" title="Необходимые действия" subtitle={todo.length + (unread ? 1 : 0) ? `${todo.length + (unread ? 1 : 0)} в списке` : undefined} />
            {todo.length === 0 && unread === 0 ? <Empty icon="check" title="Всё сделано" text="Журнал за сегодня заполнен, новых сообщений нет" /> : (
              <ul className="divide-y divide-line">
                {todo.map((t) => (
                  <li key={t.href}><Link href={t.href} className="flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-subtle sm:px-5"><span className="grid size-8 shrink-0 place-items-center rounded-md bg-gold-50 text-gold-700"><Icon name={t.icon} className="size-4" /></span><span className="min-w-0 flex-1">{t.text}</span><Icon name="chevronRight" className="size-4 shrink-0 text-muted" /></Link></li>
                ))}
                {unread > 0 && <li><Link href="/messages/" className="flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-subtle sm:px-5"><span className="grid size-8 shrink-0 place-items-center rounded-md bg-gold-50 text-gold-700"><Icon name="chat" className="size-4" /></span><span className="flex-1">Ответить на сообщения: {unread}</span><Icon name="chevronRight" className="size-4 text-muted" /></Link></li>}
              </ul>
            )}
          </Card>
          <Card>
            <CardHeader icon="chart" title="Успеваемость групп" subtitle={`Средний балл по вашим предметам · ${sem.label}`} action={<Link href="/groups/"><MoreLink>Группы</MoreLink></Link>} />
            <ul className="divide-y divide-line">
              {groupRows.map(({ g, avg, n }) => (
                <li key={g.id} className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 sm:px-5">
                  <span className="text-sm font-semibold text-ink">{g.code}<span className="block text-[11px] font-normal text-muted">{n} студ.</span></span>
                  <span className="h-1.5 overflow-hidden rounded-full bg-slate-100"><span className={cx("bar-x block h-full rounded-full", avg === null ? "" : avgBarTone(avg))} style={{ width: `${((avg ?? 0) / 5) * 100}%` }} /></span>
                  <AvgBadge value={avg} />
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

"use client";
import Link from "next/link";
import { useMemo } from "react";
import { useViewer } from "../useViewer";
import { Card, CardHeader, Empty, GradeChip, Hero, MeterRow, MoreLink, avgBarTone, cx, heroBtn } from "@/components/ui";
import { attendanceSummary, gradesOf, studentAverage, subjectAverages, fmtAvg, average } from "@/lib/stats";
import { formatLong, formatShort, formatTime, formatWithWeekday, semesterPeriod, fromISO, MONTHS } from "@/lib/dates";
import { groupLessons, homeworkStatus, nextSchoolDay, subjectName, HW_STATUS_META } from "@/lib/queries";
import { KIND_ICON } from "@/components/AppShell";
import { Icon } from "@/components/icons";
import { SPECIALTIES } from "@/lib/constants";
import { key } from "@/lib/constants";
import { LessonTimeline, NowCard, useNowMinutes, type DayLesson } from "@/features/shared/Today";

const HW_DOT = { brand: "bg-brand-500", gold: "bg-gold-500", green: "bg-emerald-500", red: "bg-rose-500" } as const;

export function StudentHome() {
  const { db, version, student, group, isParent } = useViewer();
  const now = db.serverToday;
  const nowMin = useNowMinutes();
  const data = useMemo(() => {
    if (!student || !group) return null;
    const sem = semesterPeriod(now, db.settings);
    const day = nextSchoolDay(now);
    const semGrades = gradesOf(db, student.id, { period: sem });
    const bySubject = [...subjectAverages(db, student.id, sem)]
      .map(([id, vals]) => ({ id, name: subjectName(db, id), avg: average(vals) ?? 0, count: vals.length }))
      .sort((a, b) => b.avg - a.avg);
    const byMonth = new Map<string, number[]>();
    for (const g of semGrades) { const k = g.date.slice(0, 7); byMonth.set(k, [...(byMonth.get(k) ?? []), g.value]); }
    const months = [...byMonth].sort(([a], [b]) => a.localeCompare(b)).slice(-6).map(([k, v]) => ({ k, label: MONTHS[fromISO(`${k}-01`).getMonth()].slice(0, 3), avg: average(v) ?? 0 }));
    const dist = [5, 4, 3, 2].map((v) => ({ v, n: semGrades.filter((g) => g.value === v).length }));
    const allHw = db.homework.filter((h) => h.groupId === group.id);
    const doneHw = allHw.filter((h) => homeworkStatus(db, h, student.id, now) === "done").length;
    return {
      sem, day, bySubject, months, dist, doneHw, totalHw: allHw.length,
      avg: studentAverage(db, student.id, { period: sem }),
      att: attendanceSummary(db, student.id, sem, now),
      lessons: groupLessons(db, group.id, day),
      recent: gradesOf(db, student.id).slice(-8).reverse(),
      hw: allHw.filter((h) => h.due >= now && homeworkStatus(db, h, student.id, now) !== "done").sort((a, b) => a.due.localeCompare(b.due)),
      notes: [...db.notifications].sort((a, b) => b.at - a.at).slice(0, 4),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, version, student, group, now]);
  if (!student || !group || !data) return <Card><Empty title="Студент не найден" /></Card>;

  const firstName = student.name.split(" ")[1];
  const isToday = data.day === now;
  const avgPct = data.avg === null ? 0 : (data.avg / 5) * 100;
  const hwPct = data.totalHw ? Math.round((data.doneHw / data.totalHw) * 100) : 100;
  const distTotal = data.dist.reduce((a, d) => a + d.n, 0);
  const att = data.att;
  const attParts = [
    { n: att.present, label: "Присутствовал", cls: "bg-emerald-500" },
    { n: att.late, label: "Опоздания", cls: "bg-gold-500" },
    { n: att.sick, label: "По болезни", cls: "bg-sky-500" },
    { n: att.absent, label: "Пропуски", cls: "bg-rose-500" },
  ];
  const dayLessons: DayLesson[] = data.lessons.map((l) => {
    const g = db.grades[key(student.id, l.subjectId, data.day)];
    return {
      key: String(l.slot),
      slot: l.slot,
      title: l.subject,
      meta: <>{l.teacher}{l.room && ` · каб. ${l.room}`}</>,
      cancelled: l.changeKind === "cancel",
      substitute: l.changeKind === "substitute",
      note: l.changeNote,
      right: g ? <GradeChip value={g.value} size="sm" /> : undefined,
    };
  });
  const dayTitle = isToday ? "Сегодня" : formatWithWeekday(data.day);

  return (
    <div className="stagger space-y-4 sm:space-y-5">
      <Hero
        eyebrow={isParent ? "Кабинет родителя" : "Кабинет студента"}
        title={isParent ? <>Успеваемость: {student.name.split(" ").slice(0, 2).join(" ")}</> : <>Здравствуйте, {firstName}!</>}
        meta={<>
          <span className="rounded-md bg-white/10 px-2 py-0.5 font-semibold text-white">{group.code}</span>
          <span>{group.course} курс</span><span className="text-white/30">·</span>
          <span>{data.sem.label}</span><span className="hidden text-white/30 sm:inline">·</span>
          <span className="hidden truncate sm:inline">{SPECIALTIES[group.specialty] ?? group.specialty}</span>
        </>}
        actions={<>
          <Link href="/diary/" className={heroBtn(true)}><Icon name="book" className="size-4" />Дневник</Link>
          <Link href="/schedule/" className={heroBtn()}><Icon name="calendar" className="size-4" />Расписание</Link>
          <Link href="/grades/" className={cx(heroBtn(), "max-sm:hidden")}><Icon name="star" className="size-4" />Оценки</Link>
        </>}
        aside={<NowCard lessons={dayLessons} isToday={isToday} nowMin={nowMin} dayLabel={formatWithWeekday(data.day)} />}
        metrics={[
          { label: "Средний балл", value: fmtAvg(data.avg), hint: data.sem.label, progress: avgPct, tone: data.avg !== null && data.avg >= 3.5 ? "green" : "gold" },
          { label: "Посещаемость", value: `${att.rate}%`, hint: `${att.absent} Н · ${att.sick} Б`, progress: att.rate, tone: att.rate >= 90 ? "green" : "red" },
          { label: isToday ? "Пар сегодня" : "Пар в учебный день", value: data.lessons.filter((l) => l.changeKind !== "cancel").length, hint: isToday ? "по расписанию" : formatLong(data.day) },
          { label: "Задания к сдаче", value: data.hw.length, hint: `сдано ${data.doneHw} из ${data.totalHw}`, progress: hwPct, tone: "blue" },
        ]}
      />

      <div className="grid gap-4 sm:gap-5 lg:grid-cols-2 xl:grid-cols-12">
        <div className="min-w-0 space-y-4 sm:space-y-5 xl:col-span-5">
          <Card>
            <CardHeader icon="calendar" title={isToday ? "Расписание на сегодня" : `Расписание: ${dayTitle}`} subtitle={`${data.lessons.length} ${data.lessons.length === 1 ? "пара" : data.lessons.length < 5 ? "пары" : "пар"}`} action={<Link href="/schedule/"><MoreLink>Неделя</MoreLink></Link>} />
            {dayLessons.length === 0 ? <Empty icon="calendar" title="Пар нет" text="Можно отдохнуть или заняться заданиями" /> : <LessonTimeline lessons={dayLessons} isToday={isToday} nowMin={nowMin} />}
          </Card>

          <Card>
            <CardHeader icon="task" tone="gold" title="Ближайшие задания" subtitle={`сдано ${data.doneHw} из ${data.totalHw}`} action={<Link href="/homework/"><MoreLink>Все</MoreLink></Link>} />
            {data.hw.length === 0 ? (
              <Empty icon="task" title="Все задания сданы" text="Новые задания появятся здесь" />
            ) : (
              <ul className="divide-y divide-line">
                {data.hw.slice(0, 4).map((h) => {
                  const st = homeworkStatus(db, h, student.id, now);
                  const meta = HW_STATUS_META[st];
                  const days = Math.round((fromISO(h.due).getTime() - fromISO(now).getTime()) / 86_400_000);
                  const urgent = days <= 1;
                  return (
                    <li key={h.id}>
                      <Link href="/homework/" className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-subtle sm:px-5">
                        <span className={cx("mt-0.5 flex w-11 shrink-0 flex-col items-center rounded-md py-1 text-center leading-none", urgent ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-600")}>
                          <span className="text-[15px] font-bold tabular-nums">{fromISO(h.due).getDate()}</span>
                          <span className="mt-0.5 text-[10px] font-medium">{MONTHS[fromISO(h.due).getMonth()].slice(0, 3).toLowerCase()}</span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-medium text-ink">{h.title}</span>
                          <span className="mt-0.5 block truncate text-xs text-muted">{subjectName(db, h.subjectId)}</span>
                          <span className="mt-1 inline-flex items-center gap-1.5 text-[11px] text-muted"><span className={cx("size-1.5 rounded-full", HW_DOT[meta.tone])} />{meta.label} · {days <= 0 ? "сдать сегодня" : days === 1 ? "сдать завтра" : `через ${days} дн.`}</span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        <div className="min-w-0 space-y-4 sm:space-y-5 xl:col-span-4">
          <Card>
            <CardHeader icon="star" title="Последние оценки" action={<Link href="/grades/"><MoreLink>Все</MoreLink></Link>} />
            {distTotal > 0 && (
              <div className="border-b border-line px-4 py-3 sm:px-5">
                <div className="flex h-2 overflow-hidden rounded-full bg-slate-100">
                  {data.dist.map((d) => d.n > 0 && <div key={d.v} className={cx("bar-x h-full", d.v === 5 ? "bg-blue-500" : d.v === 4 ? "bg-emerald-500" : d.v === 3 ? "bg-orange-400" : "bg-rose-500")} style={{ width: `${(d.n / distTotal) * 100}%` }} />)}
                </div>
                <div className="mt-2 flex justify-between text-xs text-muted">
                  {data.dist.map((d) => <span key={d.v} className="tabular-nums"><b className="font-semibold text-ink">«{d.v}»</b> × {d.n}</span>)}
                </div>
              </div>
            )}
            {data.recent.length === 0 ? (
              <Empty icon="star" title="Оценок пока нет" text="Они появятся после первых занятий" />
            ) : (
              <ul className="divide-y divide-line">
                {data.recent.slice(0, 6).map((g) => (
                  <li key={g.subjectId + g.date} className="flex items-center gap-3 px-4 py-2 sm:px-5">
                    <GradeChip value={g.value} size="sm" />
                    <p className="min-w-0 flex-1 truncate text-[13.5px] text-ink">{subjectName(db, g.subjectId)}</p>
                    <span className="shrink-0 text-xs tabular-nums text-muted">{formatShort(g.date)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader icon="check" tone="green" title="Посещаемость" subtitle={`${att.total} занятий · ${data.sem.label}`} action={<Link href="/attendance/"><MoreLink>Подробно</MoreLink></Link>} />
            <div className="p-4 sm:p-5">
              <div className="flex items-end justify-between gap-3">
                <p className="text-[32px] font-semibold leading-none tracking-tight tabular-nums text-ink">{att.rate}<span className="text-lg text-muted">%</span></p>
                <p className={cx("rounded-md px-2 py-1 text-xs font-medium", att.rate >= 90 ? "bg-emerald-50 text-emerald-700" : att.rate >= 75 ? "bg-gold-50 text-gold-700" : "bg-rose-50 text-rose-700")}>{att.rate >= 90 ? "Хороший показатель" : att.rate >= 75 ? "Есть пропуски" : "Много пропусков"}</p>
              </div>
              <div className="mt-3 flex h-2 w-full gap-0.5 overflow-hidden rounded-full">
                {attParts.map((p) => p.n > 0 && <div key={p.label} className={cx("bar-x h-full first:rounded-l-full last:rounded-r-full", p.cls)} style={{ width: `${(p.n / Math.max(1, att.total)) * 100}%` }} />)}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
                {attParts.map((p) => (
                  <div key={p.label} className="flex items-center gap-2 text-[13px]">
                    <span className={cx("size-2 rounded-sm", p.cls)} />
                    <span className="flex-1 truncate text-muted">{p.label}</span>
                    <span className="font-semibold tabular-nums text-ink">{p.n}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        <div className="min-w-0 space-y-4 sm:space-y-5 lg:col-span-2 lg:grid lg:grid-cols-2 lg:gap-5 lg:space-y-0 xl:col-span-3 xl:block xl:space-y-5">
          <Card>
            <CardHeader icon="chart" title="Успеваемость" subtitle={data.sem.label} action={<Link href="/grades/"><MoreLink>Все</MoreLink></Link>} />
            {data.bySubject.length === 0 ? <Empty icon="chart" title="Пока нет данных" /> : (
              <div className="space-y-3 p-4 sm:p-5">
                {data.bySubject.slice(0, 5).map((s) => (
                  <MeterRow key={s.id} label={s.name} value={s.avg} max={5} display={fmtAvg(s.avg)} tone={avgBarTone(s.avg)} />
                ))}
                {data.months.length > 1 && (
                  <div className="!mt-4 border-t border-line pt-3">
                    <p className="text-xs text-muted">Средний балл по месяцам</p>
                    <div className="mt-2 flex items-end gap-1.5">
                      {data.months.map((m, i) => (
                        <div key={m.k} className="flex flex-1 flex-col items-center gap-1">
                          <span className="text-[11px] font-semibold tabular-nums text-ink">{fmtAvg(m.avg)}</span>
                          <div className="flex h-10 w-full items-end overflow-hidden rounded bg-slate-100">
                            <div className={cx("bar-y w-full rounded", i === data.months.length - 1 ? "bg-brand-700" : "bg-brand-200")} style={{ height: `${(m.avg / 5) * 100}%`, animationDelay: `${i * 60}ms` }} />
                          </div>
                          <span className="text-[11px] capitalize text-muted">{m.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader icon="bell" title="Уведомления" action={<Link href="/notifications/"><MoreLink>Все</MoreLink></Link>} />
            {data.notes.length === 0 ? <Empty icon="bell" title="Уведомлений нет" /> : (
              <ul className="divide-y divide-line">
                {data.notes.slice(0, 3).map((n) => (
                  <li key={n.id}>
                    <Link href={n.href} className="flex gap-3 px-4 py-2.5 transition-colors hover:bg-subtle sm:px-5">
                      <span className={cx("mt-0.5 grid size-7 shrink-0 place-items-center rounded-md", n.read ? "bg-slate-100 text-slate-500" : "bg-brand-50 text-brand-700")}><Icon name={KIND_ICON[n.kind]} className="size-3.5" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 text-[13px] font-medium text-ink"><span className="truncate">{n.title}</span>{!n.read && <span className="size-1.5 shrink-0 rounded-full bg-brand-600" />}</span>
                        <span className="block truncate text-xs text-muted">{n.text}</span>
                        <span className="text-[11px] text-muted/80">{formatTime(n.at)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

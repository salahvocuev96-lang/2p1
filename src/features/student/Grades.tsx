"use client";
import { useMemo, useState } from "react";
import { useViewer } from "../useViewer";
import { AvgBadge, Badge, Card, Empty, GradeChip, PageHeader, Segmented, Select, MiniStat, cx } from "@/components/ui";
import { Modal } from "@/components/feedback";
import { formatShort, monthPeriod, MONTHS, semesterByNumber, yearPeriod, academicYear, toISO, type Period } from "@/lib/dates";
import { average, finalGrade, gradesOf } from "@/lib/stats";
import { key } from "@/lib/constants";
import { HistoryList } from "@/features/teacher/Journal";
import type { Grade } from "@/lib/types";

type Kind = "month" | "s1" | "s2" | "year";

export function StudentGrades() {
  const { db, version, student, isParent } = useViewer();
  const now = db.serverToday;
  const s1 = semesterByNumber(1, now, db.settings);
  const [kind, setKind] = useState<Kind>(now <= s1.to ? "s1" : "s2");
  const [month, setMonth] = useState(now.slice(0, 7));
  const [opened, setOpened] = useState<Grade | null>(null);

  const ay = academicYear(now);
  const months = Array.from({ length: 10 }, (_, i) => toISO(new Date(ay, 8 + i, 1)).slice(0, 7)).filter((m) => m <= now.slice(0, 7));
  const period: Period = kind === "month" ? monthPeriod(`${month}-01`) : kind === "s1" ? s1 : kind === "s2" ? semesterByNumber(2, now, db.settings) : yearPeriod(now);
  const rule = db.settings.finalGradeRule;

  const rows = useMemo(() => {
    if (!student) return [];
    const all = gradesOf(db, student.id, { period });
    const subjIds = new Set(db.schedule.filter((s) => s.groupId === student.groupId).map((s) => s.subjectId));
    return [...subjIds]
      .map((id) => db.subjects.find((s) => s.id === id)!)
      .filter((s) => s?.graded)
      .map((s) => {
        const list = all.filter((g) => g.subjectId === s.id);
        return { subject: s, list, avg: average(list.map((g) => g.value)) };
      })
      .sort((a, b) => a.subject.name.localeCompare(b.subject.name, "ru"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, version, student, period.from, period.to]);

  if (!student) return null;
  const total = average(rows.flatMap((r) => r.list.map((g) => g.value)));
  const changed = new Set(db.audit.filter((e) => e.action !== "grade.create").map((e) => e.entityId));
  const openedHistory = opened ? db.audit.filter((e) => e.entityId === key(opened.studentId, opened.subjectId, opened.date)) : [];
  const yearAvg = average(gradesOf(db, student.id, { period: yearPeriod(now) }).map((g) => g.value));

  return (
    <div>
      <PageHeader
        title={isParent ? "Оценки ребёнка" : "Мои оценки"}
        subtitle="Средний балл: арифметическое среднее текущих оценок за период. Пропуски в расчёт не входят"
        action={
          <div className="flex flex-wrap items-center gap-3">
            <Segmented value={kind} onChange={setKind} options={[{ value: "month", label: "Месяц" }, { value: "s1", label: "1 семестр" }, { value: "s2", label: "2 семестр" }, { value: "year", label: "Год" }]} />
            {kind === "month" && (
              <Select value={month} onChange={(e) => setMonth(e.target.value)} className="w-36">
                {months.map((m) => <option key={m} value={m}>{MONTHS[Number(m.slice(5)) - 1]}</option>)}
              </Select>
            )}
          </div>
        }
      />
      <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <MiniStat icon="star" tone="gold" label={`Средний · ${period.label}`} value={total === null ? "-" : total.toFixed(2).replace(".", ",")} />
        <MiniStat icon="chart" label="За учебный год" value={yearAvg === null ? "-" : yearAvg.toFixed(2).replace(".", ",")} />
        <MiniStat icon="check" tone="green" label="Оценок за период" value={rows.reduce((a, r) => a + r.list.length, 0)} />
        <MiniStat icon="book" label="Предметов" value={rows.length} />
      </div>
      <Card>
        {rows.length === 0 ? <Empty title="Нет предметов" /> : (
          <ul className="divide-y divide-line">
            <li className="hidden grid-cols-[minmax(0,260px)_1fr_80px_70px] gap-4 rounded-t-[var(--radius-card)] bg-subtle px-5 py-3 text-xs font-medium text-muted md:grid">
              <span>Предмет</span><span>Оценки (нажмите, чтобы открыть)</span><span className="text-right">Средний</span><span className="text-right">{kind === "year" ? "Годовая" : "Итог"}</span>
            </li>
            {rows.map((r) => (
              <li key={r.subject.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 gap-y-2 px-4 py-3.5 transition-colors hover:bg-subtle sm:px-5 md:grid-cols-[minmax(0,260px)_1fr_80px_70px]">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{r.subject.name}</p>
                  <div className="mt-1.5 h-1 w-full max-w-40 overflow-hidden rounded-full bg-brand-50"><div className={cx("bar-x h-full rounded-full", r.avg === null ? "" : r.avg >= 4.5 ? "bg-blue-500" : r.avg >= 3.5 ? "bg-emerald-500" : r.avg >= 2.5 ? "bg-orange-400" : "bg-rose-500")} style={{ width: `${((r.avg ?? 0) / 5) * 100}%` }} /></div>
                </div>
                <div className="col-span-3 row-start-2 flex flex-wrap gap-1.5 md:col-span-1 md:row-start-auto">
                  {r.list.length === 0 && <span className="text-xs text-muted">Нет оценок</span>}
                  {r.list.map((g) => (
                    <button key={g.date} onClick={() => setOpened(g)} className="relative transition-opacity hover:opacity-75">
                      <GradeChip value={g.value} size="sm" title={formatShort(g.date)} />
                      {changed.has(key(g.studentId, g.subjectId, g.date)) && <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-gold-500 ring-2 ring-white" />}
                    </button>
                  ))}
                </div>
                <div className="col-start-2 row-start-1 text-right md:col-start-auto md:row-start-auto"><AvgBadge value={r.avg} /></div>
                <div className="col-start-3 row-start-1 text-right md:col-start-auto md:row-start-auto">
                  {kind === "month" ? <span className="text-xs text-muted">—</span> : finalGrade(r.avg, rule) ? <span className="inline-grid size-8 place-items-center rounded-md bg-brand-800 text-sm font-bold text-white" title="Расчётная итоговая оценка">{finalGrade(r.avg, rule)}</span> : <span className="text-xs text-muted">—</span>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <p className="mt-3 flex items-center gap-2 text-xs text-muted"><Badge tone="gold">Итог</Badge> расчётная оценка по правилу «{rule === "mean_floor" ? "округление вниз" : "математическое округление"}». Официальную итоговую оценку утверждает преподаватель по положению колледжа.</p>
      <Modal open={!!opened} onClose={() => setOpened(null)} title="Оценка">
        {opened && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <GradeChip value={opened.value} />
              <div>
                <p className="font-semibold text-brand-900">{db.subjects.find((s) => s.id === opened.subjectId)?.name}</p>
                <p className="text-sm text-muted">{formatShort(opened.date)} · {db.teachers.find((t) => t.id === opened.teacherId)?.name ?? "преподаватель"}</p>
              </div>
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">История</p>
            <HistoryList entries={openedHistory} />
          </div>
        )}
      </Modal>
    </div>
  );
}

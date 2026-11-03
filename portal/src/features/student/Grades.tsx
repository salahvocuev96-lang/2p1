"use client";
import { useMemo, useState } from "react";
import { useViewer } from "../useViewer";
import { AvgBadge, Card, Empty, GradeChip, PageHeader, Segmented, Select } from "@/components/ui";
import { formatShort, MONTHS, periodFor, today, type PeriodKind, yearPeriod, academicYear, toISO } from "@/lib/dates";
import { average, gradesOf } from "@/lib/stats";

export function StudentGrades() {
  const { db, version, student, isParent } = useViewer();
  const now = today();
  const [kind, setKind] = useState<PeriodKind>("semester");
  const [month, setMonth] = useState(now.slice(0, 7));

  const ay = academicYear(now);
  const months = Array.from({ length: 10 }, (_, i) => toISO(new Date(ay, 8 + i, 1)).slice(0, 7)).filter((m) => m <= now.slice(0, 7));
  const period = periodFor(kind, kind === "month" ? `${month}-01` : now);

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
  const yearAvg = average(gradesOf(db, student.id, { period: yearPeriod(now) }).map((g) => g.value));

  return (
    <div>
      <PageHeader
        title={isParent ? "Оценки ребёнка" : "Мои оценки"}
        subtitle="Средний балл считается как арифметическое среднее всех оценок за выбранный период"
        action={
          <div className="flex flex-wrap items-center gap-3">
            <Segmented value={kind} onChange={setKind} options={[{ value: "month", label: "Месяц" }, { value: "semester", label: "Семестр" }, { value: "year", label: "Год" }]} />
            {kind === "month" && (
              <Select value={month} onChange={(e) => setMonth(e.target.value)} className="w-36">
                {months.map((m) => <option key={m} value={m}>{MONTHS[Number(m.slice(5)) - 1]}</option>)}
              </Select>
            )}
          </div>
        }
      />
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <Card className="flex items-center justify-between p-5"><span className="text-sm text-muted">{period.label}</span><AvgBadge value={total} className="h-9 min-w-16 text-base" /></Card>
        <Card className="flex items-center justify-between p-5"><span className="text-sm text-muted">За учебный год</span><AvgBadge value={yearAvg} className="h-9 min-w-16 text-base" /></Card>
        <Card className="flex items-center justify-between p-5"><span className="text-sm text-muted">Оценок за период</span><span className="text-xl font-bold text-brand-900">{rows.reduce((a, r) => a + r.list.length, 0)}</span></Card>
      </div>
      <Card>
        {rows.length === 0 ? <Empty title="Нет предметов" /> : (
          <ul className="divide-y divide-line">
            <li className="hidden grid-cols-[minmax(0,260px)_1fr_80px] gap-4 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted md:grid">
              <span>Предмет</span><span>Оценки</span><span className="text-right">Средний</span>
            </li>
            {rows.map((r) => (
              <li key={r.subject.id} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-5 py-3.5 md:grid-cols-[minmax(0,260px)_1fr_80px]">
                <p className="text-sm font-medium text-ink">{r.subject.name}</p>
                <div className="col-span-2 row-start-2 flex flex-wrap gap-1.5 md:col-span-1 md:row-start-auto">
                  {r.list.length === 0 && <span className="text-xs text-muted">Нет оценок</span>}
                  {r.list.map((g) => <GradeChip key={g.date} value={g.value} size="sm" title={formatShort(g.date)} />)}
                </div>
                <div className="col-start-2 row-start-1 text-right md:col-start-auto md:row-start-auto"><AvgBadge value={r.avg} /></div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

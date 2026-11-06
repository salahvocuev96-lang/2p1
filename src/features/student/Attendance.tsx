"use client";
import { useMemo, useState } from "react";
import { useViewer } from "../useViewer";
import { Card, CardHeader, Empty, PageHeader, Segmented, StatCard, cx, StatGrid } from "@/components/ui";
import { formatShort, periodFor, today, type PeriodKind } from "@/lib/dates";
import { attendanceSummary } from "@/lib/stats";
import { subjectName } from "@/lib/queries";
import { ATT_META } from "@/features/shared/attendance";

export function StudentAttendance() {
  const { db, version, student, isParent } = useViewer();
  const now = db.serverToday;
  const [kind, setKind] = useState<PeriodKind>("semester");
  const period = periodFor(kind, now);
  const data = useMemo(() => {
    if (!student) return null;
    const sum = attendanceSummary(db, student.id, period, now);
    const misses = Object.values(db.attendance).filter((a) => a.studentId === student.id && a.date >= period.from && a.date <= period.to).sort((a, b) => b.date.localeCompare(a.date));
    return { sum, misses };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, version, student, period.from, period.to, now]);
  if (!student || !data) return null;
  const { sum, misses } = data;

  return (
    <div>
      <PageHeader
        title={isParent ? "Посещаемость ребёнка" : "Посещаемость"}
        subtitle="Опоздание засчитывается как присутствие"
        action={<Segmented value={kind} onChange={setKind} options={[{ value: "month", label: "Месяц" }, { value: "semester", label: "Семестр" }, { value: "year", label: "Год" }]} />}
      />
      <StatGrid className="mb-6 grid-cols-2 lg:grid-cols-4">
        <StatCard label="Присутствие" value={`${sum.rate}%`} hint={`${sum.total} занятий`} icon="check" tone={sum.rate >= 90 ? "green" : "red"} />
        <StatCard label="Пропуски «Н»" value={sum.absent} hint="без уважительной причины" icon="close" tone="red" />
        <StatCard label="Болезнь «Б»" value={sum.sick} hint="по уважительной причине" icon="shield" />
        <StatCard label="Опоздания" value={sum.late} hint="засчитаны как присутствие" icon="calendar" tone="gold" />
      </StatGrid>
      <Card>
        <CardHeader icon="check" title="Отметки за период" />
        {misses.length === 0 ? <Empty icon="check" title="Пропусков нет" text="Все занятия посещены" /> : (
          <ul className="divide-y divide-line">
            {misses.map((a) => (
              <li key={a.subjectId + a.date} className="flex items-center gap-4 px-5 py-3">
                <span className="w-12 text-sm font-semibold text-brand-900">{formatShort(a.date)}</span>
                <span className="min-w-0 flex-1 truncate text-sm">{subjectName(db, a.subjectId)}</span>
                <span className={cx("rounded-lg px-2.5 py-1 text-xs font-bold", ATT_META[a.status].chip)}>{ATT_META[a.status].short} · {ATT_META[a.status].label}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

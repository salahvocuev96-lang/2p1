"use client";
import { useState } from "react";
import { useTeacher } from "./useTeacher";
import { Card, PageHeader, Segmented, Select, cx } from "@/components/ui";
import { periodFor, today, type PeriodKind } from "@/lib/dates";
import { attendanceSummary } from "@/lib/stats";

export function TeacherAttendance() {
  const { db, groups } = useTeacher();
  const [groupId, setGroupId] = useState(groups[0]?.id ?? "");
  const [kind, setKind] = useState<PeriodKind>("month");
  const period = periodFor(kind, today());
  const rows = db.students.filter((s) => s.groupId === groupId).map((s) => ({ s, a: attendanceSummary(db, s.id, period, today()) }));

  return (
    <div>
      <PageHeader
        title="Посещаемость"
        subtitle="По всем предметам группы. Отметки ставятся в электронном журнале"
        action={
          <div className="flex flex-wrap items-center gap-3">
            <Select value={groupId} onChange={(e) => setGroupId(e.target.value)} className="w-28">
              {groups.map((g) => <option key={g.id} value={g.id}>{g.code}</option>)}
            </Select>
            <Segmented value={kind} onChange={setKind} options={[{ value: "month", label: "Месяц" }, { value: "semester", label: "Семестр" }]} />
          </div>
        }
      />
      <Card className="scroll-x">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-5 py-3 font-semibold">Студент</th>
              <th className="px-3 py-3 text-center font-semibold">Занятий</th>
              <th className="px-3 py-3 text-center font-semibold">Н</th>
              <th className="px-3 py-3 text-center font-semibold">Б</th>
              <th className="px-3 py-3 text-center font-semibold">ОП</th>
              <th className="px-5 py-3 text-right font-semibold">Присутствие</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map(({ s, a }) => (
              <tr key={s.id}>
                <td className="px-5 py-3 font-medium">{s.name}</td>
                <td className="px-3 py-3 text-center text-muted">{a.total}</td>
                <td className="px-3 py-3 text-center font-semibold text-rose-600">{a.absent || ""}</td>
                <td className="px-3 py-3 text-center font-semibold text-sky-700">{a.sick || ""}</td>
                <td className="px-3 py-3 text-center font-semibold text-gold-600">{a.late || ""}</td>
                <td className="px-5 py-3 text-right">
                  <span className={cx("rounded-lg px-2 py-1 text-xs font-bold", a.rate >= 90 ? "bg-emerald-50 text-emerald-700" : a.rate >= 80 ? "bg-gold-50 text-gold-600" : "bg-rose-50 text-rose-600")}>{a.rate}%</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

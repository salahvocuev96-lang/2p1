"use client";
import { useState } from "react";
import { useTeacher } from "./useTeacher";
import { AvgBadge, Card, CardHeader, PageHeader, cx } from "@/components/ui";
import { semesterPeriod, today } from "@/lib/dates";
import { attendanceSummary, groupAverage, studentAverage } from "@/lib/stats";
import { SPECIALTIES } from "@/lib/seed";

export function TeacherGroups() {
  const { db, loads, groups } = useTeacher();
  const [open, setOpen] = useState(groups[0]?.id ?? "");
  const sem = semesterPeriod(today());

  return (
    <div>
      <PageHeader title="Мои группы" subtitle="Средний балл по вашим предметам за семестр" />
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-3">
          {groups.map((g) => {
            const subj = loads.filter((l) => l.groupId === g.id);
            return (
              <button key={g.id} onClick={() => setOpen(g.id)} className={cx("w-full rounded-2xl border bg-white p-4 text-left shadow-card transition", open === g.id ? "border-gold-500" : "border-line")}>
                <div className="flex items-center justify-between">
                  <p className="text-lg font-bold text-brand-900">{g.code}</p>
                  <span className="text-xs text-muted">{g.course} курс</span>
                </div>
                <p className="mt-0.5 text-xs text-muted">{SPECIALTIES[g.specialty]}</p>
                <p className="mt-2 text-xs text-brand-700">{subj.map((l) => db.subjects.find((s) => s.id === l.subjectId)?.name).join(", ")}</p>
              </button>
            );
          })}
        </div>
        {open && (
          <Card>
            <CardHeader icon="users" title={`Студенты группы ${db.groups.find((g) => g.id === open)?.code}`} action={<AvgBadge value={groupAverage(db, open, { period: sem })} />} />
            <ul className="divide-y divide-line">
              {db.students.filter((s) => s.groupId === open).map((s, i) => {
                const mySubj = loads.filter((l) => l.groupId === open).map((l) => l.subjectId);
                const avgs = mySubj.map((sid) => studentAverage(db, s.id, { subjectId: sid, period: sem })).filter((v): v is number => v !== null);
                const att = attendanceSummary(db, s.id, sem, today());
                return (
                  <li key={s.id} className="flex items-center gap-3 px-5 py-3">
                    <span className="w-6 text-sm text-muted">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{s.name}</span>
                    <span className={cx("hidden text-xs sm:inline", att.rate < 90 ? "text-rose-600" : "text-muted")}>{att.rate}% посещ.</span>
                    <AvgBadge value={avgs.length ? avgs.reduce((a, b) => a + b, 0) / avgs.length : null} />
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}

"use client";
import { useTeacher } from "./useTeacher";
import { AvgBadge, Card, PageHeader } from "@/components/ui";
import { semesterPeriod, today } from "@/lib/dates";
import { groupAverage } from "@/lib/stats";

export function TeacherSubjects() {
  const { db, session, loads, subjects } = useTeacher();
  const sem = semesterPeriod(today());
  return (
    <div>
      <PageHeader title="Мои предметы" subtitle="Предметы и группы закреплены за вами по расписанию" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {subjects.map((s) => {
          const ls = loads.filter((l) => l.subjectId === s.id);
          const hours = db.schedule.filter((x) => x.teacherId === session!.id && x.subjectId === s.id).length;
          return (
            <Card key={s.id} className="p-5">
              <p className="font-semibold leading-snug text-brand-900">{s.name}</p>
              <p className="mt-1 text-xs text-muted">{hours} пар в неделю{!s.graded && " · без оценок"}</p>
              <ul className="mt-4 space-y-2">
                {ls.map((l) => (
                  <li key={l.groupId} className="flex items-center justify-between rounded-xl bg-page px-3 py-2">
                    <span className="text-sm font-semibold">{db.groups.find((g) => g.id === l.groupId)?.code}</span>
                    {s.graded && <AvgBadge value={groupAverage(db, l.groupId, { subjectId: s.id, period: sem })} />}
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

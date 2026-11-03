"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTeacher } from "./useTeacher";
import { AvgBadge, Card, CardHeader, Empty, PageHeader, Select, cx } from "@/components/ui";
import { Icon } from "@/components/icons";
import { Toast } from "./Toast";
import { formatShort, formatWithWeekday, monthPeriod, semesterPeriod, today } from "@/lib/dates";
import { lessonDates } from "@/lib/queries";
import { key } from "@/lib/seed";
import { setAttendance, setGrade } from "@/lib/store";
import { average } from "@/lib/stats";
import { ATT_META, ATT_ORDER } from "@/features/shared/attendance";
import type { GradeValue } from "@/lib/types";

const GRADES: GradeValue[] = [5, 4, 3, 2];

export function Journal() {
  const { db, version, loads, groups } = useTeacher();
  const now = today();
  const sem = semesterPeriod(now);
  const [groupId, setGroupId] = useState(groups[0]?.id ?? "");
  const subjectsForGroup = useMemo(
    () => db.subjects.filter((s) => s.graded && loads.some((l) => l.groupId === groupId && l.subjectId === s.id)),
    [db, loads, groupId],
  );
  const [subjectId, setSubjectId] = useState(subjectsForGroup[0]?.id ?? "");
  useEffect(() => {
    if (!subjectsForGroup.some((s) => s.id === subjectId)) setSubjectId(subjectsForGroup[0]?.id ?? "");
  }, [subjectsForGroup, subjectId]);

  const dates = useMemo(() => (groupId && subjectId ? lessonDates(db, groupId, subjectId, sem.from, now).reverse() : []), [db, groupId, subjectId, sem.from, now]);
  const [date, setDate] = useState("");
  useEffect(() => {
    if (!dates.includes(date)) setDate(dates[0] ?? "");
  }, [dates, date]);

  const [toast, setToast] = useState<{ msg: string; tone: "ok" | "err" } | null>(null);
  const closeToast = useCallback(() => setToast(null), []);
  const students = useMemo(() => db.students.filter((s) => s.groupId === groupId), [db, groupId]);

  const month = monthPeriod(date || now);
  const monthDates = useMemo(() => (groupId && subjectId ? lessonDates(db, groupId, subjectId, month.from, month.to < now ? month.to : now) : []), [db, groupId, subjectId, month.from, month.to, now]);

  const avgFor = useCallback(
    (sid: string) => {
      const vals: number[] = [];
      for (const g of Object.values(db.grades)) if (g.studentId === sid && g.subjectId === subjectId && g.date >= sem.from && g.date <= sem.to) vals.push(g.value);
      return average(vals);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [db, version, subjectId, sem.from, sem.to],
  );

  const onGrade = (sid: string, v: GradeValue | null) => {
    const r = setGrade(sid, subjectId, date, v);
    setToast(r.ok ? { msg: v ? `Оценка ${v} выставлена` : "Оценка удалена", tone: "ok" } : { msg: r.error, tone: "err" });
  };
  const onAtt = (sid: string, st: (typeof ATT_ORDER)[number]) => {
    const r = setAttendance(sid, subjectId, date, st);
    setToast(r.ok ? { msg: r.info ?? `Отмечено: ${ATT_META[st].label.toLowerCase()}`, tone: "ok" } : { msg: r.error, tone: "err" });
  };

  if (!groups.length) return <Card><Empty icon="journal" title="За вами не закреплены группы" /></Card>;

  const groupAvg = average(students.map((s) => avgFor(s.id)).filter((v): v is number => v !== null));

  return (
    <div>
      <PageHeader title="Электронный журнал" subtitle="Оценки и посещаемость ведутся раздельно. Доступны только ваши группы и предметы" />

      <Card className="mb-6 grid gap-3 p-4 sm:grid-cols-3">
        <Select label="Группа" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
          {groups.map((g) => <option key={g.id} value={g.id}>{g.code}</option>)}
        </Select>
        <Select label="Предмет" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
          {subjectsForGroup.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
        <Select label="Дата занятия" value={date} onChange={(e) => setDate(e.target.value)}>
          {dates.map((d) => <option key={d} value={d}>{d === now ? "Сегодня, " : ""}{formatShort(d)} · {formatWithWeekday(d).split(",")[0]}</option>)}
        </Select>
      </Card>

      {!date ? <Card><Empty icon="calendar" title="Занятий в этом семестре ещё не было" /></Card> : (
        <Card>
          <CardHeader
            icon="journal"
            title={formatWithWeekday(date)}
            action={<span className="flex items-center gap-2 text-xs text-muted">Средний по группе <AvgBadge value={groupAvg} /></span>}
          />
          <div className="hidden grid-cols-[28px_minmax(0,1fr)_auto_auto_70px] items-center gap-4 border-b border-line px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted md:grid">
            <span>№</span><span>Студент</span><span>Посещаемость</span><span>Оценка</span><span className="text-right">Ср. балл</span>
          </div>
          <ul className="divide-y divide-line">
            {students.map((s, i) => {
              const k = key(s.id, subjectId, date);
              const g = db.grades[k]?.value;
              const att = db.attendance[k]?.status ?? "present";
              const away = att === "absent" || att === "sick";
              return (
                <li key={s.id} className="grid grid-cols-[28px_1fr_auto] items-center gap-x-4 gap-y-3 px-5 py-3 md:grid-cols-[28px_minmax(0,1fr)_auto_auto_70px]">
                  <span className="text-sm text-muted">{i + 1}</span>
                  <span className="min-w-0 truncate text-sm font-medium">{s.name}</span>
                  <span className="text-right md:order-last"><AvgBadge value={avgFor(s.id)} /></span>
                  <div className="col-span-3 flex gap-1 md:col-span-1 md:col-start-3 md:row-start-1">
                    {ATT_ORDER.map((st) => (
                      <button
                        key={st}
                        title={ATT_META[st].label}
                        onClick={() => onAtt(s.id, st)}
                        className={cx("h-9 min-w-10 rounded-lg px-2 text-xs font-bold transition", att === st ? ATT_META[st].btn : "bg-slate-100 text-slate-500 hover:bg-slate-200")}
                      >
                        {ATT_META[st].short}
                      </button>
                    ))}
                  </div>
                  <div className="col-span-3 flex items-center gap-1 md:col-span-1 md:col-start-4 md:row-start-1">
                    {GRADES.map((v) => (
                      <button
                        key={v}
                        disabled={away}
                        onClick={() => onGrade(s.id, g === v ? null : v)}
                        className={cx(
                          "size-9 rounded-lg text-sm font-bold ring-1 transition",
                          g === v ? "bg-brand-800 text-gold-400 ring-brand-800" : "bg-white text-brand-900 ring-line hover:ring-brand-700/40",
                          away && "opacity-30",
                        )}
                      >
                        {v}
                      </button>
                    ))}
                    <button disabled={!g} onClick={() => onGrade(s.id, null)} title="Удалить оценку" className="grid size-9 place-items-center rounded-lg text-muted hover:bg-rose-50 hover:text-rose-600 disabled:opacity-0">
                      <Icon name="close" className="size-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="flex flex-wrap gap-x-5 gap-y-1 border-t border-line px-5 py-3 text-xs text-muted">
            {ATT_ORDER.map((st) => <span key={st}><b className="text-ink">{ATT_META[st].short}</b> {ATT_META[st].label.toLowerCase()}</span>)}
            <span>Студенту с отметкой Н или Б оценку поставить нельзя</span>
          </div>
        </Card>
      )}

      {monthDates.length > 0 && (
        <Card className="mt-6">
          <CardHeader icon="chart" title={`Сводка за ${month.label.toLowerCase()}`} action={<span className="text-xs text-muted">Нажмите на дату, чтобы открыть занятие</span>} />
          <div className="scroll-x">
            <table className="w-full min-w-max text-sm">
              <thead>
                <tr className="border-b border-line text-xs text-muted">
                  <th className="sticky left-0 bg-white px-5 py-2.5 text-left font-semibold">Студент</th>
                  {monthDates.map((d) => (
                    <th key={d} className="px-1 py-2">
                      <button onClick={() => setDate(d)} className={cx("rounded-md px-1.5 py-1 font-semibold", d === date ? "bg-gold-500 text-brand-950" : "hover:bg-brand-50")}>{formatShort(d).slice(0, 2)}</button>
                    </th>
                  ))}
                  <th className="px-4 py-2.5 text-right font-semibold">Месяц</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {students.map((s) => {
                  const vals: number[] = [];
                  return (
                    <tr key={s.id}>
                      <td className="sticky left-0 max-w-[200px] truncate bg-white px-5 py-2">{s.name.split(" ").slice(0, 2).join(" ")}</td>
                      {monthDates.map((d) => {
                        const k = key(s.id, subjectId, d);
                        const g = db.grades[k]?.value;
                        const a = db.attendance[k]?.status;
                        if (g) vals.push(g);
                        return (
                          <td key={d} className={cx("px-1 py-2 text-center", d === date && "bg-gold-50")}>
                            {g ? <span className="font-bold text-brand-900">{g}</span> : a && a !== "present" ? <span className={cx("rounded px-1 text-[11px] font-bold", ATT_META[a].chip)}>{ATT_META[a].short}</span> : <span className="text-line">·</span>}
                          </td>
                        );
                      })}
                      <td className="px-4 py-2 text-right"><AvgBadge value={average(vals)} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {toast && <Toast msg={toast.msg} tone={toast.tone} onClose={closeToast} />}
    </div>
  );
}

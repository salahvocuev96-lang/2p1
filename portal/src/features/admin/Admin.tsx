"use client";
import { useMemo, useState } from "react";
import { addGroup, addStudent, addSubject, addTeacher, useStore } from "@/lib/store";
import { AvgBadge, Button, Card, CardHeader, PageHeader, Select, StatCard, cx, inputCls } from "@/components/ui";
import { Icon } from "@/components/icons";
import { Toast } from "@/features/teacher/Toast";
import { GROUP_CAPACITY, SPECIALTIES } from "@/lib/seed";
import { semesterPeriod, today } from "@/lib/dates";
import { attendanceSummary, groupAverage } from "@/lib/stats";
import type { Group } from "@/lib/types";

type ToastState = { msg: string; tone: "ok" | "err" } | null;
const COURSES = [1, 2, 3, 4] as const;

function useToast() {
  const [toast, setToast] = useState<ToastState>(null);
  const show = (r: { ok: boolean; info?: string; error?: string }) => setToast(r.ok ? { msg: r.info ?? "Готово", tone: "ok" } : { msg: r.error ?? "Ошибка", tone: "err" });
  const node = toast && <Toast msg={toast.msg} tone={toast.tone} onClose={() => setToast(null)} />;
  return { show, node };
}

export function AdminHome() {
  const { db, version } = useStore();
  const sem = semesterPeriod(today());
  const stats = useMemo(() => {
    const byCourse = COURSES.map((c) => {
      const gs = db.groups.filter((g) => g.course === c);
      const avgs = gs.map((g) => groupAverage(db, g.id, { period: sem })).filter((v): v is number => v !== null);
      return { c, groups: gs.length, students: db.students.filter((s) => gs.some((g) => g.id === s.groupId)).length, avg: avgs.length ? avgs.reduce((a, b) => a + b, 0) / avgs.length : null };
    });
    const top = db.groups.map((g) => ({ g, avg: groupAverage(db, g.id, { period: sem }) })).sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0));
    return { byCourse, top };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, version]);
  const max = Math.max(...stats.byCourse.map((c) => c.students), 1);

  return (
    <div className="space-y-6">
      <PageHeader title="Обзор колледжа" subtitle={`Сводка на ${today().split("-").reverse().join(".")}, ${sem.label.toLowerCase()}`} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Студентов" value={db.students.length} icon="users" />
        <StatCard label="Групп" value={db.groups.length} hint={`план ${GROUP_CAPACITY} групп`} icon="layers" tone="gold" />
        <StatCard label="Преподавателей" value={db.teachers.length} icon="user" />
        <StatCard label="Дисциплин" value={db.subjects.length} icon="book" tone="green" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader icon="chart" title="Студенты и средний балл по курсам" />
          <div className="space-y-4 p-5">
            {stats.byCourse.map((c) => (
              <div key={c.c}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-semibold text-brand-900">{c.c} курс <span className="font-normal text-muted">· {c.groups} групп</span></span>
                  <span className="flex items-center gap-2"><span className="text-muted">{c.students} чел.</span><AvgBadge value={c.avg} /></span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-brand-50">
                  <div className="h-full rounded-full bg-brand-700" style={{ width: `${(c.students / max) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <CardHeader icon="star" title="Рейтинг групп по среднему баллу" />
          <ul className="divide-y divide-line">
            {stats.top.slice(0, 6).map(({ g, avg }, i) => (
              <li key={g.id} className="flex items-center gap-3 px-5 py-2.5">
                <span className={cx("grid size-7 place-items-center rounded-lg text-xs font-bold", i < 3 ? "bg-gold-500 text-brand-950" : "bg-brand-50 text-brand-700")}>{i + 1}</span>
                <span className="flex-1 text-sm font-semibold">{g.code} <span className="font-normal text-muted">{SPECIALTIES[g.specialty]}</span></span>
                <AvgBadge value={avg} />
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

export function AdminGroups() {
  const { db } = useStore();
  const [course, setCourse] = useState<Group["course"]>(1);
  const [spec, setSpec] = useState("П");
  const t = useToast();
  const sem = semesterPeriod(today());
  const filled = db.groups.length;

  return (
    <div>
      <PageHeader title="Группы" subtitle="Структура рассчитана на полный набор колледжа" />
      <Card className="mb-6 p-5">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-semibold text-brand-900">Заведено {filled} из {GROUP_CAPACITY} групп</span>
          <span className="text-muted">{Math.round((filled / GROUP_CAPACITY) * 100)}%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-brand-50"><div className="h-full rounded-full bg-gold-500" style={{ width: `${Math.min(100, (filled / GROUP_CAPACITY) * 100)}%` }} /></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-[120px_1fr_auto] sm:items-end">
          <Select label="Курс" value={course} onChange={(e) => setCourse(Number(e.target.value) as Group["course"])}>
            {COURSES.map((c) => <option key={c} value={c}>{c} курс</option>)}
          </Select>
          <Select label="Специальность" value={spec} onChange={(e) => setSpec(e.target.value)}>
            {Object.entries(SPECIALTIES).map(([k, v]) => <option key={k} value={k}>{k} · {v}</option>)}
          </Select>
          <Button variant="gold" onClick={() => t.show(addGroup(course, spec))}><Icon name="plus" className="size-4" />Добавить группу</Button>
        </div>
      </Card>
      <div className="grid gap-6 xl:grid-cols-2">
        {COURSES.map((c) => {
          const gs = db.groups.filter((g) => g.course === c);
          return (
            <Card key={c}>
              <CardHeader icon="layers" title={`${c} курс`} action={<span className="text-xs text-muted">{gs.length} групп</span>} />
              <ul className="divide-y divide-line">
                {gs.map((g) => {
                  const n = db.students.filter((s) => s.groupId === g.id).length;
                  return (
                    <li key={g.id} className="flex items-center gap-3 px-5 py-3">
                      <span className="w-14 font-bold text-brand-900">{g.code}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">{SPECIALTIES[g.specialty] ?? g.specialty}</span>
                        <span className="block text-xs text-muted">{n} студентов{g.curatorId && ` · куратор ${db.teachers.find((t) => t.id === g.curatorId)?.name}`}</span>
                      </span>
                      <AvgBadge value={groupAverage(db, g.id, { period: sem })} />
                    </li>
                  );
                })}
              </ul>
            </Card>
          );
        })}
      </div>
      {t.node}
    </div>
  );
}

export function AdminStudents() {
  const { db } = useStore();
  const [groupId, setGroupId] = useState(db.groups[0].id);
  const [q, setQ] = useState("");
  const [name, setName] = useState("");
  const t = useToast();
  const sem = semesterPeriod(today());
  const list = db.students.filter((s) => (q ? s.name.toLowerCase().includes(q.toLowerCase()) : s.groupId === groupId)).slice(0, 100);

  return (
    <div>
      <PageHeader title="Студенты" subtitle={`Всего ${db.students.length}. Поиск работает по всем группам`} />
      <Card className="mb-6 grid gap-3 p-4 md:grid-cols-[140px_1fr]">
        <Select label="Группа" value={groupId} onChange={(e) => { setGroupId(e.target.value); setQ(""); }}>
          {db.groups.map((g) => <option key={g.id} value={g.id}>{g.code}</option>)}
        </Select>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">Поиск по ФИО</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Например, Иванов" className={inputCls} />
        </label>
        <div className="flex gap-2 md:col-span-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ФИО нового студента" className={inputCls} />
          <Button variant="gold" onClick={() => { const r = addStudent(name, groupId); t.show(r); if (r.ok) setName(""); }}><Icon name="plus" className="size-4" />Добавить</Button>
        </div>
      </Card>
      <Card className="scroll-x">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-5 py-3 font-semibold">ФИО</th><th className="px-3 py-3 font-semibold">Группа</th><th className="px-3 py-3 font-semibold">Посещаемость</th><th className="px-5 py-3 text-right font-semibold">Ср. балл</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {list.map((s) => (
              <tr key={s.id}>
                <td className="px-5 py-3 font-medium">{s.name}</td>
                <td className="px-3 py-3">{db.groups.find((g) => g.id === s.groupId)?.code}</td>
                <td className="px-3 py-3 text-muted">{attendanceSummary(db, s.id, sem, today()).rate}%</td>
                <td className="px-5 py-3 text-right"><AvgBadge value={(() => { const v = Object.values(db.grades).filter((g) => g.studentId === s.id && g.date >= sem.from); return v.length ? v.reduce((a, g) => a + g.value, 0) / v.length : null; })()} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      {t.node}
    </div>
  );
}

export function AdminTeachers() {
  const { db } = useStore();
  const [name, setName] = useState("");
  const t = useToast();
  return (
    <div>
      <PageHeader title="Преподаватели" subtitle="Нагрузка рассчитывается автоматически по расписанию" />
      <Card className="mb-6 flex gap-2 p-4">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Фамилия И.О." className={inputCls} />
        <Button variant="gold" onClick={() => { const r = addTeacher(name); t.show(r); if (r.ok) setName(""); }}><Icon name="plus" className="size-4" />Добавить</Button>
      </Card>
      <Card className="scroll-x">
        <table className="w-full min-w-[620px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-5 py-3 font-semibold">Преподаватель</th><th className="px-3 py-3 font-semibold">Предметы</th><th className="px-3 py-3 font-semibold">Группы</th><th className="px-5 py-3 text-right font-semibold">Пар в неделю</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {db.teachers.map((tc) => {
              const ls = db.loads.filter((l) => l.teacherId === tc.id);
              const subj = [...new Set(ls.map((l) => db.subjects.find((s) => s.id === l.subjectId)?.name))];
              const grp = [...new Set(ls.map((l) => db.groups.find((g) => g.id === l.groupId)?.code))];
              return (
                <tr key={tc.id} className="align-top">
                  <td className="whitespace-nowrap px-5 py-3 font-medium">{tc.name}</td>
                  <td className="max-w-xs px-3 py-3 text-xs text-muted">{subj.slice(0, 3).join(", ")}{subj.length > 3 && ` и ещё ${subj.length - 3}`}</td>
                  <td className="max-w-[220px] px-3 py-3 text-xs">{grp.join(", ") || "-"}</td>
                  <td className="px-5 py-3 text-right font-semibold text-brand-900">{db.schedule.filter((s) => s.teacherId === tc.id).length}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
      {t.node}
    </div>
  );
}

export function AdminSubjects() {
  const { db } = useStore();
  const [name, setName] = useState("");
  const [q, setQ] = useState("");
  const t = useToast();
  const list = db.subjects.filter((s) => s.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <PageHeader title="Предметы" subtitle={`${db.subjects.length} дисциплин из действующего расписания`} />
      <Card className="mb-6 grid gap-3 p-4 md:grid-cols-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск предмета" className={inputCls} />
        <div className="flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Новый предмет" className={inputCls} />
          <Button variant="gold" onClick={() => { const r = addSubject(name); t.show(r); if (r.ok) setName(""); }}><Icon name="plus" className="size-4" />Добавить</Button>
        </div>
      </Card>
      <Card>
        <ul className="divide-y divide-line">
          {list.map((s) => {
            const groups = new Set(db.loads.filter((l) => l.subjectId === s.id).map((l) => l.groupId)).size;
            return (
              <li key={s.id} className="flex items-center gap-3 px-5 py-3">
                <span className="min-w-0 flex-1 text-sm font-medium">{s.name}</span>
                {!s.graded && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-muted">без оценок</span>}
                <span className="text-xs text-muted">{groups} групп</span>
              </li>
            );
          })}
        </ul>
      </Card>
      {t.node}
    </div>
  );
}

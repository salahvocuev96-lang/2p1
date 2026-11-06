"use client";
// Административная панель учебной части: обзор, группы, студенты, преподаватели, предметы
import Link from "next/link";
import { useMemo, useState } from "react";
import { act, useStore } from "@/lib/store";
import { AvgBadge, Badge, Button, Card, CardHeader, Empty, Field, Hero, MoreLink, PageHeader, SearchInput, Select, cx, heroBtn, inputCls } from "@/components/ui";
import { DataTable } from "@/components/DataTable";
import { Modal, toastResult } from "@/components/feedback";
import { Icon } from "@/components/icons";
import { SPECIALTIES } from "@/lib/constants";
import { formatTime, semesterPeriod } from "@/lib/dates";
import { nameOf } from "@/lib/access";
import { ACTION_LABEL } from "@/features/shared/AuditLog";
import type { Group, Student, Subject, Teacher } from "@/lib/types";

const COURSES = [1, 2, 3, 4] as const;

function useAdmin() {
  const store = useStore();
  const stat = useMemo(() => new Map(store.db.groupStats.map((g) => [g.groupId, g])), [store.db.groupStats]);
  return { ...store, stat };
}

// ---------------- Обзор ----------------

export function AdminHome() {
  const { db, stat } = useAdmin();
  const sem = semesterPeriod(db.serverToday, db.settings);
  const weighted = (pick: (g: { avg: number | null; attendanceRate: number | null }) => number | null) => {
    let sum = 0;
    let n = 0;
    db.groupStats.forEach((g) => {
      const v = pick(g);
      if (v !== null) {
        sum += v * g.students;
        n += g.students;
      }
    });
    return n ? sum / n : null;
  };
  const avg = weighted((g) => g.avg);
  const att = weighted((g) => g.attendanceRate);
  const byCourse = COURSES.map((c) => {
    const gs = db.groups.filter((g) => g.course === c);
    const st = gs.map((g) => stat.get(g.id)).filter(Boolean);
    const students = st.reduce((a, s) => a + s!.students, 0);
    const avgs = st.filter((s) => s!.avg !== null);
    return { c, groups: gs.length, students, avg: avgs.length ? avgs.reduce((a, s) => a + s!.avg! * s!.students, 0) / avgs.reduce((a, s) => a + s!.students, 0) : null };
  });
  const top = db.groups.map((g) => ({ g, avg: stat.get(g.id)?.avg ?? null, att: stat.get(g.id)?.attendanceRate ?? null })).sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0));
  const recent = db.audit.filter((e) => e.action !== "auth.login" && e.action !== "grade.create").slice(0, 8);
  const maxStudents = Math.max(...byCourse.map((c) => c.students), 1);

  const weak = db.groups
    .map((g) => ({ g, avg: stat.get(g.id)?.avg ?? null, att: stat.get(g.id)?.attendanceRate ?? null }))
    .filter((x) => (x.avg !== null && x.avg < 3.8) || (x.att !== null && x.att < 90))
    .sort((a, b) => (a.avg ?? 5) - (b.avg ?? 5))
    .slice(0, 4);
  const todayChanges = (db.scheduleChanges ?? []).filter((c) => c.date >= db.serverToday).length;

  return (
    <div className="stagger space-y-4 sm:space-y-5">
      <Hero
        eyebrow="Учебная часть"
        title="Обзор колледжа"
        meta={<span>{sem.label} · данные на {db.serverToday.split("-").reverse().join(".")}</span>}
        actions={<>
          <Link href="/announcements/" className={heroBtn(true)}><Icon name="megaphone" className="size-4" />Объявление</Link>
          <Link href="/changes/" className={heroBtn()}><Icon name="calendar" className="size-4" />Замены{todayChanges > 0 && <span className="rounded bg-white/15 px-1.5 text-[11px]">{todayChanges}</span>}</Link>
          <Link href="/accounts/" className={cx(heroBtn(), "max-sm:hidden")}><Icon name="key" className="size-4" />Аккаунты</Link>
        </>}
        aside={
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Средний балл", value: avg === null ? "—" : avg.toFixed(2).replace(".", ","), hint: sem.label, pct: avg === null ? 0 : (avg / 5) * 100, cls: "bg-gold-400" },
              { label: "Посещаемость", value: att === null ? "—" : `${Math.round(att)}%`, hint: "присутствие на парах", pct: att ?? 0, cls: att !== null && att >= 90 ? "bg-emerald-400" : "bg-rose-400" },
            ].map((m) => (
              <div key={m.label} className="rounded-xl bg-white/[0.07] p-3.5 ring-1 ring-inset ring-white/10">
                <p className="text-xs text-white/60">{m.label}</p>
                <p className="mt-1 text-[26px] font-semibold leading-none tabular-nums">{m.value}</p>
                <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/10"><div className={cx("bar-x h-full rounded-full", m.cls)} style={{ width: `${m.pct}%` }} /></div>
                <p className="mt-1.5 truncate text-[11px] text-white/45">{m.hint}</p>
              </div>
            ))}
          </div>
        }
        metrics={[
          { label: "Студентов", value: db.students.length, hint: `${db.parents.length} родителей` },
          { label: "Преподавателей", value: db.teachers.length },
          { label: "Групп", value: db.groups.length, hint: "1–4 курс" },
          { label: "Предметов", value: db.subjects.length },
        ]}
      />

      <div className="grid gap-4 sm:gap-5 lg:grid-cols-2 xl:grid-cols-3">
        <div className="min-w-0 space-y-4 sm:space-y-5">
          <Card>
            <CardHeader icon="chart" title="Курсы" subtitle="Студенты и средний балл" />
            <div className="space-y-4 p-4 sm:p-5">
              {byCourse.map((c) => (
                <div key={c.c}>
                  <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                    <span className="font-semibold text-ink">{c.c} курс <span className="font-normal text-muted">· {c.groups} групп · {c.students} чел.</span></span>
                    <AvgBadge value={c.avg} />
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="bar-x h-full rounded-full bg-brand-600" style={{ width: `${(c.students / maxStudents) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <CardHeader icon="alert" tone="red" title="Требуют внимания" subtitle="Балл ниже 3,8 или посещаемость ниже 90%" />
            {weak.length === 0 ? <Empty icon="check" title="Всё в порядке" text="Отстающих групп нет" /> : (
              <ul className="divide-y divide-line">
                {weak.map(({ g, avg: a, att: r }) => (
                  <li key={g.id}>
                    <Link href="/groups/" className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-subtle sm:px-5">
                      <span className="w-12 text-sm font-semibold text-ink">{g.code}</span>
                      <span className="min-w-0 flex-1 truncate text-xs text-muted">{SPECIALTIES[g.specialty]}</span>
                      <span className={cx("text-xs tabular-nums", r !== null && r < 90 ? "font-semibold text-rose-600" : "text-muted")}>{r ?? "—"}%</span>
                      <AvgBadge value={a} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
        <Card>
          <CardHeader icon="star" tone="gold" title="Рейтинг групп" subtitle="По среднему баллу" action={<Link href="/groups/"><MoreLink>Все группы</MoreLink></Link>} />
          <ul className="divide-y divide-line">
            {top.slice(0, 8).map(({ g, avg: a, att: r }, i) => (
              <li key={g.id} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
                <span className={cx("grid size-6 shrink-0 place-items-center rounded-md text-[11px] font-bold tabular-nums", i < 3 ? "bg-gold-100 text-gold-700" : "bg-slate-100 text-slate-500")}>{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-ink">{g.code}</span>
                  <span className="block truncate text-xs text-muted">{SPECIALTIES[g.specialty]}</span>
                </span>
                <span className="text-xs tabular-nums text-muted">{r ?? "—"}%</span>
                <AvgBadge value={a} />
              </li>
            ))}
          </ul>
        </Card>
        <Card className="lg:col-span-2 xl:col-span-1">
          <CardHeader icon="history" title="Последние изменения" action={<Link href="/audit/"><MoreLink>Журнал</MoreLink></Link>} />
          {recent.length === 0 ? <Empty icon="history" title="Изменений пока не было" text="Здесь появятся изменения оценок, расписания и аккаунтов" /> : (
            <ol className="px-4 py-2 sm:px-5">
              {recent.map((e, i) => (
                <li key={e.id} className="relative flex gap-3 py-2">
                  <span className="relative flex w-2.5 shrink-0 justify-center">
                    <span className={cx("absolute w-px bg-line", i === 0 ? "top-2.5" : "-top-2", i === recent.length - 1 ? "h-3" : "-bottom-2")} />
                    <span className="relative mt-1.5 size-2 rounded-full bg-brand-500 ring-[3px] ring-white" />
                  </span>
                  <span className="min-w-0 flex-1 text-[13px]">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5"><span className="font-medium text-ink">{nameOf(db, e.actorId)}</span><span className="text-muted">{ACTION_LABEL[e.action] ?? e.action}</span></span>
                    {e.reason && <span className="block truncate text-xs italic text-muted">«{e.reason}»</span>}
                    <span className="text-[11px] tabular-nums text-muted/80">{formatTime(e.at)}</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </div>
  );
}

// ---------------- Группы ----------------

export function AdminGroups() {
  const { db, stat } = useAdmin();
  const [course, setCourse] = useState<Group["course"]>(1);
  const [spec, setSpec] = useState("П");
  const [edit, setEdit] = useState<Group | null>(null);
  const [curator, setCurator] = useState("");

  return (
    <div>
      <PageHeader title="Группы" subtitle={`${db.groups.length} групп. Количество не ограничено: группа добавляется одной кнопкой`} />
      <Card className="mb-6 grid gap-3 p-5 sm:grid-cols-[140px_1fr_auto] sm:items-end">
        <Select label="Курс" value={course} onChange={(e) => setCourse(Number(e.target.value) as Group["course"])}>
          {COURSES.map((c) => <option key={c} value={c}>{c} курс</option>)}
        </Select>
        <Select label="Специальность" value={spec} onChange={(e) => setSpec(e.target.value)}>
          {Object.entries(SPECIALTIES).map(([k, v]) => <option key={k} value={k}>{k} · {v}</option>)}
        </Select>
        <Button variant="brand" onClick={async () => toastResult(await act("group.create", { course, specialty: spec }))}><Icon name="plus" className="size-4" />Добавить группу</Button>
      </Card>
      <div className="grid items-start gap-4 sm:gap-5 xl:grid-cols-2">
        {COURSES.map((c) => {
          const gs = db.groups.filter((g) => g.course === c);
          return (
            <Card key={c}>
              <CardHeader icon="layers" title={`${c} курс`} action={<span className="text-xs text-muted">{gs.length} групп</span>} />
              <ul className="divide-y divide-line">
                {gs.map((g) => {
                  const s = stat.get(g.id);
                  return (
                    <li key={g.id}>
                      <button onClick={() => { setEdit(g); setCurator(g.curatorId ?? ""); }} className="flex w-full items-center gap-3 px-5 py-3 text-left transition hover:bg-page">
                        <span className="w-14 font-bold text-brand-900">{g.code}</span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2 truncate text-sm">{SPECIALTIES[g.specialty] ?? g.specialty}{g.isDemo && <Badge tone="gray">демо</Badge>}</span>
                          <span className="block truncate text-xs text-muted">{s?.students ?? 0} студентов · {g.curatorId ? `куратор ${nameOf(db, g.curatorId)}` : "куратор не назначен"}</span>
                        </span>
                        <span className="hidden text-xs tabular-nums text-muted sm:inline">{s?.attendanceRate ?? "—"}%</span>
                        <AvgBadge value={s?.avg ?? null} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Card>
          );
        })}
      </div>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={`Группа ${edit?.code ?? ""}`}
        footer={<><Button variant="outline" onClick={() => setEdit(null)}>Закрыть</Button><Button onClick={async () => { const r = await act("group.update", { id: edit!.id, curatorId: curator || null }); toastResult(r); if (r.ok) setEdit(null); }}>Сохранить</Button></>}>
        {edit && (
          <div className="space-y-4">
            <p className="text-sm text-muted">{SPECIALTIES[edit.specialty]}, {edit.course} курс</p>
            <Select label="Куратор" value={curator} onChange={(e) => setCurator(e.target.value)}>
              <option value="">Не назначен</option>
              {db.teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
            <div className="flex flex-wrap gap-2 text-sm">
              <Link href="/students/" className="font-semibold text-brand-700">Студенты группы</Link><span className="text-muted">·</span>
              <Link href="/schedule/" className="font-semibold text-brand-700">Расписание</Link><span className="text-muted">·</span>
              <Link href="/loads/" className="font-semibold text-brand-700">Назначения преподавателей</Link>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ---------------- Студенты ----------------

export function AdminStudents() {
  const { db } = useAdmin();
  const [groupId, setGroupId] = useState("");
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<Student | "new" | null>(null);
  const [csv, setCsv] = useState<string | null>(null);
  const rows = db.students.filter((s) => (!groupId || s.groupId === groupId) && (!q.trim() || s.name.toLowerCase().includes(q.trim().toLowerCase())));
  const code = (id: string) => db.groups.find((g) => g.id === id)?.code ?? "";

  return (
    <div>
      <PageHeader title="Студенты" subtitle={`${db.students.length} студентов. Данные вымышленные`}
        action={<div className="flex gap-2"><Button variant="outline" onClick={() => setCsv("")}><Icon name="upload" className="size-4" />Импорт CSV</Button><Button variant="brand" onClick={() => setEdit("new")}><Icon name="plus" className="size-4" />Добавить</Button></div>} />
      <Card className="mb-4 grid gap-3 p-4 sm:grid-cols-[1fr_200px]">
        <SearchInput value={q} onChange={setQ} placeholder="Поиск по ФИО" />
        <Select value={groupId} onChange={(e) => setGroupId(e.target.value)} aria-label="Группа">
          <option value="">Все группы</option>
          {db.groups.map((g) => <option key={g.id} value={g.id}>{g.code}</option>)}
        </Select>
      </Card>
      <Card>
        <DataTable
          rows={rows}
          rowKey={(s) => s.id}
          onRowClick={(s) => setEdit(s)}
          columns={[
            { key: "name", label: "ФИО", primary: true, render: (s) => s.name, sort: (s) => s.name },
            { key: "group", label: "Группа", render: (s) => code(s.groupId), sort: (s) => code(s.groupId) },
            { key: "parent", label: "Родитель", render: (s) => nameOf(db, s.parentId), className: "hidden lg:table-cell" },
            { key: "avg", label: "Средний", render: (s) => <AvgBadge value={db.studentAvg?.[s.id] ?? null} />, sort: (s) => db.studentAvg?.[s.id] ?? null },
          ]}
        />
      </Card>
      {edit && <StudentEditor student={edit === "new" ? null : edit} onClose={() => setEdit(null)} />}
      <Modal open={csv !== null} onClose={() => setCsv(null)} title="Импорт студентов из CSV" wide
        footer={<>
          <Button variant="outline" onClick={async () => toastResult(await act("import.studentsCsv", { csv, dryRun: true }))} disabled={!csv}>Проверить</Button>
          <Button onClick={async () => { const r = await act("import.studentsCsv", { csv, dryRun: false }); toastResult(r); if (r.ok) setCsv(null); }} disabled={!csv}>Импортировать</Button>
        </>}>
        <div className="space-y-3">
          <p className="text-sm text-muted">Формат: одна строка на студента, поля через точку с запятой: <code className="rounded bg-page px-1">ФИО студента;Группа;ФИО родителя</code>. Первая строка с заголовками пропускается. Если в файле есть ошибка, ничего не импортируется.</p>
          <input type="file" accept=".csv,text/csv" className="block text-sm" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setCsv(await f.text()); }} />
          <textarea className={cx(inputCls, "h-48 py-2 font-mono text-xs")} value={csv ?? ""} onChange={(e) => setCsv(e.target.value)} placeholder={"ФИО;Группа;Родитель\nТестов Пётр Иванович;2П1;Тестова Анна Сергеевна"} />
          <button className="text-xs font-semibold text-brand-700" onClick={() => setCsv("ФИО;Группа;Родитель\nТестов Пётр Иванович;2П1;Тестова Анна Сергеевна\nПримерова Ольга Андреевна;1Б1;Примеров Андрей Олегович")}>Подставить пример</button>
        </div>
      </Modal>
    </div>
  );
}

function StudentEditor({ student, onClose }: { student: Student | null; onClose: () => void }) {
  const { db } = useStore();
  const [name, setName] = useState(student?.name ?? "");
  const [groupId, setGroupId] = useState(student?.groupId ?? db.groups[0]?.id ?? "");
  const [email, setEmail] = useState(student?.email ?? "");
  const [phone, setPhone] = useState(student?.phone ?? "");
  const [parent, setParent] = useState("");
  const save = async () => {
    const r = student ? await act("student.update", { id: student.id, name, groupId, email, phone }) : await act("student.create", { name, groupId, parentName: parent });
    toastResult(r);
    if (r.ok) onClose();
  };
  return (
    <Modal open onClose={onClose} title={student ? "Карточка студента" : "Новый студент"} footer={<><Button variant="outline" onClick={onClose}>Отмена</Button><Button onClick={save}>Сохранить</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="ФИО" className="sm:col-span-2"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Select label="Группа" value={groupId} onChange={(e) => setGroupId(e.target.value)}>{db.groups.map((g) => <option key={g.id} value={g.id}>{g.code}</option>)}</Select>
        {student ? (
          <>
            <Field label="Телефон"><input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
            <Field label="Эл. почта" className="sm:col-span-2"><input className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
            <p className="text-xs text-muted sm:col-span-2">Родитель: {nameOf(db, student.parentId)}. Перевод в другую группу сохраняется в журнале аудита.</p>
          </>
        ) : <Field label="ФИО родителя"><input className={inputCls} value={parent} onChange={(e) => setParent(e.target.value)} /></Field>}
      </div>
    </Modal>
  );
}

// ---------------- Преподаватели ----------------

export function AdminTeachers() {
  const { db } = useAdmin();
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<Teacher | "new" | null>(null);
  const rows = db.teachers.filter((t) => !q.trim() || t.name.toLowerCase().includes(q.trim().toLowerCase()));
  const loadsOf = (id: string) => db.loads.filter((l) => l.teacherId === id);
  return (
    <div>
      <PageHeader title="Преподаватели" subtitle="Список взят из расписания колледжа" action={<Button variant="brand" onClick={() => setEdit("new")}><Icon name="plus" className="size-4" />Добавить</Button>} />
      <Card className="mb-4 p-4"><SearchInput value={q} onChange={setQ} placeholder="Поиск по ФИО" /></Card>
      <Card>
        <DataTable rows={rows} rowKey={(t) => t.id} onRowClick={(t) => setEdit(t)} columns={[
          { key: "name", label: "ФИО", primary: true, render: (t) => t.name, sort: (t) => t.name },
          { key: "groups", label: "Группы", render: (t) => [...new Set(loadsOf(t.id).map((l) => db.groups.find((g) => g.id === l.groupId)?.code))].join(", ") || "—", className: "max-w-xs truncate" },
          { key: "subj", label: "Предметов", render: (t) => new Set(loadsOf(t.id).map((l) => l.subjectId)).size, sort: (t) => new Set(loadsOf(t.id).map((l) => l.subjectId)).size },
          { key: "pairs", label: "Пар в неделю", render: (t) => db.schedule.filter((s) => s.teacherId === t.id).length, sort: (t) => db.schedule.filter((s) => s.teacherId === t.id).length },
        ]} />
      </Card>
      {edit && <TeacherEditor teacher={edit === "new" ? null : edit} onClose={() => setEdit(null)} />}
    </div>
  );
}

function TeacherEditor({ teacher, onClose }: { teacher: Teacher | null; onClose: () => void }) {
  const [name, setName] = useState(teacher?.name ?? "");
  const [email, setEmail] = useState(teacher?.email ?? "");
  const save = async () => {
    const r = teacher ? await act("teacher.update", { id: teacher.id, name, email }) : await act("teacher.create", { name, email });
    toastResult(r);
    if (r.ok) onClose();
  };
  return (
    <Modal open onClose={onClose} title={teacher ? "Преподаватель" : "Новый преподаватель"} footer={<><Button variant="outline" onClick={onClose}>Отмена</Button><Button onClick={save}>Сохранить</Button></>}>
      <div className="space-y-4">
        <Field label="ФИО"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Эл. почта"><input className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        {teacher && <Link href="/loads/" className="text-sm font-semibold text-brand-700">Назначения на группы и предметы</Link>}
      </div>
    </Modal>
  );
}

// ---------------- Предметы ----------------

export function AdminSubjects() {
  const { db } = useAdmin();
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<Subject | "new" | null>(null);
  const rows = db.subjects.filter((s) => !q.trim() || s.name.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div>
      <PageHeader title="Предметы" subtitle={`${db.subjects.length} дисциплин`} action={<Button variant="brand" onClick={() => setEdit("new")}><Icon name="plus" className="size-4" />Добавить</Button>} />
      <Card className="mb-4 p-4"><SearchInput value={q} onChange={setQ} placeholder="Поиск предмета" /></Card>
      <Card>
        <DataTable rows={rows} rowKey={(s) => s.id} onRowClick={(s) => setEdit(s)} columns={[
          { key: "name", label: "Название", primary: true, render: (s) => s.name, sort: (s) => s.name },
          { key: "graded", label: "Оценивается", render: (s) => s.graded ? <Badge tone="green">да</Badge> : <Badge tone="gray">нет</Badge> },
          { key: "groups", label: "Групп", render: (s) => new Set(db.loads.filter((l) => l.subjectId === s.id).map((l) => l.groupId)).size, sort: (s) => new Set(db.loads.filter((l) => l.subjectId === s.id).map((l) => l.groupId)).size },
          { key: "teachers", label: "Преподавателей", render: (s) => new Set(db.loads.filter((l) => l.subjectId === s.id).map((l) => l.teacherId)).size },
        ]} />
      </Card>
      {edit && <SubjectEditor subject={edit === "new" ? null : edit} onClose={() => setEdit(null)} />}
    </div>
  );
}

function SubjectEditor({ subject, onClose }: { subject: Subject | null; onClose: () => void }) {
  const [name, setName] = useState(subject?.name ?? "");
  const [graded, setGraded] = useState(subject?.graded ?? true);
  const save = async () => {
    const r = subject ? await act("subject.update", { id: subject.id, name, graded }) : await act("subject.create", { name, graded });
    toastResult(r);
    if (r.ok) onClose();
  };
  return (
    <Modal open onClose={onClose} title={subject ? "Предмет" : "Новый предмет"} footer={<><Button variant="outline" onClick={onClose}>Отмена</Button><Button onClick={save}>Сохранить</Button></>}>
      <div className="space-y-4">
        <Field label="Название"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={graded} onChange={(e) => setGraded(e.target.checked)} className="size-4 accent-[var(--color-brand-800)]" />Оценивается в журнале (выключите для «Часа куратора» и подобного)</label>
      </div>
    </Modal>
  );
}

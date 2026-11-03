"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ClientOnly } from "@/components/ClientOnly";
import { Crest } from "@/components/Crest";
import { Icon, type IconName } from "@/components/icons";
import { Button, Select, cx } from "@/components/ui";
import { login, useStore } from "@/lib/store";
import type { Role, SessionUser } from "@/lib/types";

export default function LoginPage() {
  return (
    <ClientOnly>
      <Login />
    </ClientOnly>
  );
}

const ROLES: { role: Role; title: string; text: string; icon: IconName }[] = [
  { role: "student", title: "Студент", text: "Дневник, оценки, расписание и задания", icon: "book" },
  { role: "teacher", title: "Преподаватель", text: "Журнал своих групп и предметов", icon: "journal" },
  { role: "parent", title: "Родитель", text: "Успеваемость и посещаемость ребёнка", icon: "users" },
  { role: "admin", title: "Администрация", text: "Группы, студенты, преподаватели", icon: "shield" },
];

function Login() {
  const { db } = useStore();
  const router = useRouter();
  const [role, setRole] = useState<Role>("student");
  const [groupId, setGroupId] = useState("2p1");
  const groupStudents = useMemo(() => db.students.filter((s) => s.groupId === groupId), [db, groupId]);
  const [studentId, setStudentId] = useState(groupStudents[0]?.id ?? "");
  const defaultTeacher = db.teachers.find((t) => t.name.startsWith("Кудинова"))?.id ?? db.teachers[0].id;
  const [teacherId, setTeacherId] = useState(defaultTeacher);

  const enter = () => {
    let user: SessionUser;
    const st = db.students.find((s) => s.id === studentId) ?? groupStudents[0];
    if (role === "student") user = { id: st.id, role, name: st.name };
    else if (role === "parent") {
      const p = db.parents.find((x) => x.id === st.parentId)!;
      user = { id: p.id, role, name: p.name };
    } else if (role === "teacher") user = { id: teacherId, role, name: db.teachers.find((t) => t.id === teacherId)!.name };
    else user = { id: "admin", role, name: "Администратор колледжа" };
    login(user);
    router.push("/home/");
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* Фирменная панель в стиле герба */}
      <section className="relative hidden overflow-hidden bg-brand-900 text-white lg:flex lg:flex-col lg:justify-between lg:p-14">
        <div className="pointer-events-none absolute -right-32 -top-32 size-[520px] rounded-full border-[40px] border-gold-500/10" />
        <div className="pointer-events-none absolute -bottom-40 -left-20 size-[460px] rounded-full bg-brand-700/40 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <span className="grid size-16 place-items-center rounded-2xl bg-white p-1.5"><Crest className="size-14" /></span>
          <div>
            <p className="text-lg font-bold">Налоговый колледж</p>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold-400">Education portal</p>
          </div>
        </div>
        <div className="relative max-w-xl">
          <h1 className="text-[44px] font-bold leading-[1.08] tracking-tight">
            Оценки, расписание и&nbsp;связь с&nbsp;преподавателями в&nbsp;одном окне
          </h1>
          <p className="mt-5 text-[17px] text-white/70">22 группы, 4 курса и&nbsp;средний балл, который считается сам</p>
          <div className="mt-10 grid grid-cols-3 gap-4">
            {[
              [String(db.groups.length), "групп"],
              [String(db.teachers.length), "преподавателей"],
              [String(db.subjects.length), "дисциплин"],
            ].map(([n, l]) => (
              <div key={l} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-3xl font-bold text-gold-400">{n}</p>
                <p className="mt-1 text-sm text-white/60">{l}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-white/40">Демонстрационная версия. Данные студентов вымышленные, расписание реальное</p>
      </section>

      {/* Выбор демо-аккаунта */}
      <section className="flex flex-col justify-center px-4 py-10 sm:px-10 lg:px-16">
        <div className="mx-auto w-full max-w-xl">
          <div className="mb-8 flex flex-col items-center text-center lg:hidden">
            <Crest className="size-28" />
            <p className="mt-3 text-xl font-bold text-brand-900">Налоговый колледж</p>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold-600">Education portal</p>
          </div>
          <h2 className="text-2xl font-bold text-brand-900 md:text-3xl">Вход в&nbsp;личный кабинет</h2>
          <p className="mt-2 text-sm text-muted">Выберите роль. В&nbsp;демо-версии пароль не&nbsp;нужен</p>

          <div className="mt-6 grid grid-cols-2 gap-3">
            {ROLES.map((r) => (
              <button
                key={r.role}
                onClick={() => setRole(r.role)}
                className={cx(
                  "rounded-2xl border bg-white p-4 text-left transition",
                  role === r.role ? "border-gold-500 shadow-[0_0_0_3px_var(--color-gold-100)]" : "border-line hover:border-brand-700/30",
                )}
              >
                <span className={cx("grid size-10 place-items-center rounded-xl", role === r.role ? "bg-brand-900 text-gold-400" : "bg-brand-50 text-brand-700")}>
                  <Icon name={r.icon} />
                </span>
                <p className="mt-3 font-semibold text-brand-900">{r.title}</p>
                <p className="mt-0.5 text-[13px] leading-snug text-muted">{r.text}</p>
              </button>
            ))}
          </div>

          <div className="mt-5 space-y-3 rounded-2xl border border-line bg-white p-4">
            {(role === "student" || role === "parent") && (
              <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
                <Select label="Группа" value={groupId} onChange={(e) => { setGroupId(e.target.value); setStudentId(db.students.find((s) => s.groupId === e.target.value)?.id ?? ""); }}>
                  {db.groups.map((g) => <option key={g.id} value={g.id}>{g.code}</option>)}
                </Select>
                <Select label={role === "parent" ? "Ребёнок" : "Студент"} value={studentId} onChange={(e) => setStudentId(e.target.value)}>
                  {groupStudents.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
              </div>
            )}
            {role === "teacher" && (
              <Select label="Преподаватель" value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
                {db.teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
            )}
            {role === "admin" && <p className="text-sm text-muted">Полный доступ к&nbsp;справочникам и&nbsp;статистике колледжа</p>}
            <Button variant="gold" className="h-12 w-full text-[15px]" onClick={enter}>
              Войти в&nbsp;кабинет
              <Icon name="chevronRight" className="size-4" />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

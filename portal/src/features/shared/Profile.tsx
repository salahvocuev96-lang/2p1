"use client";
import { logout, resetDemo, useStore } from "@/lib/store";
import { ROLE_LABEL } from "@/lib/nav";
import { Avatar, Button, Card, CardHeader, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icons";
import { SPECIALTIES } from "@/lib/seed";
import { teacherLoads } from "@/lib/access";

export function Profile() {
  const { db, session } = useStore();
  const s = session!;
  const rows: [string, string][] = [["Роль", ROLE_LABEL[s.role]]];
  if (s.role === "student") {
    const st = db.students.find((x) => x.id === s.id)!;
    const g = db.groups.find((x) => x.id === st.groupId)!;
    rows.push(["Группа", g.code], ["Курс", String(g.course)], ["Специальность", SPECIALTIES[g.specialty] ?? g.specialty], ["Эл. почта", st.email], ["Телефон", st.phone], ["Родитель", db.parents.find((p) => p.id === st.parentId)?.name ?? ""]);
  }
  if (s.role === "parent") {
    const p = db.parents.find((x) => x.id === s.id)!;
    const st = db.students.find((x) => x.id === p.childIds[0])!;
    rows.push(["Ребёнок", st.name], ["Группа", db.groups.find((g) => g.id === st.groupId)?.code ?? ""], ["Телефон", p.phone]);
  }
  if (s.role === "teacher") {
    const t = db.teachers.find((x) => x.id === s.id)!;
    const loads = teacherLoads(db, s.id);
    rows.push(["Эл. почта", t.email], ["Групп", String(new Set(loads.map((l) => l.groupId)).size)], ["Предметов", String(new Set(loads.map((l) => l.subjectId)).size)]);
    const curated = db.groups.filter((g) => g.curatorId === s.id).map((g) => g.code);
    if (curated.length) rows.push(["Куратор групп", curated.join(", ")]);
  }

  return (
    <div className="max-w-3xl">
      <PageHeader title="Профиль" />
      <Card>
        <div className="flex items-center gap-4 border-b border-line p-6">
          <Avatar name={s.name} className="size-16 bg-brand-900 text-lg text-gold-400" />
          <div>
            <p className="text-xl font-bold text-brand-900">{s.name}</p>
            <p className="text-sm text-muted">{ROLE_LABEL[s.role]}</p>
          </div>
        </div>
        <dl className="divide-y divide-line">
          {rows.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[140px_1fr] gap-4 px-6 py-3 text-sm sm:grid-cols-[200px_1fr]">
              <dt className="text-muted">{k}</dt>
              <dd className="font-medium text-ink">{v || "-"}</dd>
            </div>
          ))}
        </dl>
      </Card>
      <Card className="mt-6">
        <CardHeader icon="settings" title="Демо-режим" />
        <div className="flex flex-wrap gap-3 p-5">
          <Button variant="outline" onClick={logout}><Icon name="logout" className="size-4" />Сменить роль</Button>
          <Button variant="outline" onClick={() => confirm("Сбросить все изменения демо-версии?") && resetDemo()}>Сбросить демо-данные</Button>
        </div>
        <p className="px-5 pb-5 text-xs text-muted">Изменения хранятся в&nbsp;этом браузере (LocalStorage). Сброс вернёт исходные оценки и&nbsp;сообщения</p>
      </Card>
    </div>
  );
}

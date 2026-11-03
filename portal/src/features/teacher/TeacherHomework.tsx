"use client";
import { useMemo, useState } from "react";
import { useTeacher } from "./useTeacher";
import { Button, Card, CardHeader, Empty, PageHeader, Select, inputCls } from "@/components/ui";
import { Toast } from "./Toast";
import { addDays, formatShort, today } from "@/lib/dates";
import { addHomework } from "@/lib/store";

export function TeacherHomework() {
  const { db, version, session, loads, groups } = useTeacher();
  const [groupId, setGroupId] = useState(groups[0]?.id ?? "");
  const subs = db.subjects.filter((s) => s.graded && loads.some((l) => l.groupId === groupId && l.subjectId === s.id));
  const [subjectId, setSubjectId] = useState("");
  const sid = subs.some((s) => s.id === subjectId) ? subjectId : subs[0]?.id ?? "";
  const [text, setText] = useState("");
  const [due, setDue] = useState(addDays(today(), 7));
  const [toast, setToast] = useState<{ msg: string; tone: "ok" | "err" } | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const list = useMemo(() => db.homework.filter((h) => h.teacherId === session!.id).sort((a, b) => b.issued.localeCompare(a.issued)), [db, version, session]);

  const submit = () => {
    const r = addHomework(groupId, sid, text, due);
    if (r.ok) { setText(""); setToast({ msg: "Задание выдано, студенты получили уведомление", tone: "ok" }); }
    else setToast({ msg: r.error, tone: "err" });
  };

  return (
    <div>
      <PageHeader title="Домашние задания" subtitle="Задание сразу появится в дневнике студентов группы" />
      <Card className="mb-6">
        <CardHeader icon="plus" title="Новое задание" />
        <div className="grid gap-3 p-4 md:grid-cols-[120px_1fr_170px]">
          <Select label="Группа" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.code}</option>)}
          </Select>
          <Select label="Предмет" value={sid} onChange={(e) => setSubjectId(e.target.value)}>
            {subs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">Срок сдачи</span>
            <input type="date" value={due} min={today()} onChange={(e) => setDue(e.target.value)} className={inputCls} />
          </label>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="Например: решить задачи 1-5 из практикума" className={`${inputCls} h-auto py-2 md:col-span-3`} />
          <div className="md:col-span-3"><Button variant="gold" onClick={submit} disabled={!sid}>Выдать задание</Button></div>
        </div>
      </Card>
      <Card>
        <CardHeader icon="task" title="Выданные задания" />
        {list.length === 0 ? <Empty icon="task" title="Заданий пока нет" /> : (
          <ul className="divide-y divide-line">
            {list.map((h) => {
              const total = db.students.filter((s) => s.groupId === h.groupId).length;
              const done = Object.keys(db.homeworkDone).filter((k) => k.startsWith(h.id + "|")).length;
              return (
                <li key={h.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3">
                  <span className="w-12 text-sm font-bold text-brand-900">{db.groups.find((g) => g.id === h.groupId)?.code}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{db.subjects.find((s) => s.id === h.subjectId)?.name}</span>
                    <span className="block truncate text-xs text-muted">{h.text}</span>
                  </span>
                  <span className="text-xs text-muted">выполнили {done} из {total}</span>
                  <span className="rounded-full bg-gold-50 px-2.5 py-0.5 text-xs font-semibold text-gold-600">до {formatShort(h.due)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      {toast && <Toast msg={toast.msg} tone={toast.tone} onClose={() => setToast(null)} />}
    </div>
  );
}

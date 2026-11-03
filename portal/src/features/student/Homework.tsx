"use client";
import { useMemo, useState } from "react";
import { useViewer } from "../useViewer";
import { Card, Empty, PageHeader, Segmented, cx } from "@/components/ui";
import { Icon } from "@/components/icons";
import { formatShort, today } from "@/lib/dates";
import { subjectName } from "@/lib/queries";
import { toggleHomeworkDone } from "@/lib/store";

export function StudentHomework() {
  const { db, version, student, isParent } = useViewer();
  const [tab, setTab] = useState<"active" | "done">("active");
  const now = today();
  const list = useMemo(() => {
    if (!student) return [];
    return db.homework
      .filter((h) => h.groupId === student.groupId)
      .map((h) => ({ ...h, done: !!db.homeworkDone[`${h.id}|${student.id}`] }))
      .sort((a, b) => a.due.localeCompare(b.due));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, version, student]);
  if (!student) return null;
  const shown = list.filter((h) => (tab === "done" ? h.done : !h.done));

  return (
    <div>
      <PageHeader
        title="Домашние задания"
        subtitle={isParent ? "Задания группы и отметки ребёнка о выполнении" : "Отмечайте выполненные задания, чтобы не потерять их"}
        action={<Segmented value={tab} onChange={setTab} options={[{ value: "active", label: `Актуальные · ${list.filter((h) => !h.done).length}` }, { value: "done", label: "Выполненные" }]} />}
      />
      {shown.length === 0 ? <Card><Empty icon="task" title={tab === "done" ? "Пока ничего не отмечено" : "Все задания выполнены"} /></Card> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((h) => {
            const overdue = !h.done && h.due < now;
            return (
              <Card key={h.id} className="flex flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold leading-snug text-brand-900">{subjectName(db, h.subjectId)}</p>
                  <span className={cx("shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold", overdue ? "bg-rose-50 text-rose-600" : "bg-gold-50 text-gold-600")}>
                    {overdue ? "просрочено" : `до ${formatShort(h.due)}`}
                  </span>
                </div>
                <p className="mt-2 flex-1 text-sm text-muted">{h.text}</p>
                <p className="mt-3 text-xs text-muted">{db.teachers.find((t) => t.id === h.teacherId)?.name} · выдано {formatShort(h.issued)}</p>
                {!isParent && (
                  <button
                    onClick={() => toggleHomeworkDone(h.id)}
                    className={cx("mt-4 flex h-10 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition", h.done ? "bg-emerald-50 text-emerald-700" : "bg-brand-800 text-white hover:bg-brand-700")}
                  >
                    <Icon name="check" className="size-4" />
                    {h.done ? "Выполнено" : "Отметить выполненным"}
                  </button>
                )}
                {isParent && h.done && <p className="mt-3 text-sm font-semibold text-emerald-700">Отмечено как выполненное</p>}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

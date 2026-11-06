"use client";
import { useState } from "react";
import { useStore, act } from "@/lib/store";
import { Badge, Button, Card, Empty, Field, PageHeader, Select, cx, inputCls } from "@/components/ui";
import { Modal, toastResult, useConfirm } from "@/components/feedback";
import { Icon } from "@/components/icons";
import { WEEKDAYS, addDays, formatLong, startOfWeek } from "@/lib/dates";
import type { ScheduleChange } from "@/lib/types";
import { BELLS } from "@/lib/dates";

interface AddForm {
  date: string;
  groupId: string;
  slot: string;
  kind: "cancel" | "substitute";
  newTeacherId: string;
  newRoom: string;
  note: string;
}

export function ScheduleChanges() {
  const { db } = useStore();
  const [weekOffset, setWeekOffset] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const confirm = useConfirm();

  const week = addDays(startOfWeek(db.serverToday), weekOffset * 7);
  const weekDates = Array.from({ length: 6 }, (_, i) => addDays(week, i));
  const dateSet = new Set(weekDates);
  const weekChanges = (db.scheduleChanges ?? []).filter((c) => dateSet.has(c.date));

  const remove = async (c: ScheduleChange) => {
    const groupCode = db.groups.find((g) => g.id === c.groupId)?.code ?? c.groupId;
    if (!(await confirm.ask(`Удалить замену? Группа ${groupCode}, ${c.slot} пара, ${formatLong(c.date)}`, "Расписание на этот день вернётся к базовому. Студенты получат уведомление.", { confirm: "Удалить", danger: true }))) return;
    const r = await act("schedule.removeChange", { date: c.date, groupId: c.groupId, slot: c.slot });
    toastResult(r);
  };

  const weekLabel = weekOffset === 0 ? "Текущая неделя" : weekOffset === 1 ? "Следующая неделя" : `Неделя с ${formatLong(week)}`;

  return (
    <div>
      <PageHeader
        title="Замены в расписании"
        subtitle="Отмены и замены занятий на конкретную дату"
        action={
          <Button onClick={() => setAddOpen(true)}>
            <Icon name="plus" className="size-4" />Добавить замену
          </Button>
        }
      />

      <div className="mb-5 flex items-center gap-2">
        <Button variant="outline" className="h-9" onClick={() => setWeekOffset((w) => w - 1)} aria-label="Предыдущая неделя">
          <Icon name="chevronLeft" className="size-4" />
        </Button>
        <span className="min-w-56 text-center text-sm font-medium text-brand-900">{weekLabel}</span>
        <Button variant="outline" className="h-9" onClick={() => setWeekOffset((w) => w + 1)} aria-label="Следующая неделя">
          <Icon name="chevronRight" className="size-4" />
        </Button>
      </div>

      {weekChanges.length === 0 ? (
        <Empty icon="calendar" title="Замен нет" text="На эту неделю замены не внесены" />
      ) : (
        <div className="space-y-4">
          {weekDates.map((date, i) => {
            const dayChanges = weekChanges.filter((c) => c.date === date).sort((a, b) => a.slot - b.slot);
            if (!dayChanges.length) return null;
            return (
              <Card key={date} className="overflow-hidden">
                <div className="flex items-center border-b border-line px-5 py-3">
                  <p className="font-semibold text-ink">{WEEKDAYS[i]}<span className="ml-2 text-xs font-normal text-muted">{formatLong(date)}</span></p>
                  <span className="ml-auto text-xs text-muted">{dayChanges.length} {dayChanges.length === 1 ? "замена" : "замены"}</span>
                </div>
                <ul className="divide-y divide-line">
                  {dayChanges.map((c) => {
                    const group = db.groups.find((g) => g.id === c.groupId);
                    const teacher = c.newTeacherId ? db.teachers.find((t) => t.id === c.newTeacherId) : null;
                    const slot = db.schedule.find((s) => s.groupId === c.groupId && s.slot === c.slot);
                    const subject = slot ? db.subjects.find((s) => s.id === slot.subjectId) : null;
                    const origTeacher = slot ? db.teachers.find((t) => t.id === slot.teacherId) : null;
                    return (
                      <li key={`${c.groupId}-${c.slot}`} className="flex items-start gap-3 px-5 py-3">
                        <div className="mt-0.5 w-[76px] shrink-0">
                          <p className="text-[13px] font-bold text-brand-900">{c.slot} пара</p>
                          <p className="text-[11px] tabular-nums text-muted">{BELLS[c.slot - 1] ?? ""}</p>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-ink">Группа {group?.code ?? c.groupId}</span>
                            {c.kind === "cancel"
                              ? <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-700">Отменено</span>
                              : <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">Замена</span>}
                          </div>
                          {subject && <p className="mt-0.5 text-sm text-muted">{subject.name}</p>}
                          {c.kind === "substitute" && (
                            <p className="mt-0.5 text-xs text-muted">
                              {origTeacher && teacher && origTeacher.id !== teacher.id && <span>{origTeacher.name} → <span className="font-medium text-ink">{teacher.name}</span></span>}
                              {origTeacher && !teacher && <span>{origTeacher.name}</span>}
                              {c.newRoom && <span className="ml-2">ауд. {c.newRoom}</span>}
                            </p>
                          )}
                          {c.note && <p className="mt-0.5 text-xs italic text-muted">{c.note}</p>}
                        </div>
                        <button onClick={() => remove(c)} className="mt-0.5 shrink-0 text-muted transition hover:text-rose-600" title="Удалить замену">
                          <Icon name="trash" className="size-4" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            );
          })}
        </div>
      )}

      {addOpen && <AddChangeModal weekDates={weekDates} onClose={() => setAddOpen(false)} />}
      {confirm.node}
    </div>
  );
}

function AddChangeModal({ weekDates, onClose }: { weekDates: string[]; onClose: () => void }) {
  const { db } = useStore();
  const [form, setForm] = useState<AddForm>({
    date: weekDates[0],
    groupId: db.groups[0]?.id ?? "",
    slot: "1",
    kind: "cancel",
    newTeacherId: "",
    newRoom: "",
    note: "",
  });
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof AddForm>(k: K, v: AddForm[K]) => setForm((f) => ({ ...f, [k]: v }));

  const chosenWd = weekDates.indexOf(form.date) + 1;
  const groupSlots = db.schedule.filter((s) => s.groupId === form.groupId && s.weekday === chosenWd).sort((a, b) => a.slot - b.slot);

  const save = async () => {
    setSaving(true);
    const payload: Record<string, unknown> = {
      date: form.date,
      groupId: form.groupId,
      slot: Number(form.slot),
      kind: form.kind,
      note: form.note || undefined,
    };
    if (form.kind === "substitute") {
      if (form.newTeacherId) payload.newTeacherId = form.newTeacherId;
      if (form.newRoom) payload.newRoom = form.newRoom;
    }
    const r = await act("schedule.addChange", payload);
    setSaving(false);
    toastResult(r);
    if (r.ok) onClose();
  };

  const slotInSchedule = groupSlots.find((s) => s.slot === Number(form.slot));
  const slotSubject = slotInSchedule ? db.subjects.find((s) => s.id === slotInSchedule.subjectId) : null;
  const slotTeacher = slotInSchedule ? db.teachers.find((t) => t.id === slotInSchedule.teacherId) : null;

  return (
    <Modal open onClose={onClose} title="Добавить замену"
      footer={<>
        <Button variant="outline" onClick={onClose}>Отмена</Button>
        <Button onClick={save} disabled={saving || !form.groupId || !form.slot}>
          {saving ? "Сохранение…" : "Сохранить"}
        </Button>
      </>}>
      <div className="space-y-4">
        <Select label="Дата" value={form.date} onChange={(e) => set("date", e.target.value)}>
          {weekDates.map((d, i) => <option key={d} value={d}>{WEEKDAYS[i]} — {formatLong(d)}</option>)}
        </Select>

        <div className="grid grid-cols-2 gap-3">
          <Select label="Группа" value={form.groupId} onChange={(e) => { set("groupId", e.target.value); set("slot", "1"); }}>
            {db.groups.map((g) => <option key={g.id} value={g.id}>{g.code}</option>)}
          </Select>
          <Select label="Пара" value={form.slot} onChange={(e) => set("slot", e.target.value)}>
            {(groupSlots.length ? groupSlots : Array.from({ length: 7 }, (_, i) => ({ slot: i + 1 }))).map((s) => (
              <option key={s.slot} value={s.slot}>{s.slot} пара · {BELLS[s.slot - 1] ?? ""}</option>
            ))}
          </Select>
        </div>

        {slotSubject && (
          <div className="rounded-lg bg-brand-50 px-4 py-2 text-sm">
            <span className="font-medium">{slotSubject.name}</span>
            {slotTeacher && <span className="ml-2 text-muted">· {slotTeacher.name}</span>}
          </div>
        )}

        <div>
          <p className="mb-2 text-sm font-medium text-ink">Вид изменения</p>
          <div className="flex gap-2">
            <button onClick={() => set("kind", "cancel")}
              className={cx("flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium transition", form.kind === "cancel" ? "border-rose-400 bg-rose-50 text-rose-700" : "border-line text-muted hover:border-brand-300")}>
              Отмена пары
            </button>
            <button onClick={() => set("kind", "substitute")}
              className={cx("flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium transition", form.kind === "substitute" ? "border-amber-400 bg-amber-50 text-amber-700" : "border-line text-muted hover:border-brand-300")}>
              Замена
            </button>
          </div>
        </div>

        {form.kind === "substitute" && (
          <div className="grid grid-cols-2 gap-3">
            <Select label="Новый преподаватель" value={form.newTeacherId} onChange={(e) => set("newTeacherId", e.target.value)}>
              <option value="">— без изменений —</option>
              {db.teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
            <Field label="Аудитория (если изменилась)">
              <input className={inputCls} value={form.newRoom} onChange={(e) => set("newRoom", e.target.value)} placeholder="201" />
            </Field>
          </div>
        )}

        <Field label="Примечание (необязательно)">
          <input className={inputCls} value={form.note} onChange={(e) => set("note", e.target.value)} placeholder="Преподаватель на больничном" />
        </Field>
      </div>
    </Modal>
  );
}

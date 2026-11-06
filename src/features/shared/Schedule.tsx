"use client";
// Расписание. Логика перенесена из проекта расписания колледжа: выбор группы с поиском,
// переключение дней недели, живой статус «идёт пара / перемена / до начала» с обратным отсчётом.
// Данные теперь общие с журналом: одна таблица schedule_slots.
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useStore, act } from "@/lib/store";
import { viewedStudentId } from "@/lib/access";
import { Badge, Button, Card, Empty, Field, PageHeader, Segmented, Select, cx, inputCls } from "@/components/ui";
import { Modal, toastResult, useConfirm } from "@/components/feedback";
import { Icon } from "@/components/icons";
import { TIME_SLOTS, WEEKDAYS, addDays, formatLong, formatShort, startOfWeek, toMinutes, weekday } from "@/lib/dates";
import type { LessonView } from "@/lib/queries";
import { BELLS } from "@/lib/dates";
import type { Snapshot } from "@/lib/db-types";
import type { ScheduleSlot } from "@/lib/types";

const SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

function view(db: Snapshot, s: ScheduleSlot): LessonView {
  return {
    ...s,
    subject: db.subjects.find((x) => x.id === s.subjectId)?.name ?? "",
    teacher: db.teachers.find((x) => x.id === s.teacherId)?.name ?? "",
    group: db.groups.find((x) => x.id === s.groupId)?.code ?? "",
    time: BELLS[s.slot - 1] ?? "",
  };
}

export function Schedule() {
  const { db, session } = useStore();
  const role = session!.role;
  const isTeacher = role === "teacher";
  const isAdmin = role === "college_admin";
  const sid = viewedStudentId(db, session);
  const [mode, setMode] = useState<"group" | "teacher">(isTeacher ? "teacher" : "group");
  const [groupId, setGroupId] = useState(db.students.find((s) => s.id === sid)?.groupId ?? db.groups[0]?.id ?? "");
  const [teacherId, setTeacherId] = useState(isTeacher ? session!.id : db.teachers[0]?.id ?? "");
  const [layout, setLayout] = useState<"day" | "week">("day");
  const [weekOffset, setWeekOffset] = useState(0);
  const now = db.serverToday;
  const todayWd = weekday(now);
  const [day, setDay] = useState(todayWd === 7 ? 1 : todayWd);
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<{ weekday: number; slot: number } | null>(null);

  const week = addDays(startOfWeek(now), weekOffset * 7);
  const lessonsOf = (wd: number): LessonView[] => {
    const date = addDays(week, wd - 1);
    const base = db.schedule
      .filter((s) => s.weekday === wd && (mode === "teacher" ? s.teacherId === teacherId : s.groupId === groupId))
      .sort((a, b) => a.slot - b.slot)
      .map((s) => view(db, s));
    const changes = (db.scheduleChanges ?? []).filter((c) => c.date === date);
    if (!changes.length) return base;
    return base.map((l) => {
      const ch = changes.find((c) => c.groupId === l.groupId && c.slot === l.slot);
      if (!ch) return l;
      if (ch.kind === "cancel") return { ...l, changeKind: "cancel" as const, changeNote: ch.note };
      const newTeacher = ch.newTeacherId ? (db.teachers.find((t) => t.id === ch.newTeacherId)?.name ?? l.teacher) : l.teacher;
      return { ...l, teacher: newTeacher, room: ch.newRoom ?? l.room, changeKind: "substitute" as const, changeNote: ch.note };
    });
  };

  const group = db.groups.find((g) => g.id === groupId);
  const groupOptions = db.groups.filter((g) => g.code.toLowerCase().includes(q.trim().toLowerCase()));
  const canChooseGroup = isAdmin || (!isTeacher && db.groups.length > 1);

  const subtitle = mode === "teacher"
    ? isTeacher ? "Ваши пары во всех группах. Нажмите на занятие, чтобы открыть журнал" : `Преподаватель ${db.teachers.find((t) => t.id === teacherId)?.name ?? ""}`
    : `Группа ${group?.code ?? ""}${group?.isDemo ? " · демо-группа, расписание скопировано у группы того же курса" : ""}`;

  return (
    <div>
      <PageHeader
        title="Расписание"
        subtitle={subtitle}
        action={<Segmented value={layout} onChange={setLayout} options={[{ value: "day", label: "День" }, { value: "week", label: "Неделя" }]} />}
      />

      {(isAdmin || canChooseGroup) && (
        <Card className="mb-5 flex flex-wrap items-end gap-3 p-4">
          {isAdmin && <Segmented value={mode} onChange={setMode} options={[{ value: "group", label: "По группе" }, { value: "teacher", label: "По преподавателю" }]} />}
          {mode === "group" ? (
            <>
              <Field label="Поиск группы" className="w-36"><input className={inputCls} value={q} onChange={(e) => setQ(e.target.value)} placeholder="2П1" /></Field>
              <Select label="Группа" value={groupId} onChange={(e) => setGroupId(e.target.value)} className="w-40">
                {(groupOptions.length ? groupOptions : db.groups).map((g) => <option key={g.id} value={g.id}>{g.code}</option>)}
              </Select>
            </>
          ) : (
            <Select label="Преподаватель" value={teacherId} onChange={(e) => setTeacherId(e.target.value)} className="min-w-64">
              {db.teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          )}
          {isAdmin && mode === "group" && <p className="ml-auto max-w-xs text-xs text-muted">Нажмите на пару, чтобы изменить её. Студенты и преподаватель получат уведомление.</p>}
        </Card>
      )}

      {weekOffset === 0 && todayWd !== 7 && <LiveStatus lessons={lessonsOf(todayWd)} teacherView={mode === "teacher"} />}

      {layout === "day" ? (
        <>
          <div className="mb-4 grid grid-cols-6 gap-1.5 rounded-xl bg-brand-50 p-1.5" role="tablist" aria-label="День недели">
            {SHORT.map((d, i) => {
              const date = addDays(week, i);
              const active = day === i + 1;
              return (
                <button key={d} role="tab" aria-selected={active} onClick={() => setDay(i + 1)}
                  className={cx("relative flex flex-col items-center rounded-xl py-2 text-[13px] font-semibold transition-all duration-200", active ? "bg-white text-brand-900 shadow-sm" : "text-muted hover:text-brand-800")}>
                  {d}
                  <span className={cx("text-[11px] font-medium", active ? "text-gold-600" : "text-muted/80")}>{formatShort(date)}</span>
                  {date === now && <span className="absolute right-2 top-2 size-1.5 rounded-full bg-gold-500" />}
                </button>
              );
            })}
          </div>
          <DayCard key={`${day}-${groupId}-${teacherId}-${mode}`} date={addDays(week, day - 1)} wd={day} lessons={lessonsOf(day)} teacherView={mode === "teacher"} isTeacher={isTeacher} now={now} editable={isAdmin && mode === "group"} onEdit={(slot) => setEdit({ weekday: day, slot })} />
        </>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {WEEKDAYS.map((_, i) => (
            <DayCard key={i} compact date={addDays(week, i)} wd={i + 1} lessons={lessonsOf(i + 1)} teacherView={mode === "teacher"} isTeacher={isTeacher} now={now} editable={isAdmin && mode === "group"} onEdit={(slot) => setEdit({ weekday: i + 1, slot })} />
          ))}
        </div>
      )}

      <div className="mt-5 flex items-center justify-center gap-2">
        <Button variant="outline" className="h-9" onClick={() => setWeekOffset((w) => w - 1)} aria-label="Предыдущая неделя"><Icon name="chevronLeft" className="size-4" /></Button>
        <span className="min-w-48 text-center text-sm text-muted">{weekOffset === 0 ? "Текущая неделя" : `Неделя с ${formatLong(week)}`}</span>
        <Button variant="outline" className="h-9" onClick={() => setWeekOffset((w) => w + 1)} aria-label="Следующая неделя"><Icon name="chevronRight" className="size-4" /></Button>
      </div>

      {isAdmin && edit && <SlotEditor groupId={groupId} weekday={edit.weekday} slot={edit.slot} onClose={() => setEdit(null)} />}
    </div>
  );
}

function DayCard({ date, wd, lessons, teacherView, isTeacher, now, compact, editable, onEdit }: {
  date: string; wd: number; lessons: LessonView[]; teacherView: boolean; isTeacher: boolean; now: string; compact?: boolean; editable: boolean; onEdit: (slot: number) => void;
}) {
  const isToday = date === now;
  const slots = editable ? TIME_SLOTS.map((_, i) => i + 1) : lessons.map((l) => l.slot);
  return (
    <Card className={cx("overflow-hidden", !compact && "animate-enter", isToday && "border-brand-600 ring-1 ring-brand-600")}>
      <div className={cx("flex items-center justify-between border-b px-5 py-3", isToday ? "border-brand-100 bg-brand-50" : "border-line")}>
        <p className="font-semibold text-ink">{WEEKDAYS[wd - 1]}<span className="ml-2 text-xs font-normal text-muted">{formatLong(date)}</span></p>
        {isToday ? <span className="rounded bg-brand-700 px-1.5 py-0.5 text-[11px] font-semibold text-white">Сегодня</span> : <p className="text-xs text-muted">{lessons.length ? `${lessons.length} пар` : ""}</p>}
      </div>
      {slots.length === 0 ? <Empty icon="calendar" title="Пар нет" /> : (
        <ul className="divide-y divide-line">
          {slots.map((n) => {
            const l = lessons.find((x) => x.slot === n);
            const t = TIME_SLOTS[n - 1];
            const journalHref = l && isTeacher && date <= now ? `/journal/?group=${l.groupId}&subject=${l.subjectId}&date=${date}` : null;
            const body = (
              <div className="flex gap-3 px-5 py-3">
                <div className="w-[76px] shrink-0">
                  <p className="text-[13px] font-bold text-brand-900">{n} пара</p>
                  <p className="text-[11px] tabular-nums text-muted">{t.start}–{t.end}</p>
                </div>
                {l ? (
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={cx("text-sm font-medium leading-snug", l.changeKind === "cancel" && "text-muted line-through")}>{l.subject}</p>
                      {l.changeKind === "cancel" && <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-700">Отменено</span>}
                      {l.changeKind === "substitute" && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">Замена</span>}
                    </div>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                      <span>{teacherView ? `Группа ${l.group}` : l.teacher}</span>
                      {l.room && <span className="inline-flex items-center gap-1"><Icon name="home" className="size-3" />{/^\d/.test(l.room) ? `ауд. ${l.room}` : l.room}</span>}
                    </p>
                    {l.changeNote && <p className="mt-0.5 text-xs italic text-muted">{l.changeNote}</p>}
                  </div>
                ) : <p className="self-center text-sm text-muted/70">{editable ? "Свободно · добавить" : "—"}</p>}
                {journalHref && <span className="self-center text-xs font-semibold text-brand-700"><Icon name="journal" className="size-[18px]" /></span>}
                {editable && <Icon name={l ? "edit" : "plus"} className="size-4 self-center text-muted" />}
              </div>
            );
            return (
              <li key={n}>
                {journalHref ? <Link href={journalHref} className="block transition hover:bg-brand-50/60" title="Открыть журнал этого занятия">{body}</Link>
                  : editable ? <button onClick={() => onEdit(n)} className="block w-full text-left transition hover:bg-brand-50/60">{body}</button>
                  : body}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

/** Живой статус дня: как таймер в проекте расписания */
function LiveStatus({ lessons, teacherView }: { lessons: LessonView[]; teacherView: boolean }) {
  const [nowTs, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  type State = { kind: "lesson" | "break" | "before"; l: LessonView; left: number; total: number } | { kind: "done" | "free" };
  const state = useMemo((): State => {
    const d = new Date(nowTs);
    const cur = d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
    for (const l of lessons) {
      const t = TIME_SLOTS[l.slot - 1];
      if (cur >= toMinutes(t.start) && cur < toMinutes(t.end)) return { kind: "lesson", l, left: toMinutes(t.end) - cur, total: toMinutes(t.end) - toMinutes(t.start) };
    }
    const next = lessons.find((l) => toMinutes(TIME_SLOTS[l.slot - 1].start) > cur);
    if (next) {
      const start = toMinutes(TIME_SLOTS[next.slot - 1].start);
      const prev = [...lessons].reverse().find((l) => toMinutes(TIME_SLOTS[l.slot - 1].end) <= cur);
      const from = prev ? toMinutes(TIME_SLOTS[prev.slot - 1].end) : start - 60;
      return { kind: prev ? "break" : "before", l: next, left: start - cur, total: Math.max(start - from, 1) };
    }
    return { kind: lessons.length ? "done" : "free" };
  }, [lessons, nowTs]);

  const fmt = (min: number) => {
    const s = Math.max(0, Math.round(min * 60));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h ? `${h}:` : ""}${String(m).padStart(h ? 2 : 1, "0")}:${String(sec).padStart(2, "0")}`;
  };
  if (!("l" in state)) {
    return (
      <Card className="mb-5 flex items-center gap-3 p-4">
        <span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><Icon name="check" /></span>
        <p className="text-sm font-medium text-brand-900">{state.kind === "done" ? "Занятия на сегодня закончились" : "Сегодня пар нет"}</p>
      </Card>
    );
  }
  const label = state.kind === "lesson" ? "Идёт пара" : state.kind === "break" ? "Перемена" : "До начала занятий";
  const progress = 1 - state.left / state.total;
  return (
    <div className="relative mb-5 overflow-hidden rounded-[var(--radius-card)] bg-brand-900 p-5 text-white shadow-card">
      <div className="relative flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-xs font-semibold text-white/80">
            <span className={cx("size-2 rounded-full", state.kind === "lesson" ? "animate-pulse bg-emerald-400" : "bg-gold-400")} />{label}
          </p>
          <p className="mt-1 truncate text-lg font-semibold">{state.kind === "lesson" ? state.l.subject : `Далее: ${state.l.subject}`}</p>
          <p className="text-sm text-white/60">{state.l.slot} пара · {state.l.time.replace("-", "–")}{state.l.room ? ` · ${state.l.room}` : ""}{teacherView ? ` · ${state.l.group}` : ""}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-white/60">{state.kind === "lesson" ? "до конца" : "до начала"}</p>
          <p className="font-mono text-3xl font-bold tabular-nums text-white">{fmt(state.left)}</p>
        </div>
      </div>
      <div className="relative mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-white transition-[width] duration-1000 ease-linear" style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }} />
      </div>
    </div>
  );
}

/** Редактор пары для учебной части */
function SlotEditor({ groupId, weekday: wd, slot, onClose }: { groupId: string; weekday: number; slot: number; onClose: () => void }) {
  const { db } = useStore();
  const current = db.schedule.find((s) => s.groupId === groupId && s.weekday === wd && s.slot === slot);
  const [subjectId, setSubjectId] = useState(current?.subjectId ?? db.subjects[0]?.id ?? "");
  const [teacherId, setTeacherId] = useState(current?.teacherId ?? "");
  const [room, setRoom] = useState(current?.room ?? "");
  const confirm = useConfirm();
  const suggested = new Set(db.loads.filter((l) => l.subjectId === subjectId).map((l) => l.teacherId));
  const teachers = [...db.teachers].sort((a, b) => Number(suggested.has(b.id)) - Number(suggested.has(a.id)));
  useEffect(() => {
    if (!teacherId && teachers[0]) setTeacherId(teachers[0].id);
  }, [teacherId, teachers]);

  const save = async () => {
    const r = await act("schedule.setSlot", { groupId, weekday: wd, slot, subjectId, teacherId, room });
    toastResult(r);
    if (r.ok) onClose();
  };
  const clear = async () => {
    if (!(await confirm.ask("Убрать пару из расписания?", "Студенты группы и преподаватель получат уведомление об изменении.", { confirm: "Убрать", danger: true }))) return;
    const r = await act("schedule.clearSlot", { groupId, weekday: wd, slot });
    toastResult(r);
    if (r.ok) onClose();
  };
  const g = db.groups.find((x) => x.id === groupId);
  return (
    <Modal open onClose={onClose} title={`${g?.code}, ${WEEKDAYS[wd - 1].toLowerCase()}, ${slot} пара`}
      footer={<>
        {current && <Button variant="ghost" className="mr-auto text-rose-600" onClick={clear}><Icon name="trash" className="size-4" />Убрать</Button>}
        <Button variant="outline" onClick={onClose}>Отмена</Button>
        <Button onClick={save} disabled={!subjectId || !teacherId}>Сохранить</Button>
      </>}>
      <div className="space-y-4">
        <p className="text-sm text-muted">Время: {TIME_SLOTS[slot - 1].start}–{TIME_SLOTS[slot - 1].end}. Сервер проверит, что преподаватель и аудитория свободны.</p>
        <Select label="Предмет" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
          {db.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
        <Select label="Преподаватель" value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
          {teachers.map((t) => <option key={t.id} value={t.id}>{suggested.has(t.id) ? "★ " : ""}{t.name}</option>)}
        </Select>
        <Field label="Аудитория"><input className={inputCls} value={room} onChange={(e) => setRoom(e.target.value)} placeholder="201, спортзал, онлайн" /></Field>
        {current && <Badge tone="gold">Сейчас: {db.subjects.find((s) => s.id === current.subjectId)?.name}</Badge>}
      </div>
      {confirm.node}
    </Modal>
  );
}

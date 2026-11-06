"use client";
// Блоки главных страниц: «сейчас / следующая пара» и лента времени на день
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { TIME_SLOTS, toMinutes } from "@/lib/dates";
import { cx } from "@/components/ui";

export function useNowMinutes() {
  const [m, setM] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => { const d = new Date(); setM(d.getHours() * 60 + d.getMinutes()); };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);
  return m;
}

export type LessonState = "past" | "now" | "future";

export function lessonState(slot: number, isToday: boolean, nowMin: number | null): LessonState {
  if (!isToday || nowMin === null) return "future";
  const t = TIME_SLOTS[slot - 1];
  if (!t) return "future";
  if (nowMin >= toMinutes(t.end)) return "past";
  if (nowMin >= toMinutes(t.start)) return "now";
  return "future";
}

const plural = (n: number, one: string, few: string, many: string) => {
  const m10 = n % 10, m100 = n % 100;
  return m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? few : many;
};

export function inMinutes(min: number) {
  if (min < 60) return `${min} ${plural(min, "минуту", "минуты", "минут")}`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h} ч ${m} мин` : `${h} ${plural(h, "час", "часа", "часов")}`;
}

export interface DayLesson {
  key: string;
  slot: number;
  title: string;
  meta: ReactNode;
  href?: string;
  right?: ReactNode;
  cancelled?: boolean;
  substitute?: boolean;
  note?: string;
}

/** Карточка внутри тёмной панели: что идёт сейчас или что будет следующим */
export function NowCard({ lessons, isToday, nowMin, dayLabel, doneText = "Занятия на сегодня закончились" }: {
  lessons: DayLesson[]; isToday: boolean; nowMin: number | null; dayLabel: string; doneText?: string;
}) {
  const active = lessons.filter((l) => !l.cancelled);
  const cur = active.find((l) => lessonState(l.slot, isToday, nowMin) === "now");
  const next = active.find((l) => lessonState(l.slot, isToday, nowMin) === "future");
  const shown = cur ?? next;
  let label: ReactNode;
  let foot: ReactNode = null;
  if (cur) {
    const t = TIME_SLOTS[cur.slot - 1];
    const total = toMinutes(t.end) - toMinutes(t.start);
    const left = toMinutes(t.end) - (nowMin ?? 0);
    label = <><span className="pulse-dot size-2 rounded-full bg-gold-400" />Сейчас идёт · {cur.slot} пара</>;
    foot = (
      <div className="mt-3">
        <div className="h-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gold-400" style={{ width: `${((total - left) / total) * 100}%` }} /></div>
        <p className="mt-1.5 text-xs text-white/55">До конца пары {inMinutes(left)}, перерыв в {t.end}</p>
      </div>
    );
  } else if (next) {
    const t = TIME_SLOTS[next.slot - 1];
    const wait = isToday && nowMin !== null ? toMinutes(t.start) - nowMin : null;
    label = isToday ? <>Следующая · {next.slot} пара{wait !== null && wait <= 180 ? `, через ${inMinutes(wait)}` : ""}</> : <>Первая пара · {dayLabel}</>;
  } else {
    label = <>Расписание</>;
  }
  return (
    <div className="rounded-xl bg-white/[0.07] p-4 ring-1 ring-inset ring-white/10 backdrop-blur-sm">
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-gold-400">{label}</p>
      {shown ? (
        <>
          <p className="mt-1.5 line-clamp-2 text-[15px] font-semibold leading-snug">{shown.title}</p>
          <p className="mt-1 truncate text-[13px] text-white/60">{TIME_SLOTS[shown.slot - 1]?.start}–{TIME_SLOTS[shown.slot - 1]?.end} · {shown.meta}</p>
          {foot}
        </>
      ) : (
        <>
          <p className="mt-1.5 text-[15px] font-semibold leading-snug">{lessons.length ? doneText : "Занятий нет"}</p>
          <p className="mt-1 text-[13px] text-white/60">{lessons.length ? "Хорошего вечера!" : "Можно отдохнуть или заняться заданиями"}</p>
        </>
      )}
    </div>
  );
}

/** Лента времени: пары дня с текущим моментом */
export function LessonTimeline({ lessons, isToday, nowMin }: { lessons: DayLesson[]; isToday: boolean; nowMin: number | null }) {
  return (
    <ol className="px-3 py-2 sm:px-4">
      {lessons.map((l, i) => {
        const st = lessonState(l.slot, isToday, nowMin);
        const t = TIME_SLOTS[l.slot - 1];
        const body = (
          <div className={cx("flex min-w-0 items-center gap-3 rounded-lg px-3 py-2 transition-colors", st === "now" && !l.cancelled && "bg-gold-50 ring-1 ring-inset ring-gold-100", l.href && "group-hover:bg-subtle")}>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-start gap-2">
                <p className={cx("line-clamp-2 text-[14px] font-medium leading-snug sm:line-clamp-1", l.cancelled ? "text-muted line-through" : st === "past" ? "text-muted" : "text-ink")}>{l.title}</p>
                {st === "now" && !l.cancelled && <span className="mt-px shrink-0 rounded bg-gold-500 px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-brand-950">идёт</span>}
                {l.cancelled && <span className="shrink-0 rounded bg-rose-100 px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-rose-700">отмена</span>}
                {l.substitute && <span className="shrink-0 rounded bg-amber-100 px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-amber-700">замена</span>}
              </div>
              <p className="mt-0.5 truncate text-xs text-muted">{l.meta}{l.note && <span className="italic"> · {l.note}</span>}</p>
            </div>
            {l.right}
          </div>
        );
        return (
          <li key={l.key} className="grid grid-cols-[44px_14px_minmax(0,1fr)] gap-x-2.5">
            <div className="pt-2 text-right tabular-nums">
              <p className={cx("text-[13px] font-semibold leading-4", st === "past" ? "text-muted" : "text-ink")}>{t?.start}</p>
              <p className="text-[11px] leading-4 text-muted">{t?.end}</p>
            </div>
            <div className="relative flex justify-center">
              <span className={cx("absolute w-px bg-line", i === 0 ? "top-3.5" : "top-0", i === lessons.length - 1 ? "h-3.5" : "bottom-0")} />
              <span className={cx("relative mt-2.5 size-2.5 rounded-full ring-[3px] ring-white", st === "now" ? "pulse-dot bg-gold-500" : st === "past" || l.cancelled ? "bg-slate-300" : "bg-brand-600")} />
            </div>
            {l.href ? <Link href={l.href} className="group min-w-0 py-0.5">{body}</Link> : <div className="min-w-0 py-0.5">{body}</div>}
          </li>
        );
      })}
    </ol>
  );
}

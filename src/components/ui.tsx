// Базовые UI-компоненты дизайн-системы портала
"use client";
import { createContext, useContext, type ButtonHTMLAttributes, type CSSProperties, type ReactNode, type SelectHTMLAttributes } from "react";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./icons";
import { NAV } from "@/lib/nav";
import { useStore } from "@/lib/store";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export function Card({ className, children, style, hover }: { className?: string; children: ReactNode; style?: CSSProperties; hover?: boolean }) {
  return (
    <div style={style} className={cx("min-w-0 rounded-[var(--radius-card)] border border-line bg-white shadow-card", hover && "lift", className)}>
      {children}
    </div>
  );
}

const iconTones = {
  brand: "bg-brand-50 text-brand-700",
  gold: "bg-gold-50 text-gold-700",
  green: "bg-emerald-50 text-emerald-700",
  red: "bg-rose-50 text-rose-600",
};

export function CardHeader({ title, action, icon, subtitle, tone = "brand" }: { title: ReactNode; action?: ReactNode; icon?: IconName; subtitle?: ReactNode; tone?: keyof typeof iconTones }) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-3 border-b border-line px-4 py-2.5 sm:px-5">
      <div className="flex min-w-0 items-center gap-2.5">
        {icon && <span className={cx("grid size-7 shrink-0 place-items-center rounded-md", iconTones[tone])}><Icon name={icon} className="size-4" /></span>}
        <div className="min-w-0">
          <h2 className="truncate text-[14px] font-semibold leading-5 text-ink">{title}</h2>
          {subtitle && <p className="truncate text-xs leading-4 text-muted">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

/** Ссылка-действие в шапке карточки */
export function MoreLink({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-0.5 rounded-md py-1 pl-2 pr-1 text-[13px] font-medium text-brand-700 transition-colors hover:bg-brand-50">
      {children}
      <Icon name="chevronRight" className="size-3.5" />
    </span>
  );
}

/** Раздел меню, к которому относится страница (для надзаголовка) */
function useSection(path: string) {
  const { session } = useStore();
  const items = session ? NAV[session.role] : [];
  const i = items.findIndex((it) => it.href !== "/home/" && path.startsWith(it.href));
  if (i < 0) return null;
  for (let j = i; j >= 0; j--) if (items[j].section) return items[j].section!;
  return null;
}

/** Шапка раздела: надзаголовок, заголовок, пояснение и панель действий справа */
export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode; icon?: IconName }) {
  const path = usePathname() ?? "";
  const section = useSection(path);
  return (
    <div className="mb-5 flex flex-col gap-3 sm:mb-6 lg:flex-row lg:items-end lg:justify-between lg:gap-6">
      <div className="min-w-0">
        {section && <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-700">{section}</p>}
        <h1 className="text-[22px] font-semibold leading-tight tracking-tight text-ink sm:text-[26px]">{title}</h1>
        {subtitle && <p className="mt-1 max-w-3xl text-sm text-muted">{subtitle}</p>}
      </div>
      {action && <div className="flex w-full min-w-0 flex-wrap items-end gap-2 lg:w-auto lg:shrink-0 lg:justify-end">{action}</div>}
    </div>
  );
}

const statTones = {
  brand: { icon: "text-brand-600", bar: "bg-brand-600" },
  gold: { icon: "text-gold-600", bar: "bg-gold-500" },
  green: { icon: "text-emerald-600", bar: "bg-emerald-500" },
  red: { icon: "text-rose-600", bar: "bg-rose-500" },
};

const InStatGrid = createContext(false);

/** Полоса показателей: ячейки разделены тонкими линиями внутри одного блока */
export function StatGrid({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <InStatGrid.Provider value={true}>
      <div className={cx("grid gap-px overflow-hidden rounded-[var(--radius-card)] border border-line bg-line shadow-card", className)}>{children}</div>
    </InStatGrid.Provider>
  );
}

const statShell = (inGrid: boolean) => (inGrid ? "bg-white" : "rounded-[var(--radius-card)] border border-line bg-white shadow-card");

/** Компактный показатель для верхней части разделов */
export function MiniStat({ icon, label, value, tone = "brand" }: { icon: IconName; label: string; value: ReactNode; tone?: keyof typeof statTones }) {
  const inGrid = useContext(InStatGrid);
  return (
    <div className={cx("min-w-0 px-4 py-3", statShell(inGrid))}>
      <p className="flex items-center gap-1.5 truncate text-xs text-muted"><Icon name={icon} className={cx("size-3.5 shrink-0", statTones[tone].icon)} />{label}</p>
      <p className="mt-1 text-xl font-semibold leading-tight tabular-nums text-ink">{value}</p>
    </div>
  );
}

type BtnVariant = "gold" | "brand" | "ghost" | "outline" | "danger";
export function Button({ variant = "brand", className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant }) {
  const styles: Record<BtnVariant, string> = {
    gold: "bg-gold-500 text-brand-950 hover:bg-gold-400 active:bg-gold-600",
    brand: "bg-brand-800 text-white hover:bg-brand-700 active:bg-brand-900",
    ghost: "text-brand-800 hover:bg-brand-50 active:bg-brand-100",
    outline: "border border-line bg-white text-ink shadow-card hover:border-slate-300 hover:bg-subtle active:bg-brand-50",
    danger: "bg-danger text-white hover:bg-rose-600 active:bg-rose-700",
  };
  return (
    <button
      className={cx("press inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-control)] px-4 text-sm font-semibold disabled:pointer-events-none disabled:opacity-50", styles[variant], className)}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Select({ label, className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  return (
    <label className={cx("flex min-w-0 flex-col gap-1.5", className)}>
      {label && <span className="text-xs font-medium text-muted">{label}</span>}
      <select className={cx(inputCls, "cursor-pointer pr-8 font-medium")} {...rest}>
        {children}
      </select>
    </label>
  );
}

export function Field({ label, hint, className, children }: { label: string; hint?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <label className={cx("flex min-w-0 flex-col gap-1.5", className)}>
      <span className="text-xs font-medium text-muted">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Badge({ tone = "brand", children, className }: { tone?: "brand" | "gold" | "green" | "red" | "gray" | "sky"; children: ReactNode; className?: string }) {
  const tones = {
    brand: "bg-brand-50 text-brand-700",
    gold: "bg-gold-50 text-gold-700",
    green: "bg-emerald-50 text-emerald-700",
    red: "bg-rose-50 text-rose-700",
    gray: "bg-slate-100 text-slate-600",
    sky: "bg-sky-50 text-sky-700",
  };
  return <span className={cx("inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium", tones[tone], className)}><span className="size-1.5 shrink-0 rounded-full bg-current" />{children}</span>;
}

/** Поле поиска с иконкой */
export function SearchInput({ value, onChange, placeholder = "Поиск", className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <label className={cx("relative block min-w-0", className)}>
      <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cx(inputCls, "pl-9")} />
    </label>
  );
}

export const inputCls =
  "h-10 w-full rounded-[var(--radius-control)] border border-line bg-white px-3 text-sm text-ink outline-none transition-colors placeholder:text-muted/70 hover:border-slate-300 focus:border-brand-600 focus:ring-3 focus:ring-brand-100 disabled:bg-subtle disabled:text-muted";

/** Показатель. В StatGrid становится ячейкой общей полосы. progress (0–100) рисует шкалу */
export function StatCard({ label, value, hint, icon, tone = "brand", progress }: { label: string; value: ReactNode; hint?: ReactNode; icon: IconName; tone?: keyof typeof statTones; progress?: number }) {
  const t = statTones[tone];
  const inGrid = useContext(InStatGrid);
  return (
    <div className={cx("min-w-0 px-4 py-3.5 sm:px-5", statShell(inGrid))}>
      <p className="flex items-center gap-1.5 text-[13px] text-muted">
        <Icon name={icon} className={cx("size-4 shrink-0", t.icon)} />
        <span className="min-w-0 truncate">{label}</span>
      </p>
      <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <p className="whitespace-nowrap text-[24px] font-semibold leading-none tracking-tight text-ink tabular-nums">{value}</p>
        {hint && <p className="min-w-0 max-w-full truncate text-xs text-muted">{hint}</p>}
      </div>
      {progress !== undefined && (
        <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-slate-100">
          <div className={cx("bar-x h-full rounded-full", t.bar)} style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
        </div>
      )}
    </div>
  );
}

export interface HeroMetric { label: string; value: ReactNode; hint?: ReactNode; progress?: number; tone?: "gold" | "green" | "red" | "blue" }
const heroBar = { gold: "bg-gold-400", green: "bg-emerald-400", red: "bg-rose-400", blue: "bg-sky-300" };

/** Тёмная панель дня: приветствие, ключевые цифры и блок «сейчас» справа */
export function Hero({ eyebrow, title, meta, actions, aside, metrics, metricCols = "sm:grid-cols-4" }: {
  eyebrow?: ReactNode; title: ReactNode; meta?: ReactNode; actions?: ReactNode; aside?: ReactNode; metrics?: HeroMetric[]; metricCols?: string;
}) {
  return (
    <section className="hero relative overflow-hidden rounded-[calc(var(--radius-card)+2px)] text-white shadow-[0_8px_24px_-12px_rgb(11_29_61/0.5)]">
      <div className="hero-grid pointer-events-none absolute inset-0" />
      <div className="relative grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)] lg:items-center lg:gap-8">
        <div className="min-w-0">
          {eyebrow && <p className="text-[13px] text-white/60 first-letter:uppercase">{eyebrow}</p>}
          <h1 className="mt-1 text-[24px] font-semibold leading-tight tracking-tight sm:text-[30px]">{title}</h1>
          {meta && <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] text-white/70">{meta}</div>}
          {actions && <div className="mt-4 flex flex-wrap gap-2">{actions}</div>}
        </div>
        {aside && <div className="min-w-0">{aside}</div>}
      </div>
      {metrics && (
        <dl className={cx("relative -ml-px grid grid-cols-2 bg-black/10", metricCols)}>
          {metrics.map((m) => (
            <div key={m.label} className="min-w-0 border-l border-t border-white/10 px-5 py-3 sm:px-6">
              <dt className="truncate text-xs text-white/55">{m.label}</dt>
              <dd className="mt-0.5 flex items-baseline gap-2">
                <span className="text-xl font-semibold tabular-nums sm:text-[22px]">{m.value}</span>
                {m.hint && <span className="min-w-0 truncate text-xs text-white/50">{m.hint}</span>}
              </dd>
              {m.progress !== undefined && (
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                  <div className={cx("bar-x h-full rounded-full", heroBar[m.tone ?? "gold"])} style={{ width: `${Math.max(0, Math.min(100, m.progress))}%` }} />
                </div>
              )}
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

/** Кнопка-ссылка для тёмной панели */
export const heroBtn = (primary?: boolean) =>
  cx("press inline-flex h-9 items-center gap-2 rounded-[var(--radius-control)] px-3.5 text-[13px] font-semibold", primary ? "bg-gold-500 text-brand-950 hover:bg-gold-400" : "bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/15");

/** Кольцевой индикатор (средний балл, посещаемость) */
export function ProgressRing({ value, size = 96, stroke = 9, color = "var(--color-brand-600)", track = "#edf0f4", children }: { value: number; size?: number; stroke?: number; color?: string; track?: string; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const len = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={len} strokeDashoffset={len * (1 - v / 100)}
          className="ring-anim" style={{ ["--ring-len" as string]: len } as CSSProperties}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

/** Горизонтальная шкала со значением */
export function MeterRow({ label, value, max, display, tone }: { label: string; value: number; max: number; display: ReactNode; tone: string }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-3 text-[13px]">
        <span className="truncate text-ink">{label}</span>
        <span className="shrink-0 font-semibold tabular-nums text-ink">{display}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className={cx("bar-x h-full rounded-full", tone)} style={{ width: `${max ? (value / max) * 100 : 0}%` }} />
      </div>
    </div>
  );
}

/** Цвет оценки и среднего балла */
export function gradeTone(v: number | null) {
  if (v === null) return "bg-slate-100 text-slate-400 ring-slate-200";
  if (v >= 4.5) return "bg-blue-500 text-white ring-blue-300";
  if (v >= 3.5) return "bg-emerald-500 text-white ring-emerald-300";
  if (v >= 2.5) return "bg-orange-400 text-white ring-orange-200";
  return "bg-rose-500 text-white ring-rose-300";
}

/** Мягкий цвет среднего балла: в таблицах не должен спорить с самими оценками */
export function avgTone(v: number | null) {
  if (v === null) return "bg-slate-100 text-slate-400 ring-slate-200";
  if (v >= 4.5) return "bg-blue-50 text-blue-700 ring-blue-100";
  if (v >= 3.5) return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (v >= 2.5) return "bg-orange-50 text-orange-700 ring-orange-100";
  return "bg-rose-50 text-rose-700 ring-rose-100";
}

/** Цвет полосы для среднего балла */
export const avgBarTone = (v: number) => (v >= 4.5 ? "bg-blue-500" : v >= 3.5 ? "bg-emerald-500" : v >= 2.5 ? "bg-orange-400" : "bg-rose-500");

export function GradeChip({ value, size = "md", title }: { value: number; size?: "sm" | "md"; title?: string }) {
  return (
    <span title={title} className={cx("inline-grid shrink-0 place-items-center rounded-md font-bold tabular-nums shadow-[inset_0_-2px_0_rgb(0_0_0/0.12)]", gradeTone(value), size === "sm" ? "size-7 text-[13px]" : "size-9 text-base")}>
      {value}
    </span>
  );
}

export function AvgBadge({ value, className }: { value: number | null; className?: string }) {
  return (
    <span className={cx("inline-flex h-7 min-w-12 items-center justify-center rounded-md px-2 text-[13px] font-semibold tabular-nums ring-1 ring-inset", avgTone(value), className)}>
      {value === null ? "-" : value.toFixed(2).replace(".", ",")}
    </span>
  );
}

export function Avatar({ name, photo, className, dark }: { name: string; photo?: string; className?: string; dark?: boolean }) {
  if (photo) return <img src={photo} alt={name} className={cx("size-10 shrink-0 rounded-full object-cover", className)} />;
  const parts = name.replace("Родитель: ", "").split(" ");
  const initials = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
  return (
    <span className={cx("grid size-10 shrink-0 place-items-center rounded-full text-sm font-semibold", dark ? "bg-white/10 text-white ring-1 ring-white/15" : "bg-brand-100 text-brand-800", className)}>{initials}</span>
  );
}

export function Empty({ icon = "book", title, text }: { icon?: IconName; title: string; text?: string }) {
  return (
    <div className="flex flex-col items-center px-6 py-8 text-center">
      <span className="grid size-10 place-items-center rounded-full border border-dashed border-slate-300 text-slate-400">
        <Icon name={icon} className="size-[18px]" />
      </span>
      <p className="mt-2.5 text-sm font-semibold text-ink">{title}</p>
      {text && <p className="mt-0.5 max-w-sm text-[13px] text-muted">{text}</p>}
    </div>
  );
}

export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="inline-flex max-w-full overflow-x-auto rounded-[var(--radius-control)] bg-slate-200/70 p-0.5 [scrollbar-width:none]">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={cx("h-9 whitespace-nowrap rounded-md px-3 text-[13px] font-medium transition-colors duration-150", value === o.value ? "bg-white text-ink shadow-[0_1px_2px_rgb(17_26_46/0.12)]" : "text-muted hover:text-ink")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

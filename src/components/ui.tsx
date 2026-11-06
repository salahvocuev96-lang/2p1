// Базовые UI-компоненты дизайн-системы портала
"use client";
import type { ButtonHTMLAttributes, CSSProperties, ReactNode, SelectHTMLAttributes } from "react";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./icons";
import { NAV } from "@/lib/nav";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export function Card({ className, children, style, hover }: { className?: string; children: ReactNode; style?: CSSProperties; hover?: boolean }) {
  return (
    <div style={style} className={cx("min-w-0 rounded-[var(--radius-card)] border border-line bg-white shadow-card", hover && "lift", className)}>
      {children}
    </div>
  );
}

const iconTones = {
  brand: "text-brand-700",
  gold: "text-gold-600",
  green: "text-emerald-600",
  red: "text-rose-600",
};

export function CardHeader({ title, action, icon, subtitle, tone = "brand" }: { title: ReactNode; action?: ReactNode; icon?: IconName; subtitle?: ReactNode; tone?: keyof typeof iconTones }) {
  return (
    <div className="flex min-h-[52px] items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
      <div className="flex min-w-0 items-center gap-2.5">
        {icon && <Icon name={icon} className={cx("size-[18px] shrink-0", iconTones[tone])} />}
        <div className="min-w-0">
          <h2 className="truncate text-[15px] font-semibold text-ink">{title}</h2>
          {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

/** Ссылка-действие в шапке карточки */
export function MoreLink({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-0.5 rounded-md px-2 py-1 text-[13px] font-medium text-brand-700 transition-colors hover:bg-brand-50">
      {children}
      <Icon name="chevronRight" className="size-3.5" />
    </span>
  );
}

function pageNav(path: string) {
  for (const items of Object.values(NAV)) for (const it of items) if (path.startsWith(it.href) && it.href !== "/home/") return it;
  return null;
}

/** Шапка раздела: заголовок, пояснение и панель действий справа */
export function PageHeader({ title, subtitle, action, icon }: { title: string; subtitle?: ReactNode; action?: ReactNode; icon?: IconName }) {
  const path = usePathname() ?? "";
  const ic = icon ?? pageNav(path)?.icon ?? "home";
  return (
    <div className="mb-5 flex flex-col gap-4 border-b border-line pb-5 sm:mb-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-line bg-white text-brand-700 shadow-card">
          <Icon name={ic} className="size-5" />
        </span>
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="flex w-full min-w-0 flex-wrap items-end gap-2 lg:w-auto lg:justify-end">{action}</div>}
    </div>
  );
}

const statTones = {
  brand: { icon: "bg-brand-50 text-brand-700", bar: "bg-brand-600" },
  gold: { icon: "bg-gold-50 text-gold-700", bar: "bg-gold-500" },
  green: { icon: "bg-emerald-50 text-emerald-700", bar: "bg-emerald-500" },
  red: { icon: "bg-rose-50 text-rose-600", bar: "bg-rose-500" },
};

/** Компактный показатель для верхних частей разделов */
export function MiniStat({ icon, label, value, tone = "brand" }: { icon: IconName; label: string; value: ReactNode; tone?: keyof typeof statTones }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-[var(--radius-card)] border border-line bg-white p-3 shadow-card sm:p-4">
      <span className={cx("grid size-9 shrink-0 place-items-center rounded-lg", statTones[tone].icon)}><Icon name={icon} className="size-[18px]" /></span>
      <div className="min-w-0">
        <p className="text-xl font-bold leading-none tabular-nums text-ink">{value}</p>
        <p className="mt-1 truncate text-xs text-muted">{label}</p>
      </div>
    </div>
  );
}

type BtnVariant = "gold" | "brand" | "ghost" | "outline" | "danger";
export function Button({ variant = "brand", className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant }) {
  const styles: Record<BtnVariant, string> = {
    gold: "bg-gold-500 text-brand-950 hover:bg-gold-400 active:bg-gold-600",
    brand: "bg-brand-800 text-white hover:bg-brand-700 active:bg-brand-900",
    ghost: "text-brand-800 hover:bg-brand-50 active:bg-brand-100",
    outline: "border border-line bg-white text-ink shadow-card hover:border-brand-200 hover:bg-subtle active:bg-brand-50",
    danger: "bg-danger text-white hover:bg-rose-600 active:bg-rose-700",
  };
  return (
    <button
      className={cx("inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-control)] px-4 text-sm font-semibold transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50", styles[variant], className)}
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

/** Карточка показателя. progress (0–100) рисует шкалу внизу */
export function StatCard({ label, value, hint, icon, tone = "brand", progress }: { label: string; value: ReactNode; hint?: ReactNode; icon: IconName; tone?: keyof typeof statTones; progress?: number }) {
  const t = statTones[tone];
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 hyphens-auto text-[13px] font-medium leading-tight text-muted">{label}</p>
        <span className={cx("grid size-8 shrink-0 place-items-center rounded-lg", t.icon)}>
          <Icon name={icon} className="size-4" />
        </span>
      </div>
      <p className="mt-2 text-[28px] font-bold leading-none tracking-tight text-ink tabular-nums">{value}</p>
      {progress !== undefined && (
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-slate-100">
          <div className={cx("bar-x h-full rounded-full", t.bar)} style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
        </div>
      )}
      {hint && <p className="mt-2 truncate text-xs text-muted">{hint}</p>}
    </Card>
  );
}

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

/** Цвет полосы для среднего балла */
export const avgBarTone = (v: number) => (v >= 4.5 ? "bg-blue-500" : v >= 3.5 ? "bg-emerald-500" : v >= 2.5 ? "bg-orange-400" : "bg-rose-500");

export function GradeChip({ value, size = "md", title }: { value: number; size?: "sm" | "md"; title?: string }) {
  return (
    <span title={title} className={cx("inline-grid place-items-center rounded-md font-bold tabular-nums ring-1", gradeTone(value), size === "sm" ? "size-7 text-[13px]" : "size-9 text-base")}>
      {value}
    </span>
  );
}

export function AvgBadge({ value, className }: { value: number | null; className?: string }) {
  return (
    <span className={cx("inline-flex h-7 min-w-12 items-center justify-center rounded-md px-2 text-[13px] font-semibold tabular-nums ring-1 ring-transparent", gradeTone(value), className)}>
      {value === null ? "-" : value.toFixed(2).replace(".", ",")}
    </span>
  );
}

export function Avatar({ name, photo, className }: { name: string; photo?: string; className?: string }) {
  if (photo) return <img src={photo} alt={name} className={cx("size-10 shrink-0 rounded-full object-cover", className)} />;
  const parts = name.replace("Родитель: ", "").split(" ");
  const initials = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
  return (
    <span className={cx("grid size-10 shrink-0 place-items-center rounded-full bg-brand-100 text-sm font-semibold text-brand-800", className)}>{initials}</span>
  );
}

export function Empty({ icon = "book", title, text }: { icon?: IconName; title: string; text?: string }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <span className="grid size-11 place-items-center rounded-full bg-slate-100 text-slate-500">
        <Icon name={icon} className="size-5" />
      </span>
      <p className="mt-3 text-sm font-semibold text-ink">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-muted">{text}</p>}
    </div>
  );
}

export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="inline-flex max-w-full overflow-x-auto rounded-[var(--radius-control)] bg-slate-100 p-0.5 [scrollbar-width:none]">
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

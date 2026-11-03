// Базовые UI-компоненты дизайн-системы портала
"use client";
import type { ButtonHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { Icon, type IconName } from "./icons";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx("rounded-2xl border border-line bg-white shadow-card", className)}>{children}</div>;
}

/** Фирменный синий блок-приветствие с золотым кольцом как на гербе */
export function HeroCard({ children }: { children: ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-brand-900 p-6 text-white shadow-card md:p-8">
      <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full border-[28px] border-gold-500/15" />
      <div className="relative">{children}</div>
    </div>
  );
}

export function CardHeader({ title, action, icon }: { title: ReactNode; action?: ReactNode; icon?: IconName }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
      <h2 className="flex items-center gap-2 text-[15px] font-semibold text-brand-900">
        {icon && <Icon name={icon} className="size-[18px] text-gold-600" />}
        {title}
      </h2>
      {action}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-brand-900 md:text-[28px]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

type BtnVariant = "gold" | "brand" | "ghost" | "outline";
export function Button({ variant = "brand", className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant }) {
  const styles: Record<BtnVariant, string> = {
    gold: "bg-gold-500 text-brand-950 hover:bg-gold-400 shadow-sm",
    brand: "bg-brand-800 text-white hover:bg-brand-700",
    ghost: "text-brand-800 hover:bg-brand-50",
    outline: "border border-line bg-white text-brand-900 hover:border-brand-700/40 hover:bg-brand-50",
  };
  return (
    <button
      className={cx("inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 text-sm font-semibold transition disabled:opacity-50", styles[variant], className)}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Select({ label, className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  return (
    <label className={cx("flex min-w-0 flex-col gap-1.5", className)}>
      {label && <span className="text-xs font-medium uppercase tracking-wide text-muted">{label}</span>}
      <select
        className="h-10 w-full min-w-0 rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-brand-700 focus:ring-2 focus:ring-brand-100"
        {...rest}
      >
        {children}
      </select>
    </label>
  );
}

export const inputCls =
  "h-10 w-full rounded-xl border border-line bg-white px-3 text-sm outline-none transition focus:border-brand-700 focus:ring-2 focus:ring-brand-100";

export function StatCard({ label, value, hint, icon, tone = "brand" }: { label: string; value: ReactNode; hint?: ReactNode; icon: IconName; tone?: "brand" | "gold" | "green" | "red" }) {
  const tones = {
    brand: "bg-brand-50 text-brand-700",
    gold: "bg-gold-50 text-gold-600",
    green: "bg-emerald-50 text-emerald-600",
    red: "bg-rose-50 text-rose-600",
  };
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-muted">{label}</p>
          <p className="mt-1.5 text-2xl font-bold sm:text-[28px] leading-none tracking-tight text-brand-900">{value}</p>
          {hint && <p className="mt-2 text-xs text-muted">{hint}</p>}
        </div>
        <span className={cx("hidden size-10 shrink-0 place-items-center rounded-xl sm:grid", tones[tone])}>
          <Icon name={icon} />
        </span>
      </div>
    </Card>
  );
}

/** Цвет оценки и среднего балла */
export function gradeTone(v: number | null) {
  if (v === null) return "bg-slate-100 text-slate-400";
  if (v >= 4.5) return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (v >= 3.5) return "bg-brand-50 text-brand-700 ring-brand-100";
  if (v >= 2.5) return "bg-gold-50 text-gold-600 ring-gold-100";
  return "bg-rose-50 text-rose-600 ring-rose-200";
}

export function GradeChip({ value, size = "md", title }: { value: number; size?: "sm" | "md"; title?: string }) {
  return (
    <span title={title} className={cx("inline-grid place-items-center rounded-lg font-bold ring-1", gradeTone(value), size === "sm" ? "size-7 text-[13px]" : "size-9 text-base")}>
      {value}
    </span>
  );
}

export function AvgBadge({ value, className }: { value: number | null; className?: string }) {
  return (
    <span className={cx("inline-flex h-7 min-w-12 items-center justify-center rounded-lg px-2 text-[13px] font-bold tabular-nums ring-1 ring-transparent", gradeTone(value), className)}>
      {value === null ? "-" : value.toFixed(2).replace(".", ",")}
    </span>
  );
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  const parts = name.replace("Родитель: ", "").split(" ");
  const initials = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
  return (
    <span className={cx("grid size-10 shrink-0 place-items-center rounded-full bg-brand-100 text-sm font-semibold text-brand-800", className)}>{initials}</span>
  );
}

export function Empty({ icon = "book", title, text }: { icon?: IconName; title: string; text?: string }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-700">
        <Icon name={icon} />
      </span>
      <p className="mt-3 font-semibold text-brand-900">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-muted">{text}</p>}
    </div>
  );
}

export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="inline-flex rounded-xl bg-brand-50 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cx("h-8 whitespace-nowrap rounded-lg px-3 text-[13px] font-semibold transition", value === o.value ? "bg-white text-brand-900 shadow-sm" : "text-muted hover:text-brand-800")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

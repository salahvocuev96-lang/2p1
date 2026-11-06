"use client";
// Обратная связь интерфейса: уведомления-тосты, модальные окна, подтверждения, skeleton-заглушки
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./icons";
import { Button, cx } from "./ui";

// ---------- Тосты ----------

type ToastItem = { id: number; msg: string; tone: "ok" | "err" };
let toasts: ToastItem[] = [];
let tid = 0;
const subs = new Set<() => void>();
const emit = () => subs.forEach((s) => s());

export function toast(msg: string, tone: "ok" | "err" = "ok") {
  const id = ++tid;
  toasts = [...toasts.slice(-2), { id, msg, tone }];
  emit();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  }, tone === "err" ? 5000 : 2800);
}

/** Показать результат серверного действия */
export function toastResult(r: { ok: boolean; info?: string; error?: string }, okText = "Сохранено") {
  if (r.ok) toast(r.info ?? okText);
  else toast(r.error ?? "Ошибка", "err");
}

export function Toaster() {
  const list = useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    () => toasts,
    () => toasts,
  );
  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-24 left-1/2 z-[70] flex w-[min(92vw,420px)] -translate-x-1/2 flex-col gap-2 lg:bottom-8">
      {list.map((t) => (
        <div
          key={t.id}
          role="status"
          className={cx(
            "pointer-events-auto relative left-1/2 flex animate-toast items-start gap-2.5 rounded-xl px-4 py-3 text-sm font-medium whitespace-pre-line text-white shadow-[var(--shadow-pop)]",
            t.tone === "ok" ? "bg-nav ring-1 ring-white/10" : "bg-rose-600",
          )}
        >
          <Icon name={t.tone === "ok" ? "check" : "alert"} className={cx("mt-px size-[18px] shrink-0", t.tone === "ok" ? "text-emerald-400" : "text-white")} />
          {t.msg}
        </div>
      ))}
    </div>
  );
}

// ---------- Модальное окно ----------

export function Modal({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    ref.current?.querySelector<HTMLElement>("input, select, textarea, button")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      prev?.focus();
    };
  }, [open, onClose]);
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[60] flex animate-fade items-end justify-center bg-[#0b1d3d]/45 backdrop-blur-[2px] sm:items-center sm:p-6" onMouseDown={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
        className={cx(
          "safe-bottom flex max-h-[92dvh] w-full animate-sheet flex-col overflow-hidden rounded-t-2xl bg-white shadow-[var(--shadow-pop)] sm:animate-pop sm:rounded-2xl",
          wide ? "sm:max-w-3xl" : "sm:max-w-lg",
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <h2 className="text-[16px] font-semibold text-ink">{title}</h2>
          <button onClick={onClose} aria-label="Закрыть" className="grid size-8 place-items-center rounded-md text-muted transition-colors hover:bg-subtle hover:text-ink">
            <Icon name="close" className="size-[18px]" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-subtle px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/** Подтверждение важного действия */
export function useConfirm() {
  const [state, setState] = useState<{ title: string; text: ReactNode; confirm: string; danger?: boolean; resolve: (v: boolean) => void } | null>(null);
  const ask = (title: string, text: ReactNode, opts: { confirm?: string; danger?: boolean } = {}) =>
    new Promise<boolean>((resolve) => setState({ title, text, confirm: opts.confirm ?? "Подтвердить", danger: opts.danger, resolve }));
  const close = (v: boolean) => {
    state?.resolve(v);
    setState(null);
  };
  const node = (
    <Modal
      open={!!state}
      onClose={() => close(false)}
      title={state?.title ?? ""}
      footer={
        <>
          <Button variant="outline" onClick={() => close(false)}>Отмена</Button>
          <Button variant={state?.danger ? "danger" : "brand"} onClick={() => close(true)}>{state?.confirm}</Button>
        </>
      }
    >
      <div className="text-sm text-ink">{state?.text}</div>
    </Modal>
  );
  return { ask, node };
}

// ---------- Skeleton ----------

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("skeleton", className)} aria-hidden />;
}

export function PageSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Загрузка">
      <Skeleton className="h-[220px] rounded-[14px] sm:h-[200px]" />
      <div className="grid gap-5 lg:grid-cols-12">
        <Skeleton className="h-80 rounded-xl lg:col-span-5" />
        <Skeleton className="h-80 rounded-xl lg:col-span-4" />
        <Skeleton className="hidden h-80 rounded-xl lg:col-span-3 lg:block" />
      </div>
    </div>
  );
}

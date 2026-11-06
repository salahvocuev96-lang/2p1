"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { loadSession, logout, markNotificationsRead, useStore } from "@/lib/store";
import { NAV, ROLE_LABEL, type NavItem } from "@/lib/nav";
import { formatTime, formatWithWeekday } from "@/lib/dates";
import { Icon } from "./icons";
import { Avatar, cx } from "./ui";
import { Crest } from "./Crest";
import { PageSkeleton, Toaster } from "./feedback";

function useOutside<T extends HTMLElement>(onOut: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && onOut();
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [onOut]);
  return ref;
}

/** Группы меню: заголовок раздела и его пункты */
function sections(items: NavItem[]) {
  const out: { title?: string; items: NavItem[] }[] = [];
  for (const it of items) {
    if (it.section || !out.length) out.push({ title: it.section, items: [] });
    out[out.length - 1].items.push(it);
  }
  return out;
}

export function AppShell({ children }: { children: ReactNode }) {
  const { session, status, db } = useStore();
  const router = useRouter();
  const path = usePathname();
  const [more, setMore] = useState(false);

  useEffect(() => {
    if (status === "idle") loadSession();
  }, [status]);
  useEffect(() => {
    if (status !== "ready") return;
    if (!session) router.replace("/");
    else if (session.mustChangePassword) router.replace("/change-password/");
  }, [session, status, router]);
  useEffect(() => {
    setMore(false);
  }, [path]);

  if (status !== "ready" || !session || session.mustChangePassword)
    return (
      <div className="min-h-dvh lg:pl-[264px]">
        <aside className="fixed inset-y-0 left-0 hidden w-[264px] bg-nav lg:block" />
        <main className="mx-auto max-w-[1400px] px-4 pt-20 md:px-6 xl:px-8"><PageSkeleton /></main>
      </div>
    );
  const items = NAV[session.role];
  const isActive = (href: string) => path === href || path === href.slice(0, -1) || path.startsWith(href);
  const current = items.find((it) => isActive(it.href));
  const currentSection = current && [...items.slice(0, items.indexOf(current) + 1)].reverse().find((it) => it.section)?.section;
  const onLogout = async () => {
    await logout();
    router.replace("/");
  };
  const pinned = items.filter((it) => it.pin).slice(0, 4);
  const rest = items.filter((it) => !pinned.includes(it));

  return (
    <div className="min-h-dvh lg:pl-[264px]">
      {/* Боковое меню для компьютера */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] flex-col bg-nav text-white lg:flex">
        <Link href="/home/" className="flex h-[68px] items-center gap-3 px-5">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-white p-1 shadow-sm"><Crest className="size-8" /></span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[14px] font-semibold">Налоговый колледж</p>
            <p className="mt-0.5 text-[11px] font-medium text-gold-400">Электронный дневник</p>
          </div>
        </Link>
        <nav className="flex-1 overflow-y-auto px-3 pb-3 pt-1 [scrollbar-color:rgb(255_255_255/0.15)_transparent] [scrollbar-width:thin]" aria-label="Основное меню">
          {sections(items).map((sec, i) => (
            <div key={i} className={cx(i > 0 && "mt-5")}>
              {sec.title && <p className="mb-1.5 px-3 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-white/35">{sec.title}</p>}
              <ul className="space-y-0.5">
                {sec.items.map((it) => {
                  const active = isActive(it.href);
                  return (
                    <li key={it.href}>
                      <Link
                        href={it.href}
                        aria-current={active ? "page" : undefined}
                        className={cx(
                          "relative flex h-9 items-center gap-3 rounded-lg px-3 text-[13.5px] transition-colors duration-150",
                          active ? "bg-white/[0.09] font-medium text-white" : "text-white/65 hover:bg-white/[0.05] hover:text-white",
                        )}
                      >
                        {active && <span className="absolute inset-y-2 -left-3 w-[3px] rounded-r bg-gold-400" />}
                        <Icon name={it.icon} className={cx("size-[18px] shrink-0", active ? "text-gold-400" : "text-white/40")} />
                        <span className="flex-1 truncate">{it.label}</span>
                        <NavCounter href={it.href} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-1.5">
            <Avatar name={session.name} photo={session.photo} dark className="size-9 text-[13px]" />
            <Link href="/profile/" className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-white">{session.name}</p>
              <p className="truncate text-xs text-white/50">{ROLE_LABEL[session.role]}</p>
            </Link>
            <button onClick={onLogout} title="Выйти" aria-label="Выйти" className="grid size-8 place-items-center rounded-md text-white/45 transition-colors hover:bg-white/10 hover:text-white">
              <Icon name="logout" className="size-[18px]" />
            </button>
          </div>
        </div>
      </aside>

      {/* Верхняя панель */}
      <header className="sticky top-0 z-20 border-b border-line bg-white/85 backdrop-blur-md supports-[backdrop-filter]:bg-white/75">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-3 px-4 md:px-6 xl:px-8">
          <Link href="/home/" className="flex min-w-0 items-center gap-2.5 lg:hidden">
            <Crest className="size-8" />
            <span className="truncate text-[16px] font-semibold text-ink">{current?.label ?? "Налоговый колледж"}</span>
          </Link>
          <nav aria-label="Вы здесь" className="hidden min-w-0 items-center gap-1.5 text-sm lg:flex">
            <span className="text-muted">{ROLE_LABEL[session.role]}</span>
            {currentSection && <><Icon name="chevronRight" className="size-3.5 text-slate-300" /><span className="text-muted">{currentSection}</span></>}
            {current && <><Icon name="chevronRight" className="size-3.5 text-slate-300" /><span className="truncate font-medium text-ink">{current.label}</span></>}
          </nav>
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            {db.serverToday && <span className="mr-1 hidden items-center gap-2 rounded-md border border-line bg-white px-2.5 py-1 text-[13px] text-muted md:inline-flex"><Icon name="calendar" className="size-3.5 text-brand-600" /><span className="first-letter:uppercase">{formatWithWeekday(db.serverToday)}</span></span>}
            <Bell />
            <UserMenu name={session.name} photo={session.photo} role={ROLE_LABEL[session.role]} onLogout={onLogout} />
          </div>
        </div>
      </header>

      <main key={path} className="mx-auto max-w-[1400px] animate-enter px-4 pb-28 pt-4 md:px-6 md:pt-6 xl:px-8 lg:pb-12">{children}</main>
      <Toaster />

      {/* Нижнее меню для телефона и планшета */}
      <nav aria-label="Быстрое меню" className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/90 backdrop-blur-md lg:hidden">
        <div className="mx-auto grid max-w-xl grid-cols-5 px-1">
          {pinned.map((it) => {
            const active = isActive(it.href);
            return (
              <Link key={it.href} href={it.href} aria-current={active ? "page" : undefined} className={cx("press flex min-h-[60px] flex-col items-center justify-center gap-0.5 text-[11px]", active ? "font-semibold text-brand-800" : "text-muted")}>
                <span className={cx("relative grid h-7 w-12 place-items-center rounded-full transition-colors", active && "bg-brand-100")}>
                  <Icon name={it.icon} className={cx("size-[21px]", active ? "text-brand-800" : "text-slate-400")} />
                  <span className="absolute -right-0.5 -top-1"><NavCounter href={it.href} compact /></span>
                </span>
                <span className="max-w-full truncate px-1">{it.short}</span>
              </Link>
            );
          })}
          <button onClick={() => setMore((v) => !v)} aria-expanded={more} className={cx("press flex min-h-[60px] flex-col items-center justify-center gap-0.5 text-[11px]", more ? "font-semibold text-brand-800" : "text-muted")}>
            <span className={cx("grid h-7 w-12 place-items-center rounded-full transition-colors", more && "bg-brand-100")}>
              <Icon name="menu" className={cx("size-[21px]", more ? "text-brand-800" : "text-slate-400")} />
            </span>
            <span>Ещё</span>
          </button>
        </div>
      </nav>
      {more && (
        <div className="fixed inset-0 z-20 animate-fade bg-slate-900/40 lg:hidden" onClick={() => setMore(false)}>
          <div className="safe-bottom absolute inset-x-0 bottom-[60px] max-h-[75dvh] animate-sheet overflow-y-auto rounded-t-2xl bg-white pb-2 shadow-[var(--shadow-pop)]" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-1 mt-2 h-1 w-10 rounded-full bg-slate-200" />
            <div className="flex items-center gap-3 border-b border-line px-4 py-3">
              <Avatar name={session.name} photo={session.photo} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{session.name}</p>
                <p className="text-xs text-muted">{ROLE_LABEL[session.role]}</p>
              </div>
            </div>
            <ul className="py-1">
              {rest.map((it) => (
                <li key={it.href}>
                  <Link href={it.href} className={cx("flex h-12 items-center gap-3 px-4 text-[15px]", isActive(it.href) ? "bg-brand-50 font-semibold text-brand-800" : "text-ink active:bg-subtle")}>
                    <Icon name={it.icon} className="size-5 text-slate-400" />
                    <span className="flex-1">{it.label}</span>
                    <NavCounter href={it.href} />
                  </Link>
                </li>
              ))}
              <li className="mt-1 border-t border-line pt-1">
                <button onClick={onLogout} className="flex h-12 w-full items-center gap-3 px-4 text-[15px] text-rose-600 active:bg-rose-50">
                  <Icon name="logout" className="size-5" />
                  Выйти
                </button>
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function UserMenu({ name, photo, role, onLogout }: { name: string; photo?: string; role: string; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useOutside<HTMLDivElement>(() => setOpen(false));
  return (
    <div className="relative hidden lg:block" ref={ref}>
      <button onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label="Меню пользователя" className="flex items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-2 transition-colors hover:bg-subtle">
        <Avatar name={name} photo={photo} className="size-8 text-xs" />
        <Icon name="chevronRight" className={cx("size-3.5 text-muted transition-transform", open ? "-rotate-90" : "rotate-90")} />
      </button>
      {open && (
        <div className="absolute right-0 top-12 w-64 origin-top-right animate-pop overflow-hidden rounded-xl border border-line bg-white shadow-[var(--shadow-pop)]">
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-sm font-semibold text-ink">{name}</p>
            <p className="text-xs text-muted">{role}</p>
          </div>
          <div className="py-1 text-sm">
            <Link href="/profile/" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-ink hover:bg-subtle"><Icon name="user" className="size-4 text-slate-400" />Профиль</Link>
            <Link href="/change-password/" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-ink hover:bg-subtle"><Icon name="key" className="size-4 text-slate-400" />Сменить пароль</Link>
            <button onClick={onLogout} className="flex w-full items-center gap-2.5 border-t border-line px-4 py-2 text-rose-600 hover:bg-rose-50"><Icon name="logout" className="size-4" />Выйти</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Bell() {
  const { db, session } = useStore();
  const [open, setOpen] = useState(false);
  const ref = useOutside<HTMLDivElement>(() => setOpen(false));
  if (!session) return null;
  const list = db.notifications.filter((n) => n.userId === session.id).sort((a, b) => b.at - a.at);
  const unread = list.filter((n) => !n.read).length;

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)} aria-expanded={open} className={cx("press relative grid size-10 place-items-center rounded-full transition-colors hover:bg-subtle", open ? "bg-subtle text-brand-800" : "text-slate-500")} aria-label={unread ? `Уведомления, непрочитанных: ${unread}` : "Уведомления"}>
        <Icon name="bell" className="size-5" />
        {unread > 0 && <span className="absolute right-1 top-1 grid min-w-[18px] place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-[18px] text-white ring-2 ring-white">{unread > 99 ? "99+" : unread}</span>}
      </button>
      {open && (
        <div className="fixed inset-x-3 top-16 origin-top-right animate-pop overflow-hidden rounded-xl border border-line bg-white shadow-[var(--shadow-pop)] sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-[380px]">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-semibold text-ink">Уведомления</p>
            {unread > 0 && <button onClick={() => markNotificationsRead()} className="text-xs font-semibold text-brand-700 hover:underline">Прочитать все</button>}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {list.length === 0 && <p className="px-4 py-8 text-center text-sm text-muted">Новых уведомлений нет</p>}
            {list.slice(0, 8).map((n) => (
              <Link key={n.id} href={n.href} onClick={() => { setOpen(false); if (!n.read) markNotificationsRead(n.id); }} className={cx("flex gap-3 border-b border-line px-4 py-3 last:border-0 hover:bg-subtle", !n.read && "bg-brand-50/50")}>
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-md bg-slate-100 text-slate-600"><Icon name={KIND_ICON[n.kind]} className="size-4" /></span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-[13px] font-semibold text-ink"><span className="truncate">{n.title}</span>{!n.read && <span className="size-1.5 shrink-0 rounded-full bg-brand-600" />}</span>
                  <span className="block truncate text-[13px] text-muted">{n.text}</span>
                  <span className="text-[11px] text-muted/80">{formatTime(n.at)}</span>
                </span>
              </Link>
            ))}
          </div>
          <Link href="/notifications/" onClick={() => setOpen(false)} className="block border-t border-line px-4 py-2.5 text-center text-[13px] font-semibold text-brand-700 hover:bg-subtle">Все уведомления</Link>
        </div>
      )}
    </div>
  );
}

export const KIND_ICON = { grade: "star", grade_change: "edit", message: "chat", homework: "task", attendance: "check", schedule: "calendar", announcement: "megaphone" } as const;

/** Счётчик непрочитанного рядом с пунктом меню */
function NavCounter({ href, compact }: { href: string; compact?: boolean }) {
  const { db, session } = useStore();
  if (!session) return null;
  let n = 0;
  if (href === "/messages/") n = db.messages.filter((m) => m.to === session.id && !m.read).length;
  if (href === "/notifications/") n = db.notifications.filter((x) => x.userId === session.id && !x.read).length;
  if (!n) return null;
  return <span className={cx("grid min-w-5 place-items-center rounded-full bg-rose-500 px-1.5 font-bold text-white", compact ? "text-[10px] leading-4 ring-2 ring-white" : "text-[11px] leading-5")}>{n > 99 ? "99+" : n}</span>;
}

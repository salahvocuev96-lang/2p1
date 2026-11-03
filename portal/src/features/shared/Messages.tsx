"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { markThreadRead, sendMessage, useStore } from "@/lib/store";
import { contactsFor, nameOf } from "@/lib/access";
import { Avatar, Button, Card, Empty, PageHeader, cx, inputCls } from "@/components/ui";
import { Icon } from "@/components/icons";
import { formatTime } from "@/lib/dates";
import type { ID } from "@/lib/types";

/** Личные сообщения: студент и родитель пишут преподавателям, преподаватель отвечает */
export function Messages() {
  const { db, session, version } = useStore();
  const [active, setActive] = useState<ID | null>(null);
  const [compose, setCompose] = useState(false);
  const [q, setQ] = useState("");
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const me = session!.id;

  const threads = useMemo(() => {
    const map = new Map<ID, { last: number; preview: string; unread: number }>();
    for (const m of db.messages) {
      if (m.from !== me && m.to !== me) continue;
      const other = m.from === me ? m.to : m.from;
      const t = map.get(other) ?? { last: 0, preview: "", unread: 0 };
      if (m.at >= t.last) { t.last = m.at; t.preview = (m.from === me ? "Вы: " : "") + m.text; }
      if (m.to === me && !m.read) t.unread++;
      map.set(other, t);
    }
    return [...map.entries()].sort((a, b) => b[1].last - a[1].last);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, version, me]);

  const contacts = useMemo(() => contactsFor(db, session!), [db, session]);
  const chat = active ? db.messages.filter((m) => (m.from === me && m.to === active) || (m.to === me && m.from === active)).sort((a, b) => a.at - b.at) : [];

  useEffect(() => { if (active) markThreadRead(active); }, [active, chat.length]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [active, chat.length]);

  const send = () => {
    if (!active) return;
    const r = sendMessage(active, text);
    if (r.ok) { setText(""); setErr(""); } else setErr(r.error);
  };

  const list = compose
    ? contacts.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()) || c.hint.toLowerCase().includes(q.toLowerCase())).slice(0, 60)
    : null;

  return (
    <div>
      <PageHeader title="Сообщения" subtitle="Личная переписка внутри колледжа" />
      <Card className="grid h-[calc(100dvh-260px)] min-h-[460px] overflow-hidden md:grid-cols-[320px_1fr]">
        {/* Список диалогов */}
        <div className={cx("flex min-h-0 flex-col border-line md:border-r", active && "hidden md:flex")}>
          <div className="flex items-center gap-2 border-b border-line p-3">
            {compose ? (
              <>
                <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск по имени или предмету" className={inputCls} />
                <Button variant="ghost" onClick={() => { setCompose(false); setQ(""); }} aria-label="Закрыть"><Icon name="close" className="size-4" /></Button>
              </>
            ) : (
              <Button variant="gold" className="w-full" onClick={() => setCompose(true)}><Icon name="plus" className="size-4" />Новое сообщение</Button>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {list
              ? list.map((c) => (
                  <button key={c.id} onClick={() => { setActive(c.id); setCompose(false); setQ(""); }} className="flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left hover:bg-page">
                    <Avatar name={c.name} className="size-9 text-xs" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-brand-900">{c.name}</span>
                      <span className="block truncate text-xs text-muted">{c.hint}</span>
                    </span>
                  </button>
                ))
              : threads.length === 0
                ? <Empty icon="chat" title="Диалогов пока нет" text="Нажмите «Новое сообщение» и выберите адресата" />
                : threads.map(([id, t]) => (
                    <button key={id} onClick={() => setActive(id)} className={cx("flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left hover:bg-page", active === id && "bg-brand-50")}>
                      <Avatar name={nameOf(db, id)} className="size-10 text-xs" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-brand-900">{nameOf(db, id)}</span>
                          <span className="shrink-0 text-[11px] text-muted">{formatTime(t.last)}</span>
                        </span>
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-xs text-muted">{t.preview}</span>
                          {t.unread > 0 && <span className="grid min-w-5 place-items-center rounded-full bg-gold-500 px-1.5 text-[10px] font-bold leading-5 text-brand-950">{t.unread}</span>}
                        </span>
                      </span>
                    </button>
                  ))}
          </div>
        </div>

        {/* Переписка */}
        <div className={cx("min-h-0 flex-col", active ? "flex" : "hidden md:flex")}>
          {!active ? <div className="grid flex-1 place-items-center"><Empty icon="chat" title="Выберите диалог" /></div> : (
            <>
              <div className="flex items-center gap-3 border-b border-line px-4 py-3">
                <button onClick={() => setActive(null)} className="rounded-lg p-1.5 text-brand-800 hover:bg-brand-50 md:hidden" aria-label="Назад"><Icon name="chevronLeft" /></button>
                <Avatar name={nameOf(db, active)} className="size-9 text-xs" />
                <p className="truncate font-semibold text-brand-900">{nameOf(db, active)}</p>
              </div>
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-page px-4 py-4">
                {chat.length === 0 && <p className="py-10 text-center text-sm text-muted">Напишите первое сообщение</p>}
                {chat.map((m) => (
                  <div key={m.id} className={cx("flex", m.from === me ? "justify-end" : "justify-start")}>
                    <div className={cx("max-w-[80%] rounded-2xl px-3.5 py-2 text-sm shadow-sm", m.from === me ? "rounded-br-md bg-brand-800 text-white" : "rounded-bl-md bg-white text-ink")}>
                      <p className="whitespace-pre-wrap">{m.text}</p>
                      <p className={cx("mt-1 text-right text-[10px]", m.from === me ? "text-white/60" : "text-muted")}>{formatTime(m.at)}</p>
                    </div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>
              <form onSubmit={(e) => { e.preventDefault(); send(); }} className="border-t border-line p-3">
                {err && <p className="mb-2 text-xs text-rose-600">{err}</p>}
                <div className="flex gap-2">
                  <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Сообщение" className={inputCls} />
                  <Button variant="gold" type="submit" disabled={!text.trim()} aria-label="Отправить"><Icon name="send" className="size-4" /></Button>
                </div>
              </form>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}

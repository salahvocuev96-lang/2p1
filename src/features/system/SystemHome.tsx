"use client";
// Кабинет технического администратора: состояние системы и резервные копии. Без доступа к оценкам.
import { useCallback, useEffect, useState } from "react";
import { act, fetchJson } from "@/lib/store";
import { Badge, Button, Card, CardHeader, Empty, PageHeader, StatCard, StatGrid } from "@/components/ui";
import { Skeleton, toastResult, useConfirm } from "@/components/feedback";
import { Icon } from "@/components/icons";
import { formatTime } from "@/lib/dates";

interface Health {
  status: string;
  integrity: string;
  node: string;
  uptimeSec: number;
  memoryMb: number;
  dbSizeKb: number;
  migrations: { version: string; at: number }[];
  tables: Record<string, number>;
  backups: { file: string; size: number; at: number }[];
  demoMode: boolean;
}

export function SystemHome() {
  const [h, setH] = useState<Health | null>(null);
  const [busy, setBusy] = useState(false);
  const confirm = useConfirm();
  const load = useCallback(async () => setH(await fetchJson<Health>("/api/system")), []);
  useEffect(() => {
    load();
  }, [load]);

  const backup = async () => {
    if (!(await confirm.ask("Создать резервную копию?", "Будет сделан целостный снимок базы данных (VACUUM INTO) в папку резервных копий на сервере.", { confirm: "Создать" }))) return;
    setBusy(true);
    toastResult(await act("system.backup"));
    setBusy(false);
    load();
  };

  if (!h)
    return (
      <div className="space-y-6"><Skeleton className="h-9 w-72" /><div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div><Skeleton className="h-64 rounded-xl" /></div>
    );

  const up = `${Math.floor(h.uptimeSec / 3600)} ч ${Math.floor((h.uptimeSec % 3600) / 60)} мин`;
  return (
    <div className="space-y-6">
      <PageHeader
        title="Состояние системы"
        subtitle="Мониторинг, база данных и резервное копирование. Учебные данные этой роли недоступны"
        action={<Button variant="outline" onClick={load}><Icon name="history" className="size-4" />Обновить</Button>}
      />
      <StatGrid className="grid-cols-2 lg:grid-cols-4">
        <StatCard label="Статус" value={h.status === "ok" ? "Работает" : "Проблема"} hint={`Проверка БД: ${h.integrity}`} icon="server" tone={h.status === "ok" ? "green" : "red"} />
        <StatCard label="Время работы" value={up} hint={`Node.js ${h.node}`} icon="clock" />
        <StatCard label="Размер базы" value={`${(h.dbSizeKb / 1024).toFixed(1)} МБ`} hint="SQLite, режим WAL" icon="database" tone="gold" />
        <StatCard label="Память процесса" value={`${h.memoryMb} МБ`} hint={h.demoMode ? "Демо-режим включён" : "Рабочий режим"} icon="chart" />
      </StatGrid>
      <div className="grid items-start gap-4 sm:gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader icon="database" title="Резервные копии" action={<Button variant="brand" className="h-9" disabled={busy} onClick={backup}>{busy ? "Создаём…" : "Создать копию"}</Button>} />
          {h.backups.length === 0 ? <Empty icon="database" title="Копий пока нет" text="Создайте первую копию. Для эксплуатации нужно настроить автоматическое копирование по расписанию (см. docs/OPERATIONS.md)" /> : (
            <ul className="divide-y divide-line">
              {h.backups.slice(0, 8).map((b) => (
                <li key={b.file} className="flex items-center gap-3 px-5 py-3 text-sm">
                  <Icon name="database" className="size-4 text-gold-600" />
                  <span className="min-w-0 flex-1 truncate font-mono text-xs">{b.file}</span>
                  <span className="text-xs text-muted">{(b.size / 1024 / 1024).toFixed(1)} МБ</span>
                  <span className="text-xs text-muted">{formatTime(b.at)}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="border-t border-line px-5 py-3 text-xs text-muted">Восстановление выполняется вручную по инструкции: остановить сервер, заменить файл базы копией, запустить сервер.</p>
        </Card>
        <Card>
          <CardHeader icon="layers" title="База данных" />
          <dl className="divide-y divide-line text-sm">
            {Object.entries(h.tables).map(([k, v]) => (
              <div key={k} className="flex justify-between px-5 py-2.5"><dt className="font-mono text-xs text-muted">{k}</dt><dd className="font-semibold tabular-nums text-brand-900">{v.toLocaleString("ru")}</dd></div>
            ))}
          </dl>
          <div className="border-t border-line px-5 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Миграции</p>
            <div className="mt-2 flex flex-wrap gap-2">{h.migrations.map((m) => <Badge key={m.version} tone="green">{m.version}</Badge>)}</div>
          </div>
        </Card>
      </div>
      {confirm.node}
    </div>
  );
}

"use client";
// Учебные периоды и правило итоговой оценки. Хранятся в таблице settings, не зашиты в код.
import { useState } from "react";
import { Icon } from "@/components/icons";
import { act, useStore } from "@/lib/store";
import { Button, Card, CardHeader, Field, PageHeader, Select, inputCls } from "@/components/ui";
import { toastResult } from "@/components/feedback";
import type { Settings } from "@/lib/types";

export function AdminSettings() {
  const { db } = useStore();
  const [s, setS] = useState<Settings>(db.settings);
  const md = (sem: "semester1" | "semester2", k: "from" | "to") => (
    <Field label={k === "from" ? "Начало (ММ-ДД)" : "Окончание (ММ-ДД)"}>
      <input className={inputCls} value={s[sem][k]} onChange={(e) => setS({ ...s, [sem]: { ...s[sem], [k]: e.target.value } })} placeholder="09-01" maxLength={5} />
    </Field>
  );
  return (
    <div>
      <PageHeader title="Учебные периоды и правила" subtitle="Настройки действуют для всех кабинетов: дневника, журнала и отчётов" action={<Button variant="brand" onClick={async () => toastResult(await act("settings.update", s))}><Icon name="check" className="size-4" />Сохранить настройки</Button>} />
      <div className="grid items-start gap-4 sm:gap-5 xl:grid-cols-2">
      <Card>
        <CardHeader icon="calendar" title="Семестры" />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <p className="text-sm font-semibold text-brand-900 sm:col-span-2">1 семестр</p>
          {md("semester1", "from")}{md("semester1", "to")}
          <p className="text-sm font-semibold text-brand-900 sm:col-span-2">2 семестр</p>
          {md("semester2", "from")}{md("semester2", "to")}
          <p className="text-xs text-muted sm:col-span-2">Учебный год определяется автоматически по дате, поэтому настройки не нужно менять каждый год.</p>
        </div>
      </Card>
      <Card>
        <CardHeader icon="star" title="Итоговая оценка" />
        <div className="space-y-3 p-5">
          <Select label="Правило расчёта" value={s.finalGradeRule} onChange={(e) => setS({ ...s, finalGradeRule: e.target.value as Settings["finalGradeRule"] })}>
            <option value="mean_round">Среднее арифметическое, математическое округление (3,5 → 4)</option>
            <option value="mean_floor">Среднее арифметическое, округление вниз (3,9 → 3)</option>
          </Select>
          <p className="text-xs text-muted">Это демонстрационные правила. Перед эксплуатацией их нужно привести в соответствие с положением колледжа о текущем контроле и промежуточной аттестации.</p>
        </div>
      </Card>
      </div>
    </div>
  );
}

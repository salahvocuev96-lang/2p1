"use client";
// Справочная страница о колледже. Сведения взяты с официального сайта налоговый-колледж.рф
import { Card, CardHeader, PageHeader, StatCard, StatGrid } from "@/components/ui";
import { Icon } from "@/components/icons";
import { COLLEGE } from "@/lib/college";

export function About() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="О колледже"
        subtitle={`${COLLEGE.name} · основан в ${COLLEGE.founded} году`}
        action={
          <a href={COLLEGE.site} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-control)] border border-line bg-white px-4 text-sm font-semibold text-ink shadow-card hover:bg-subtle">
            <Icon name="link" className="size-4" />Официальный сайт
          </a>
        }
      />

      <StatGrid className="grid-cols-2 lg:grid-cols-4">
        <StatCard icon="calendar" label="Год основания" value={COLLEGE.founded} />
        <StatCard icon="users" label="Выпускников" value="3000+" tone="green" />
        <StatCard icon="star" label="Докторов и кандидатов наук" value="15+" tone="gold" />
        <StatCard icon="layers" label="Специальностей" value={COLLEGE.specialties.length} />
      </StatGrid>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-5">
          <Card>
            <CardHeader icon="info" title="Коротко о колледже" />
            <ul className="space-y-3 p-4 text-sm leading-relaxed text-ink sm:p-5">
              {COLLEGE.facts.map((f) => (
                <li key={f} className="flex gap-2.5"><Icon name="check" className="mt-0.5 size-4 shrink-0 text-brand-600" />{f}</li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader icon="chat" title="Обращение директора" />
            <div className="p-4 sm:p-5">
              <div className="space-y-3 border-l-2 border-brand-600 pl-4 text-sm italic leading-relaxed text-ink/85">
                {COLLEGE.director.speech.map((p) => <p key={p}>{p}</p>)}
              </div>
              <div className="mt-4 flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/director.jpg" alt={COLLEGE.director.name} className="size-10 rounded-full object-cover" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{COLLEGE.director.name}</p>
                  <p className="text-xs text-muted">{COLLEGE.director.title}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader icon="layers" title="Специальности" subtitle="Программы дополнены дисциплинами «Налоговая грамотность» и «Цифровая грамотность»" />
            <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
              {COLLEGE.specialties.map((s) => (
                <div key={s.code} className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-line">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.img} alt="" loading="lazy" className="aspect-[16/9] w-full object-cover" />
                  <div className="flex-1 border-t-4 px-3 py-2.5" style={{ borderTopColor: s.color }}>
                    <p className="text-xs font-semibold tabular-nums text-muted">{s.code}</p>
                    <p className="text-sm font-medium text-ink">{s.name}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader icon="layers" title="Виртуальный тур по колледжу" subtitle="Осмотрите здание в интерактивном 3D-формате" />
            <div className="overflow-hidden rounded-b-[var(--radius-card)]">
              <iframe
                src="https://ep.matterport.host/index/?m=Q7z9Lc2doGV"
                className="w-full"
                style={{ height: "520px", border: "none" }}
                allow="xr-spatial-tracking; fullscreen"
                allowFullScreen
                title="Виртуальный тур по Налоговому колледжу"
              />
            </div>
          </Card>

          <Card>
            <CardHeader icon="journal" title="Практика и трудоустройство" subtitle="Колледж помогает выпускникам с трудоустройством" />
            <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
              {COLLEGE.practice.map((p) => (
                <div key={p} className="flex gap-2.5 rounded-lg bg-subtle p-3 text-sm text-ink">
                  <span className="mt-1.5 size-2 shrink-0 rounded-sm bg-brand-600" />{p}
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="min-w-0 space-y-5">
          <Card>
            <CardHeader icon="phone" title="Контакты" />
            <div className="space-y-2 p-4 sm:p-5">
              {COLLEGE.phones.map((p) => (
                <a key={p} href={`tel:${p.replace(/[^\d+]/g, "")}`} className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm font-semibold tabular-nums text-ink hover:bg-subtle">
                  <span className="grid size-8 place-items-center rounded-md bg-brand-50 text-brand-700"><Icon name="phone" className="size-4" /></span>{p}
                </a>
              ))}
              <a href={COLLEGE.site} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm font-medium text-brand-700 hover:bg-subtle">
                <span className="grid size-8 place-items-center rounded-md bg-brand-50 text-brand-700"><Icon name="link" className="size-4" /></span>налоговый-колледж.рф
              </a>
            </div>
          </Card>

          <Card>
            <CardHeader icon="shield" title="Преимущества" tone="gold" />
            <ul className="space-y-2 p-4 text-sm text-ink sm:p-5">
              {COLLEGE.advantages.map((a) => (
                <li key={a} className="flex gap-2"><Icon name="check" className="mt-0.5 size-4 shrink-0 text-emerald-600" />{a}</li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader icon="users" title="Студенческая жизнь" tone="green" />
            <div className="flex flex-wrap gap-2 p-4 sm:p-5">
              {COLLEGE.life.map((l) => <span key={l} className="rounded-md bg-subtle px-2.5 py-1 text-[13px] text-ink ring-1 ring-line">{l}</span>)}
            </div>
          </Card>

          <Card>
            <CardHeader icon="book" title="Электронные ресурсы" />
            <div className="space-y-1 p-3">
              {COLLEGE.resources.map((r) => (
                <a key={r.name} href={r.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 hover:bg-subtle">
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-ink">{r.name}</span>
                    <span className="block text-xs text-muted">{r.text}</span>
                  </span>
                  <Icon name="chevronRight" className="size-4 shrink-0 text-muted" />
                </a>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

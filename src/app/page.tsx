// Страница входа. Серверный компонент: цифры колледжа берутся из базы, форма работает на клиенте.
import { Crest } from "@/components/Crest";
import { Icon, type IconName } from "@/components/icons";
import { LoginForm } from "@/features/auth/LoginForm";
import { getContext, isDemoMode } from "@/server/context";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const { db } = getContext();
  const stats: [number, string][] = [
    [db.groups.length, "учебных групп"],
    [db.teachers.length, "преподавателей"],
    [db.subjects.length, "дисциплин"],
  ];
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(480px,44%)]">
      <section className="hero relative hidden overflow-hidden text-white lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-14">
        <div className="hero-grid pointer-events-none absolute inset-0" />
        <div className="relative flex items-center gap-3.5">
          <span className="grid size-14 place-items-center rounded-xl bg-white p-1.5 shadow-lg"><Crest className="size-11" /></span>
          <div>
            <p className="text-[17px] font-semibold leading-tight">Налоговый колледж</p>
            <p className="mt-0.5 text-[13px] text-gold-400">Электронный дневник и журнал</p>
          </div>
        </div>

        <div className="relative max-w-xl">
          <h1 className="text-[44px] font-semibold leading-[1.08] tracking-tight xl:text-[52px]">
            Оценки, расписание и&nbsp;задания <span className="text-gold-400">в&nbsp;одном кабинете</span>
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-white/60">
            Оценка появляется у&nbsp;студента и&nbsp;родителя сразу после того, как её&nbsp;выставил преподаватель
          </p>
          <dl className="mt-9 grid max-w-lg grid-cols-3 overflow-hidden rounded-xl ring-1 ring-white/10">
            {stats.map(([n, l], i) => (
              <div key={l} className={i > 0 ? "border-l border-white/10 bg-white/[0.04] px-5 py-4" : "bg-white/[0.04] px-5 py-4"}>
                <dd className="text-[30px] font-semibold leading-none tabular-nums">{n}</dd>
                <dt className="mt-1.5 text-xs text-white/50">{l}</dt>
              </div>
            ))}
          </dl>
          <ul className="mt-8 grid max-w-lg gap-3 text-[14px] text-white/75">
            {[
              ["journal", "Электронный журнал с историей изменений оценок"],
              ["book", "Дневник, расписание и замены для студентов"],
              ["users", "Кабинет родителя и переписка с преподавателями"],
            ].map(([icon, f]) => (
              <li key={f} className="flex items-center gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/[0.07] text-gold-400 ring-1 ring-inset ring-white/10"><Icon name={icon as IconName} className="size-4" /></span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-[11px] text-white/35">
          Демонстрационная версия. Студенты и&nbsp;родители вымышленные, расписание взято из&nbsp;проекта расписания колледжа
        </p>
      </section>

      {/* Правая панель — форма входа */}
      <section className="relative flex flex-col justify-center bg-page px-5 pb-10 sm:px-10 lg:bg-white lg:px-14 lg:py-10">
        <LoginForm demo={isDemoMode()} />
      </section>
    </div>
  );
}

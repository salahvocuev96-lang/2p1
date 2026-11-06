"use client";
// Таблица с сортировкой. На телефоне строки превращаются в карточки.
import { useMemo, useState, type ReactNode } from "react";
import { Icon } from "./icons";
import { Empty, cx } from "./ui";

export interface Column<T> {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
  sort?: (row: T) => string | number | null;
  className?: string;
  /** Главная колонка: на телефоне становится заголовком карточки */
  primary?: boolean;
}

export function DataTable<T>({ rows, columns, rowKey, empty = "Ничего не найдено", pageSize = 50, onRowClick }: {
  rows: T[]; columns: Column<T>[]; rowKey: (r: T) => string; empty?: string; pageSize?: number; onRowClick?: (r: T) => void;
}) {
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const [limit, setLimit] = useState(pageSize);
  const sorted = useMemo(() => {
    const col = columns.find((c) => c.key === sort?.key);
    if (!col?.sort || !sort) return rows;
    return [...rows].sort((a, b) => {
      const x = col.sort!(a);
      const y = col.sort!(b);
      if (x === y) return 0;
      if (x === null) return 1;
      if (y === null) return -1;
      return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "ru")) * sort.dir;
    });
  }, [rows, columns, sort]);
  const shown = sorted.slice(0, limit);
  if (!rows.length) return <Empty icon="search" title={empty} />;
  const primary = columns.find((c) => c.primary) ?? columns[0];

  return (
    <>
      <div className="hidden md:block scroll-x">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-subtle text-left text-[11px] font-semibold uppercase tracking-wider text-muted">
              {columns.map((c) => (
                <th key={c.key} className={cx("h-9 px-4 font-semibold first:pl-5", c.className)}>
                  {c.sort ? (
                    <button onClick={() => setSort((s) => (s?.key === c.key ? { key: c.key, dir: s.dir === 1 ? -1 : 1 } : { key: c.key, dir: 1 }))} className="inline-flex items-center gap-1 hover:text-ink" aria-label={`Сортировать: ${c.label}`}>
                      {c.label}
                      <Icon name={sort?.key === c.key && sort.dir === -1 ? "chevronLeft" : "chevronRight"} className={cx("size-3 rotate-90 transition", sort?.key !== c.key && "opacity-30")} />
                    </button>
                  ) : c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {shown.map((r) => (
              <tr key={rowKey(r)} onClick={onRowClick && (() => onRowClick(r))} className={cx("transition-colors duration-100 hover:bg-subtle", onRowClick && "cursor-pointer")}>
                {columns.map((c) => <td key={c.key} className={cx("px-4 py-2.5 first:pl-5", c.className)}>{c.render(r)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="space-y-2 p-3 md:hidden">
        {shown.map((r) => (
          <li key={rowKey(r)} onClick={onRowClick && (() => onRowClick(r))} className={cx("rounded-lg border border-line bg-white px-4 py-3 transition-colors", onRowClick && "active:bg-subtle")}>
            <div className="text-sm font-semibold text-ink">{primary.render(r)}</div>
            <dl className="mt-2 grid border-t border-line pt-2 grid-cols-2 gap-x-3 gap-y-1 text-xs">
              {columns.filter((c) => c !== primary).map((c) => (
                c.label
                  ? <div key={c.key} className="min-w-0"><dt className="text-muted">{c.label}</dt><dd className="truncate text-ink">{c.render(r)}</dd></div>
                  : <div key={c.key} className="col-span-2 mt-1">{c.render(r)}</div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
      {sorted.length > limit && (
        <button onClick={() => setLimit((l) => l + pageSize)} className="w-full border-t border-line py-2.5 text-sm font-medium text-brand-700 transition-colors hover:bg-subtle">
          Показать ещё ({sorted.length - limit})
        </button>
      )}
    </>
  );
}

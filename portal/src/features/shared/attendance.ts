import type { AttendanceStatus } from "@/lib/types";

/** Обозначения посещаемости. Это отдельная шкала, она не смешивается с оценками */
export const ATT_META: Record<AttendanceStatus, { label: string; short: string; chip: string; btn: string }> = {
  present: { label: "Присутствовал", short: "П", chip: "bg-emerald-50 text-emerald-700", btn: "bg-emerald-600 text-white" },
  late: { label: "Опоздал", short: "ОП", chip: "bg-gold-50 text-gold-600", btn: "bg-gold-500 text-brand-950" },
  absent: { label: "Отсутствовал", short: "Н", chip: "bg-rose-50 text-rose-600", btn: "bg-rose-600 text-white" },
  sick: { label: "Болел", short: "Б", chip: "bg-sky-50 text-sky-700", btn: "bg-sky-600 text-white" },
};

export const ATT_ORDER: AttendanceStatus[] = ["present", "late", "absent", "sick"];

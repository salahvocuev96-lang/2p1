// Меню кабинетов. Новый раздел = одна строка здесь + одна страница в app/(cabinet).
import type { IconName } from "@/components/icons";
import type { Role } from "./types";

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  short: string; // подпись в нижнем меню телефона
  section?: string; // заголовок группы в боковом меню, начинается с этого пункта
  pin?: boolean; // показывать в нижнем меню телефона
}

const I = (href: string, label: string, icon: IconName, short = label, extra: Partial<NavItem> = {}): NavItem => ({ href, label, icon, short, ...extra });
const S = (section: string) => ({ section });
const P = { pin: true };

export const NAV: Record<Role, NavItem[]> = {
  student: [
    I("/home/", "Главная", "home", "Главная", P),
    I("/diary/", "Электронный дневник", "book", "Дневник", { ...S("Учёба"), ...P }),
    I("/grades/", "Оценки", "star", "Оценки", P),
    I("/schedule/", "Расписание", "calendar", "Пары", P),
    I("/homework/", "Домашние задания", "task", "Задания"),
    I("/attendance/", "Посещаемость", "check", "Пропуски"),
    I("/calendar/", "Календарь", "clock"),
    I("/messages/", "Сообщения", "chat", "Сообщения", S("Общение")),
    I("/notifications/", "Уведомления", "bell"),
    I("/about/", "О колледже", "info", "Колледж", S("Колледж")),
    I("/profile/", "Профиль", "user", "Профиль", S("Аккаунт")),
  ],
  teacher: [
    I("/home/", "Главная", "home", "Главная", P),
    I("/journal/", "Электронный журнал", "journal", "Журнал", { ...S("Преподавание"), ...P }),
    I("/schedule/", "Расписание", "calendar", "Пары", P),
    I("/attendance/", "Посещаемость", "check", "Пропуски"),
    I("/homework/", "Домашние задания", "task", "Задания", P),
    I("/groups/", "Мои группы", "users", "Группы"),
    I("/subjects/", "Мои предметы", "layers", "Предметы"),
    I("/messages/", "Сообщения", "chat", "Сообщения", S("Общение")),
    I("/notifications/", "Уведомления", "bell"),
    I("/about/", "О колледже", "info", "Колледж", S("Колледж")),
    I("/profile/", "Профиль", "user", "Профиль", S("Аккаунт")),
  ],
  parent: [
    I("/home/", "Главная", "home", "Главная", P),
    I("/grades/", "Оценки ребёнка", "star", "Оценки", { ...S("Учёба ребёнка"), ...P }),
    I("/diary/", "Дневник", "book", "Дневник", P),
    I("/schedule/", "Расписание", "calendar", "Пары", P),
    I("/homework/", "Домашние задания", "task", "Задания"),
    I("/attendance/", "Посещаемость", "check", "Пропуски"),
    I("/messages/", "Сообщения", "chat", "Сообщения", S("Общение")),
    I("/notifications/", "Уведомления", "bell"),
    I("/about/", "О колледже", "info", "Колледж", S("Колледж")),
    I("/profile/", "Профиль", "user", "Профиль", S("Аккаунт")),
  ],
  college_admin: [
    I("/home/", "Обзор", "chart", "Обзор", P),
    I("/students/", "Студенты", "users", "Студенты", { ...S("Люди"), ...P }),
    I("/teachers/", "Преподаватели", "user"),
    I("/parents/", "Родители", "users"),
    I("/accounts/", "Аккаунты", "key"),
    I("/groups/", "Группы", "layers", "Группы", { ...S("Учебный процесс"), ...P }),
    I("/schedule/", "Расписание", "calendar", "Пары", P),
    I("/changes/", "Замены в расписании", "calendar", "Замены"),
    I("/subjects/", "Предметы", "book"),
    I("/loads/", "Назначения", "link"),
    I("/settings/", "Учебные периоды", "settings", "Периоды"),
    I("/announcements/", "Объявления", "megaphone", "Объявления", S("Связь и контроль")),
    I("/messages/", "Сообщения", "chat"),
    I("/audit/", "Журнал аудита", "history", "Аудит"),
    I("/about/", "О колледже", "info", "Колледж", S("Колледж")),
    I("/profile/", "Профиль", "user", "Профиль", S("Аккаунт")),
  ],
  tech_admin: [
    I("/home/", "Состояние системы", "server", "Система", P),
    I("/audit/", "Журнал событий", "history", "События", P),
    I("/messages/", "Сообщения", "chat", "Сообщения", { ...S("Общение"), ...P }),
    I("/notifications/", "Уведомления", "bell", "Уведомления", P),
    I("/about/", "О колледже", "info", "Колледж", S("Колледж")),
    I("/profile/", "Профиль", "user", "Профиль", S("Аккаунт")),
  ],
};

export const ROLE_LABEL: Record<Role, string> = {
  student: "Студент",
  teacher: "Преподаватель",
  parent: "Родитель",
  college_admin: "Учебная часть",
  tech_admin: "Технический администратор",
};

// Меню кабинетов. Новый раздел = одна строка здесь + одна страница в app/(cabinet).
import type { IconName } from "@/components/icons";
import type { Role } from "./types";

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  short: string; // подпись в нижнем меню телефона
}

const I = (href: string, label: string, icon: IconName, short = label): NavItem => ({ href, label, icon, short });

export const NAV: Record<Role, NavItem[]> = {
  student: [
    I("/home/", "Главная", "home"),
    I("/diary/", "Электронный дневник", "book", "Дневник"),
    I("/grades/", "Мои оценки", "star", "Оценки"),
    I("/schedule/", "Расписание", "calendar", "Пары"),
    I("/attendance/", "Посещаемость", "check", "Пропуски"),
    I("/homework/", "Домашние задания", "task", "Задания"),
    I("/messages/", "Сообщения", "chat"),
    I("/profile/", "Профиль", "user"),
  ],
  teacher: [
    I("/home/", "Главная", "home"),
    I("/journal/", "Электронный журнал", "journal", "Журнал"),
    I("/groups/", "Мои группы", "users", "Группы"),
    I("/subjects/", "Мои предметы", "layers", "Предметы"),
    I("/attendance/", "Посещаемость", "check", "Пропуски"),
    I("/homework/", "Домашние задания", "task", "Задания"),
    I("/schedule/", "Расписание", "calendar", "Пары"),
    I("/messages/", "Сообщения", "chat"),
    I("/profile/", "Профиль", "user"),
  ],
  parent: [
    I("/home/", "Главная", "home"),
    I("/grades/", "Оценки ребёнка", "star", "Оценки"),
    I("/attendance/", "Посещаемость", "check", "Пропуски"),
    I("/schedule/", "Расписание", "calendar", "Пары"),
    I("/homework/", "Домашние задания", "task", "Задания"),
    I("/messages/", "Сообщения", "chat"),
    I("/profile/", "Профиль", "user"),
  ],
  admin: [
    I("/home/", "Обзор", "chart"),
    I("/groups/", "Группы", "layers"),
    I("/students/", "Студенты", "users"),
    I("/teachers/", "Преподаватели", "user"),
    I("/subjects/", "Предметы", "book"),
    I("/messages/", "Сообщения", "chat"),
    I("/profile/", "Профиль", "settings"),
  ],
};

export const ROLE_LABEL: Record<Role, string> = {
  student: "Студент",
  teacher: "Преподаватель",
  parent: "Родитель",
  admin: "Администратор",
};

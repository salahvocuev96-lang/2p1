// Доменная модель портала. Все сущности ссылаются друг на друга по id,
// чтобы позже без переделки UI заменить LocalStorage на настоящий API/БД.

export type Role = "student" | "teacher" | "parent" | "admin";

export type ID = string;
export type ISODate = string; // YYYY-MM-DD

export interface Group {
  id: ID;
  code: string; // 2П1
  course: 1 | 2 | 3 | 4;
  specialty: string; // буквенный код: П, Б, БД...
  curatorId?: ID;
}

export interface Student {
  id: ID;
  name: string; // Фамилия Имя Отчество
  groupId: ID;
  parentId: ID;
  email: string;
  phone: string;
}

export interface Parent {
  id: ID;
  name: string;
  childIds: ID[];
  phone: string;
}

export interface Teacher {
  id: ID;
  name: string; // Фамилия И.О.
  email: string;
}

export interface Subject {
  id: ID;
  name: string;
  graded: boolean; // «Час куратора» и подобное не оценивается
}

export interface ScheduleSlot {
  groupId: ID;
  weekday: number; // 1 = понедельник ... 6 = суббота
  slot: number; // номер пары
  subjectId: ID;
  teacherId: ID;
  room: string;
}

/** Нагрузка: какой преподаватель ведёт какой предмет в какой группе */
export interface Load {
  teacherId: ID;
  subjectId: ID;
  groupId: ID;
}

export type GradeValue = 2 | 3 | 4 | 5;

export interface Grade {
  studentId: ID;
  subjectId: ID;
  date: ISODate;
  value: GradeValue;
  teacherId: ID;
}

/** Посещаемость хранится отдельно от оценок */
export type AttendanceStatus = "present" | "late" | "absent" | "sick";

export interface Attendance {
  studentId: ID;
  subjectId: ID;
  date: ISODate;
  status: AttendanceStatus;
}

export interface Homework {
  id: ID;
  groupId: ID;
  subjectId: ID;
  teacherId: ID;
  issued: ISODate;
  due: ISODate;
  text: string;
}

export interface Message {
  id: ID;
  from: ID;
  to: ID;
  text: string;
  at: number; // timestamp
  read: boolean;
}

export type NotificationKind = "grade" | "message" | "homework" | "attendance";

export interface Notification {
  id: ID;
  userId: ID;
  kind: NotificationKind;
  title: string;
  text: string;
  at: number;
  read: boolean;
  href: string;
}

export interface SessionUser {
  id: ID;
  role: Role;
  name: string;
}

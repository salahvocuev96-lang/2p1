// Доменная модель портала. Общая для сервера (src/server) и интерфейса.
// Сущности ссылаются друг на друга по id; хранятся в SQLite (db/migrations).

/** Роли. college_admin управляет учебной частью, tech_admin обслуживает систему и не видит оценки */
export type Role = "student" | "teacher" | "parent" | "college_admin" | "tech_admin";

export type ID = string;
export type ISODate = string; // YYYY-MM-DD

export interface Group {
  id: ID;
  code: string; // 2П1
  course: 1 | 2 | 3 | 4;
  specialty: string; // буквенный код: П, Б, БД...
  curatorId?: ID;
  /** Группа добавлена для демонстрации объёма: расписание скопировано у группы того же курса */
  isDemo?: boolean;
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

export interface Staff {
  id: ID;
  name: string;
  role: "college_admin" | "tech_admin";
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
  id: number;
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
  updatedAt?: number;
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
  issued: ISODate; // дата публикации
  due: ISODate; // срок сдачи
  title: string;
  text: string; // описание
}

/** Статус задания у конкретного студента. «Новое» = записи нет, «Просрочено» вычисляется по сроку */
export type HomeworkProgress = "in_progress" | "done";
export type HomeworkStatus = "new" | HomeworkProgress | "overdue";

export interface Message {
  id: ID;
  from: ID;
  to: ID;
  text: string;
  at: number; // timestamp
  read: boolean;
}

export type NotificationKind = "grade" | "grade_change" | "message" | "homework" | "attendance" | "schedule" | "announcement";

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
  login: string;
  mustChangePassword: boolean;
  photo?: string;
}

/** Замена / отмена пары на конкретную дату */
export interface ScheduleChange {
  id: number;
  date: ISODate;
  groupId: ID;
  slot: number;
  kind: "cancel" | "substitute";
  newTeacherId?: ID;
  newRoom?: string;
  note?: string;
  createdAt: number;
}

/** Запись журнала аудита. Таблица в БД защищена триггерами от изменения и удаления */
export interface AuditEntry {
  id: number;
  at: number;
  actorId: ID;
  actorRole: Role | "system";
  action: string; // grade.create, grade.update, grade.delete, attendance.set, schedule.update, auth.login ...
  entity: string;
  entityId: string;
  before: string | null; // JSON
  after: string | null; // JSON
  reason: string | null;
}

/** Учётная запись (без хеша пароля) для экрана администратора */
export interface Account {
  id: ID;
  login: string;
  role: Role;
  name: string;
  mustChangePassword: boolean;
  active: boolean;
  createdAt: number;
}

export interface PasswordResetRequest {
  id: number;
  login: string;
  at: number;
  status: "open" | "done";
}

/** Настраиваемые правила и учебные периоды (таблица settings). Даты семестров в формате MM-DD */
export interface Settings {
  semester1: { from: string; to: string };
  semester2: { from: string; to: string };
  /** Правило итоговой оценки. Демо: среднее арифметическое, округление по правилам математики */
  finalGradeRule: "mean_round" | "mean_floor";
}

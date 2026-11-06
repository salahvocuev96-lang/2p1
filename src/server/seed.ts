// Генерация демо-базы. Расписание 22 реальных групп берётся из проекта расписания колледжа
// (src/data/groups.json = копия all-groups.json, см. scripts/sync-schedule.mjs).
// Студенты, родители и сотрудники администрации вымышленные.
import raw from "@/data/groups.json";
import type {
  Attendance, AttendanceStatus, Grade, GradeValue, Group, Homework, ID, Load, Message,
  Notification, Parent, ScheduleSlot, Staff, Student, Subject, Teacher,
} from "@/lib/types";
import type { DB } from "@/lib/db-types";
import { DEFAULT_SETTINGS } from "@/lib/db-types";
import { key } from "@/lib/constants";
import { addDays, dateRange, today, weekday, WEEKDAYS, academicYear } from "@/lib/dates";
import { hash, pick, rng } from "@/lib/rng";
import { FATHER, FEMALE, MALE, MOTHER, SURNAMES, feminine, patronymic, translit } from "@/lib/names";

export const STUDENTS_PER_GROUP = 12;

/** Дополнительные группы до 34: в реальном расписании их пока нет */
const EXTRA_GROUPS = ["1П2", "1Б2", "1Н1", "2П2", "2Н1", "2Б2", "3П2", "3Б2", "3Ю2", "4Б1", "4Ю1", "4БД1"];

export const STAFF: Staff[] = [
  { id: "adm_1", name: "Соколова Марина Викторовна", role: "college_admin" },
  { id: "tech_1", name: "Лебедев Артём Игоревич", role: "tech_admin" },
];

const NON_GRADED = [/^Час куратора$/, /^День самостоятельной работы$/, /^Разговоры о важном$/];


function normalizeSubject(name: string) {
  return name.replace(/\s*\(дистант\)\s*$/i, "").trim();
}

type RawGroups = Record<string, { groupName: string; schedule: Record<string, { slot: number; subject: string; teacher: string; room: string }[]> }>;

export function buildSeed(): DB {
  const data = raw as RawGroups;
  const subjects = new Map<string, Subject>();
  const teachersByName = new Map<string, Teacher>();

  // Нормализация ФИО преподавателей: «Наумова» и «Наумова Е.М.» это один человек
  const allNames = new Set<string>();
  Object.values(data).forEach((g) => Object.values(g.schedule).forEach((ls) => ls.forEach((l) => l.teacher && allNames.add(l.teacher.trim()))));
  const canonical = (n: string) => {
    if (n.includes(" ")) return n;
    const full = [...allNames].find((x) => x.startsWith(n + " "));
    return full ?? n;
  };

  const teacherOf = (name: string): Teacher => {
    const n = canonical(name.trim());
    let t = teachersByName.get(n);
    if (!t) {
      t = { id: "t_" + hash(n).toString(36), name: n, email: `${translit(n.split(" ")[0])}@nalog-college.ru` };
      teachersByName.set(n, t);
    }
    return t;
  };
  const subjectOf = (name: string): Subject => {
    const n = normalizeSubject(name);
    let s = subjects.get(n);
    if (!s) {
      s = { id: "s_" + hash(n).toString(36), name: n, graded: !NON_GRADED.some((r) => r.test(n)) };
      subjects.set(n, s);
    }
    return s;
  };

  const groups: Group[] = [];
  const schedule: ScheduleSlot[] = [];
  const loadSet = new Map<string, Load>();

  let slotId = 1;
  const addGroup = (gid: string, code: string, source: RawGroups[string], isDemo: boolean) => {
    const course = Number(code[0]) as Group["course"];
    const specialty = code.slice(1).replace(/\d+$/, "");
    const group: Group = { id: gid, code, course, specialty, ...(isDemo ? { isDemo } : {}) };
    groups.push(group);
    WEEKDAYS.forEach((dayName, i) => {
      for (const l of source.schedule[dayName] ?? []) {
        if (!l.subject || l.subject.trim() === "—" || !l.teacher) continue;
        const s = subjectOf(l.subject);
        const t = teacherOf(l.teacher);
        schedule.push({ id: slotId++, groupId: gid, weekday: i + 1, slot: l.slot, subjectId: s.id, teacherId: t.id, room: l.room === "—" ? "" : l.room });
        loadSet.set(`${t.id}|${s.id}|${gid}`, { teacherId: t.id, subjectId: s.id, groupId: gid });
        if (s.name === "Час куратора") group.curatorId = t.id;
      }
    });
  };

  const real = Object.entries(data).map(([gid, g]) => ({ gid, code: g.groupName.replace("-", ""), g }));
  real.forEach((r) => addGroup(r.gid, r.code, r.g, false));
  // Демо-группы получают расписание группы того же курса и специальности (или просто того же курса)
  for (const code of EXTRA_GROUPS) {
    const spec = code.slice(1).replace(/\d+$/, "");
    const src = real.find((r) => r.code[0] === code[0] && r.code.slice(1).replace(/\d+$/, "") === spec) ?? real.find((r) => r.code[0] === code[0])!;
    addGroup("g" + translit(code.toLowerCase()), code, src.g, true);
  }
  groups.sort((a, b) => a.course - b.course || a.code.localeCompare(b.code, "ru"));

  // ---- Студенты и родители ----
  const students: Student[] = [];
  const parents: Parent[] = [];
  for (const g of groups) {
    const r = rng(hash("group" + g.id));
    const used = new Set<string>();
    const list: Student[] = [];
    for (let i = 0; i < STUDENTS_PER_GROUP; i++) {
      const male = r() < 0.5;
      let surname = pick(r, SURNAMES);
      while (used.has(surname)) surname = pick(r, SURNAMES);
      used.add(surname);
      const father = pick(r, FATHER);
      const first = male ? pick(r, MALE) : pick(r, FEMALE);
      const name = `${male ? surname : feminine(surname)} ${first} ${patronymic(father, male)}`;
      const id = `st_${g.id}_${i + 1}`;
      const pid = `pr_${g.id}_${i + 1}`;
      const mother = pick(r, MOTHER);
      const phone = () => `+7 (9${Math.floor(r() * 90 + 10)}) ${Math.floor(r() * 900 + 100)}-${Math.floor(r() * 90 + 10)}-${Math.floor(r() * 90 + 10)}`;
      list.push({ id, name, groupId: g.id, parentId: pid, email: `${translit(surname)}.${translit(first)[0]}@student.nalog-college.ru`, phone: phone() });
      parents.push({ id: pid, name: `${feminine(surname)} ${mother} ${pick(r, ["Александровна", "Викторовна", "Сергеевна", "Ивановна", "Петровна", "Николаевна"])}`, childIds: [id], phone: phone() });
    }
    students.push(...list.sort((a, b) => a.name.localeCompare(b.name, "ru")));
  }

  // ---- История оценок и посещаемости с 1 сентября по вчерашний день ----
  const grades: Record<string, Grade> = {};
  const attendance: Record<string, Attendance> = {};
  const now = today();
  const from = `${academicYear(now)}-09-01`;
  const to = addDays(now, -1);
  const subjById = new Map([...subjects.values()].map((s) => [s.id, s]));
  const slotsByGroupDay = new Map<string, ScheduleSlot[]>();
  for (const s of schedule) {
    const k = `${s.groupId}|${s.weekday}`;
    if (!slotsByGroupDay.has(k)) slotsByGroupDay.set(k, []);
    slotsByGroupDay.get(k)!.push(s);
  }
  const studentsByGroup = new Map<ID, Student[]>();
  students.forEach((s) => {
    if (!studentsByGroup.has(s.groupId)) studentsByGroup.set(s.groupId, []);
    studentsByGroup.get(s.groupId)!.push(s);
  });

  for (const date of dateRange(from, to)) {
    const wd = weekday(date);
    if (wd === 7) continue;
    for (const g of groups) {
      const slots = slotsByGroupDay.get(`${g.id}|${wd}`) ?? [];
      const seen = new Set<ID>(); // сдвоенная пара = одно занятие
      for (const sl of slots) {
        if (seen.has(sl.subjectId)) continue;
        seen.add(sl.subjectId);
        const subj = subjById.get(sl.subjectId)!;
        for (const st of studentsByGroup.get(g.id) ?? []) {
          const r = rng(hash(st.id + sl.subjectId + date));
          const level = 3 + (hash(st.id) % 100) / 50; // «сила» студента 3.0-5.0
          const roll = r();
          const status: AttendanceStatus = roll < 0.04 ? "absent" : roll < 0.07 ? "sick" : roll < 0.1 ? "late" : "present";
          if (status !== "present") attendance[key(st.id, sl.subjectId, date)] = { studentId: st.id, subjectId: sl.subjectId, date, status };
          if (!subj.graded || status === "absent" || status === "sick") continue;
          if (r() < 0.3) {
            const v = Math.max(2, Math.min(5, Math.round(level + (r() - 0.5) * 2))) as GradeValue;
            grades[key(st.id, sl.subjectId, date)] = { studentId: st.id, subjectId: sl.subjectId, date, value: v, teacherId: sl.teacherId };
          }
        }
      }
    }
  }

  // ---- Домашние задания: по одному на каждую связку «группа + предмет» ----
  const TASKS: [string, string][] = [
    ["Конспект темы", "Конспект параграфа и письменные ответы на контрольные вопросы в конце темы."],
    ["Задачи из практикума", "Решить задачи практикума. Вариант соответствует номеру в журнале."],
    ["Доклад", "Подготовить доклад на 5 минут по выбранной теме из списка на занятии."],
    ["Практическая работа", "Выполнить практическую работу и оформить отчёт по образцу."],
    ["Подготовка к самостоятельной", "Повторить материал последних трёх занятий: на следующей паре самостоятельная работа."],
  ];
  const homework: Homework[] = [];
  for (const l of loadSet.values()) {
    if (!subjById.get(l.subjectId)!.graded) continue;
    const r = rng(hash("hw" + l.groupId + l.subjectId));
    const issued = addDays(now, -Math.floor(r() * 10) - 1);
    const sport = /физ/i.test(subjById.get(l.subjectId)!.name);
    const [title, text] = sport ? ["Подготовка к нормативам", "Бег 100 м, подтягивания или пресс. Сдача на следующем занятии."] : pick(r, TASKS);
    homework.push({ id: "hw_" + hash(l.groupId + l.subjectId).toString(36), ...l, issued, due: addDays(issued, 7), title, text });
  }

  const teachers = [...teachersByName.values()].sort((a, b) => a.name.localeCompare(b.name, "ru"));
  const db: DB = {
    groups, students, parents, teachers, staff: STAFF,
    subjects: [...subjects.values()].sort((a, b) => a.name.localeCompare(b.name, "ru")),
    schedule, loads: [...loadSet.values()], grades, attendance, homework,
    homeworkProgress: {}, messages: [], notifications: [], settings: DEFAULT_SETTINGS, userPhotos: {}, scheduleChanges: [],
  };
  addDemoConversation(db);
  return db;
}

/** Учётные записи демо-версии. Остальным людям доступ выдаёт администратор (раздел «Аккаунты») */
export function demoAccounts(db: DB) {
  const st = db.students.find((s) => s.groupId === "2p1")!;
  const st2 = db.students.filter((s) => s.groupId === "2p1")[1];
  const teacher = db.teachers.find((t) => t.name.startsWith("Кудинова")) ?? db.teachers[0];
  return [
    { id: st.id, login: "student", role: "student" as const, name: st.name, temp: false },
    { id: teacher.id, login: "teacher", role: "teacher" as const, name: teacher.name, temp: false },
    { id: st.parentId, login: "parent", role: "parent" as const, name: db.parents.find((p) => p.id === st.parentId)!.name, temp: false },
    { id: "adm_1", login: "admin", role: "college_admin" as const, name: STAFF[0].name, temp: false },
    { id: "tech_1", login: "tech", role: "tech_admin" as const, name: STAFF[1].name, temp: false },
    // Пример первого входа: временный пароль, который нужно сменить
    { id: st2.id, login: "newstudent", role: "student" as const, name: st2.name, temp: true },
  ];
}

export const DEMO_PASSWORD = "demo2026";
export const DEMO_TEMP_PASSWORD = "temp-2026";

let uidN = 0;
const uid = (p: string) => `${p}_seed${(uidN++).toString(36)}`;

/** Стартовая переписка и объявление, чтобы демо не выглядело пустым */
function addDemoConversation(db: DB) {
  const st = db.students.find((s) => s.groupId === "2p1");
  const teacher = db.teachers.find((t) => t.name.startsWith("Кудинова"));
  if (!st || !teacher) return;
  const now = Date.now();
  const msgs: Message[] = [
    { id: uid("m"), from: st.id, to: teacher.id, text: "Здравствуйте! Можно пересдать самостоятельную по численным методам?", at: now - 86400000 * 2, read: true },
    { id: uid("m"), from: teacher.id, to: st.id, text: "Здравствуйте. Да, приходите в четверг после 4 пары в 201 кабинет", at: now - 86400000 * 2 + 3600000, read: false },
    { id: uid("m"), from: st.parentId, to: teacher.id, text: "Добрый день! Подскажите, как успехи по математике?", at: now - 3600000 * 5, read: false },
  ];
  db.messages.push(...msgs);
  const n = (userId: ID, kind: Notification["kind"], title: string, text: string, href: string, at: number): Notification => ({ id: uid("n"), userId, kind, title, text, at, read: false, href });
  db.notifications.push(
    n(st.id, "message", "Новое сообщение", `${teacher.name}: Да, приходите в четверг после 4 пары`, "/messages/", now - 86400000 * 2 + 3600000),
    n(teacher.id, "message", "Новое сообщение", "Родитель студента группы 2П1 написал вам", "/messages/", now - 3600000 * 5),
  );
  for (const s of db.students.filter((x) => x.groupId === "2p1")) {
    db.notifications.push(n(s.id, "announcement", "Объявление администрации", "С 10 ноября открыта запись на дополнительные консультации перед сессией", "/notifications/", now - 86400000));
  }
}

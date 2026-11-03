import raw from "@/data/groups.json";
import type {
  Attendance, AttendanceStatus, Grade, GradeValue, Group, Homework, ID, ISODate, Load, Message,
  Notification, Parent, ScheduleSlot, Student, Subject, Teacher,
} from "./types";
import { addDays, dateRange, today, weekday, WEEKDAYS, academicYear } from "./dates";
import { hash, pick, rng } from "./rng";
import { FATHER, FEMALE, MALE, MOTHER, SURNAMES, feminine, patronymic, translit } from "./names";

/** Полная «база данных» демо-версии */
export interface DB {
  groups: Group[];
  students: Student[];
  parents: Parent[];
  teachers: Teacher[];
  subjects: Subject[];
  schedule: ScheduleSlot[];
  loads: Load[];
  grades: Record<string, Grade>; // ключ: studentId|subjectId|date
  attendance: Record<string, Attendance>; // тот же ключ, отдельная таблица
  homework: Homework[];
  homeworkDone: Record<string, true>; // hwId|studentId
  messages: Message[];
  notifications: Notification[];
}

export const STUDENTS_PER_GROUP = 12;
export const GROUP_CAPACITY = 34; // план на полный набор групп колледжа

export const SPECIALTIES: Record<string, string> = {
  П: "Информационные системы и программирование",
  Б: "Экономика и бухгалтерский учёт",
  БД: "Банковское дело",
  Ю: "Право и организация социального обеспечения",
  Л: "Операционная деятельность в логистике",
  Н: "Налоги и налогообложение",
};

const NON_GRADED = [/^Час куратора$/, /^День самостоятельной работы$/, /^Разговоры о важном$/];

export const key = (studentId: ID, subjectId: ID, date: ISODate) => `${studentId}|${subjectId}|${date}`;

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

  for (const [gid, g] of Object.entries(data)) {
    const code = g.groupName.replace("-", "");
    const course = Number(code[0]) as Group["course"];
    const specialty = code.slice(1).replace(/\d+$/, "");
    groups.push({ id: gid, code, course, specialty });
    WEEKDAYS.forEach((dayName, i) => {
      for (const l of g.schedule[dayName] ?? []) {
        if (!l.subject || l.subject.trim() === "—" || !l.teacher) continue;
        const s = subjectOf(l.subject);
        const t = teacherOf(l.teacher);
        schedule.push({ groupId: gid, weekday: i + 1, slot: l.slot, subjectId: s.id, teacherId: t.id, room: l.room === "—" ? "" : l.room });
        loadSet.set(`${t.id}|${s.id}|${gid}`, { teacherId: t.id, subjectId: s.id, groupId: gid });
        if (s.name === "Час куратора") groups[groups.length - 1].curatorId = t.id;
      }
    });
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
  const TASKS = [
    "Конспект темы и ответы на контрольные вопросы",
    "Решить задачи из практикума, вариант по номеру в журнале",
    "Подготовить доклад на 5 минут",
    "Выполнить практическую работу и загрузить отчёт",
    "Повторить материал к самостоятельной работе",
  ];
  const homework: Homework[] = [];
  for (const l of loadSet.values()) {
    if (!subjById.get(l.subjectId)!.graded) continue;
    const r = rng(hash("hw" + l.groupId + l.subjectId));
    const issued = addDays(now, -Math.floor(r() * 6) - 1);
    homework.push({ id: "hw_" + hash(l.groupId + l.subjectId).toString(36), ...l, issued, due: addDays(issued, 7), text: /физ/i.test(subjById.get(l.subjectId)!.name) ? "Подготовиться к сдаче нормативов: бег 100 м и пресс" : pick(r, TASKS) });
  }

  return {
    groups, students, parents,
    teachers: [...teachersByName.values()].sort((a, b) => a.name.localeCompare(b.name, "ru")),
    subjects: [...subjects.values()].sort((a, b) => a.name.localeCompare(b.name, "ru")),
    schedule, loads: [...loadSet.values()], grades, attendance, homework,
    homeworkDone: {}, messages: [], notifications: [],
  };
}

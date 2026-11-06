-- Замены в расписании: отмены и подстановки на конкретную дату.
-- kind: 'cancel' = пара отменена, 'substitute' = другой преподаватель или аудитория.
CREATE TABLE IF NOT EXISTS schedule_changes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  date        TEXT    NOT NULL,              -- YYYY-MM-DD
  group_id    TEXT    NOT NULL,
  slot        INTEGER NOT NULL,              -- номер пары 1-8
  kind        TEXT    NOT NULL DEFAULT 'cancel', -- 'cancel' | 'substitute'
  new_teacher_id TEXT,                       -- NULL = оставить прежнего
  new_room    TEXT,                          -- NULL = оставить прежнюю
  note        TEXT,                          -- произвольный комментарий (причина)
  created_at  INTEGER NOT NULL,
  UNIQUE(date, group_id, slot)
);

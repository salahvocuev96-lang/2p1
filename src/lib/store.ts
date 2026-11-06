"use client";
// Клиентское состояние. Браузер хранит только снимок данных, который сервер разрешил этому пользователю,
// и отправляет действия на /api/action. Все проверки прав выполняет сервер.
import { useSyncExternalStore } from "react";
import type { Snapshot } from "./db-types";
import { DEFAULT_SETTINGS } from "./db-types";
import type { AttendanceStatus, GradeValue, ID, ISODate, SessionUser } from "./types";

export type Result = { ok: true; info?: string; data?: unknown } | { ok: false; error: string };

const EMPTY: Snapshot = {
  groups: [], students: [], parents: [], teachers: [], staff: [], subjects: [], schedule: [], loads: [],
  grades: {}, attendance: {}, homework: [], homeworkProgress: {}, messages: [], notifications: [],
  settings: DEFAULT_SETTINGS, groupStats: [], audit: [], serverToday: "", userPhotos: {}, scheduleChanges: [],
};

let snapshot: Snapshot = EMPTY;
let session: SessionUser | null = null;
let status: "idle" | "loading" | "ready" = "idle";
let version = 0;
let pending = 0;
const listeners = new Set<() => void>();

function emit() {
  version++;
  listeners.forEach((l) => l());
}

function apply(data: { user?: SessionUser | null; snapshot?: Snapshot | null }) {
  if (data.user !== undefined) session = data.user;
  if (data.snapshot) snapshot = data.snapshot;
  if (data.user === null) snapshot = EMPTY;
  status = "ready";
  emit();
}

async function request(url: string, body?: unknown): Promise<{ status: number; data: Record<string, unknown> }> {
  try {
    // В проекте включён trailingSlash: без слэша сервер отвечает лишней переадресацией
    if (!url.includes("?") && !url.endsWith("/")) url += "/";
    const res = await fetch(url, {
      method: body === undefined ? "GET" : "POST",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: "same-origin",
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { status: res.status, data };
  } catch {
    return { status: 0, data: { error: "Нет связи с сервером. Проверьте подключение" } };
  }
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useStore() {
  useSyncExternalStore(subscribe, () => version, () => -1);
  return { db: snapshot, session, version, status, busy: pending > 0 };
}

// ---------- Сессия ----------

export async function loadSession() {
  if (status === "loading") return;
  status = "loading";
  emit();
  const r = await request("/api/session");
  apply({ user: (r.data.user as SessionUser) ?? null, snapshot: r.data.snapshot as Snapshot | null });
}

async function authCall(url: string, body: unknown): Promise<Result> {
  const r = await request(url, body);
  if (r.status !== 200) return { ok: false, error: String(r.data.error ?? "Ошибка входа") };
  apply({ user: r.data.user as SessionUser, snapshot: r.data.snapshot as Snapshot | null });
  return { ok: true };
}

export const login = (loginName: string, password: string) => authCall("/api/auth/login", { login: loginName, password });
export const demoLogin = (loginName: string) => authCall("/api/auth/demo", { login: loginName });
export const changePassword = (current: string, next: string) => authCall("/api/auth/password", { current, next });

export async function requestPasswordReset(loginName: string): Promise<Result> {
  const r = await request("/api/auth/recover", { login: loginName });
  return r.status === 200 ? { ok: true, info: String(r.data.info) } : { ok: false, error: String(r.data.error ?? "Ошибка") };
}

export async function logout() {
  await request("/api/auth/logout", {});
  apply({ user: null });
}

export async function resetDemo(): Promise<Result> {
  const r = await request("/api/demo-reset", {});
  if (r.status !== 200) return { ok: false, error: String(r.data.error ?? "Ошибка") };
  apply({ user: null });
  return { ok: true };
}

/** Данные, которые не входят в снимок (учётные записи, состояние системы) */
export async function fetchJson<T>(url: string): Promise<T | null> {
  const r = await request(url);
  return r.status === 200 ? (r.data as unknown as T) : null;
}

// ---------- Действия ----------

export async function act(type: string, payload: unknown = {}): Promise<Result> {
  pending++;
  emit();
  const r = await request("/api/action", { type, payload });
  pending--;
  if (r.status === 401) {
    apply({ user: null });
    return { ok: false, error: "Сессия истекла, войдите снова" };
  }
  if (r.data.snapshot) apply({ snapshot: r.data.snapshot as Snapshot });
  else emit();
  return (r.data.result as Result) ?? { ok: false, error: String(r.data.error ?? "Ошибка сервера") };
}

export const setGrade = (studentId: ID, subjectId: ID, date: ISODate, value: GradeValue | null, reason?: string) =>
  act("journal.setGrade", { studentId, subjectId, date, value, reason });
export const setAttendance = (studentId: ID, subjectId: ID, date: ISODate, status: AttendanceStatus) =>
  act("journal.setAttendance", { studentId, subjectId, date, status });
export const sendMessage = (to: ID, text: string) => act("message.send", { to, text });
export const markThreadRead = (otherId: ID) => act("message.markRead", { otherId });
export const markNotificationsRead = (id?: ID) => act("notifications.markRead", { id });

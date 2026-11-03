"use client";
import { RoleView } from "@/components/RoleView";
import { Schedule } from "@/features/shared/Schedule";

export default function Page() {
  return <RoleView views={{ student: Schedule, parent: Schedule, teacher: Schedule, admin: Schedule }} />;
}

"use client";
import { RoleView } from "@/components/RoleView";
import { ScheduleChanges } from "@/features/admin/ScheduleChanges";

export default function Page() {
  return <RoleView views={{ college_admin: ScheduleChanges }} />;
}

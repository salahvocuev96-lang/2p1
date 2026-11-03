"use client";
import { RoleView } from "@/components/RoleView";
import { AdminTeachers } from "@/features/admin/Admin";

export default function Page() {
  return <RoleView views={{ admin: AdminTeachers }} />;
}

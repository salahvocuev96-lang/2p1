"use client";
import { RoleView } from "@/components/RoleView";
import { AdminStudents } from "@/features/admin/Admin";

export default function Page() {
  return <RoleView views={{ admin: AdminStudents }} />;
}

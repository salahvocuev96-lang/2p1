"use client";
import { RoleView } from "@/components/RoleView";
import { TeacherSubjects } from "@/features/teacher/Subjects";
import { AdminSubjects } from "@/features/admin/Admin";

export default function Page() {
  return <RoleView views={{ teacher: TeacherSubjects, admin: AdminSubjects }} />;
}

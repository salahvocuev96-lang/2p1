"use client";
import { RoleView } from "@/components/RoleView";
import { StudentHome } from "@/features/student/StudentHome";
import { TeacherHome } from "@/features/teacher/TeacherHome";
import { AdminHome } from "@/features/admin/Admin";

export default function Page() {
  return <RoleView views={{ student: StudentHome, parent: StudentHome, teacher: TeacherHome, admin: AdminHome }} />;
}

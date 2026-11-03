"use client";
import { RoleView } from "@/components/RoleView";
import { StudentHomework } from "@/features/student/Homework";
import { TeacherHomework } from "@/features/teacher/TeacherHomework";

export default function Page() {
  return <RoleView views={{ student: StudentHomework, parent: StudentHomework, teacher: TeacherHomework }} />;
}

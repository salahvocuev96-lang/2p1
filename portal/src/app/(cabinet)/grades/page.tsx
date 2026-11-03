"use client";
import { RoleView } from "@/components/RoleView";
import { StudentGrades } from "@/features/student/Grades";

export default function Page() {
  return <RoleView views={{ student: StudentGrades, parent: StudentGrades }} />;
}

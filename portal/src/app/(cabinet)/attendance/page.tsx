"use client";
import { RoleView } from "@/components/RoleView";
import { StudentAttendance } from "@/features/student/Attendance";
import { TeacherAttendance } from "@/features/teacher/TeacherAttendance";

export default function Page() {
  return <RoleView views={{ student: StudentAttendance, parent: StudentAttendance, teacher: TeacherAttendance }} />;
}

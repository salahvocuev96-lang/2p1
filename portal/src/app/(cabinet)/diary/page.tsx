"use client";
import { RoleView } from "@/components/RoleView";
import { Diary } from "@/features/student/Diary";

export default function Page() {
  return <RoleView views={{ student: Diary, parent: Diary }} />;
}

"use client";
import { RoleView } from "@/components/RoleView";
import { Journal } from "@/features/teacher/Journal";

export default function Page() {
  return <RoleView views={{ teacher: Journal }} />;
}

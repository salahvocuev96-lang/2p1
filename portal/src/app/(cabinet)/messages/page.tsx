"use client";
import { RoleView } from "@/components/RoleView";
import { Messages } from "@/features/shared/Messages";

export default function Page() {
  return <RoleView views={{ student: Messages, parent: Messages, teacher: Messages, admin: Messages }} />;
}

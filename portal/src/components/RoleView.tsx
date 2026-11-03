"use client";
// Страница раздела показывает свой компонент для каждой роли; чужой роли раздел недоступен.
import type { ComponentType } from "react";
import { useStore } from "@/lib/store";
import type { Role } from "@/lib/types";
import { Card, Empty } from "./ui";

export function RoleView({ views }: { views: Partial<Record<Role, ComponentType>> }) {
  const { session } = useStore();
  if (!session) return null;
  const View = views[session.role];
  if (!View)
    return (
      <Card>
        <Empty icon="shield" title="Раздел недоступен" text="У вашей роли нет доступа к этому разделу" />
      </Card>
    );
  return <View />;
}

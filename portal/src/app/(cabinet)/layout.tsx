import { AppShell } from "@/components/AppShell";
import { ClientOnly } from "@/components/ClientOnly";

export default function CabinetLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClientOnly>
      <AppShell>{children}</AppShell>
    </ClientOnly>
  );
}

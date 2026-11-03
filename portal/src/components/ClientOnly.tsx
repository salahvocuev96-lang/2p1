"use client";
import { useEffect, useState, type ReactNode } from "react";

/** Данные живут в LocalStorage браузера, поэтому рендерим только на клиенте */
export function ClientOnly({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
  }, []);
  if (!ready)
    return (
      <div className="grid min-h-dvh place-items-center">
        <div className="size-8 animate-spin rounded-full border-[3px] border-brand-100 border-t-gold-500" />
      </div>
    );
  return <>{children}</>;
}

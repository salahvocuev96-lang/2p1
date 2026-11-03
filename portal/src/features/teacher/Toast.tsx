"use client";
import { useEffect } from "react";
import { cx } from "@/components/ui";

export function Toast({ msg, tone, onClose }: { msg: string; tone: "ok" | "err"; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 2800);
    return () => clearTimeout(t);
  }, [msg, onClose]);
  return (
    <div className={cx("fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-xl px-4 py-2.5 text-sm font-medium shadow-xl lg:bottom-8", tone === "ok" ? "bg-brand-900 text-white" : "bg-rose-600 text-white")}>
      {msg}
    </div>
  );
}

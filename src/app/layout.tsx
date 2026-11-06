import type { Metadata, Viewport } from "next";
import "@fontsource-variable/golos-text";
import "./globals.css";

export const metadata: Metadata = {
  title: "Электронный дневник · Налоговый колледж",
  description: "Электронный дневник, журнал и расписание Налогового колледжа. Демонстрационная версия",
  icons: { icon: "/crest.jpg" },
};

export const viewport: Viewport = { themeColor: "#0b1d3d", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}

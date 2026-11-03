import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Education Portal · Налоговый колледж",
  description: "Электронный дневник, журнал и расписание Налогового колледжа. Демонстрационная версия",
  icons: { icon: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/crest.jpg` },
};

export const viewport: Viewport = { themeColor: "#0a2540", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}

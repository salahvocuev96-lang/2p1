import type { NextConfig } from "next";

// Статический экспорт: демо можно открыть с любого хостинга (GitHub Pages, Netlify) без сервера.
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;

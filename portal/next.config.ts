import type { NextConfig } from "next";

// Статический экспорт: демо можно открыть с любого хостинга (GitHub Pages, Netlify) без сервера.
// BASE_PATH задаётся при сборке для GitHub Pages (сайт живёт в подпапке /2p1/app)
const basePath = process.env.BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;

import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site-config";

// Пока каталог не построен, sitemap отдаёт только главную. С появлением
// схемы каталога сюда вернётся генерация из БД (города/категории/позиции),
// поэтому force-dynamic оставлен: без него Next prerender'ит во время build.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url;
  return [
    { url: `${base}/`, changeFrequency: "daily", priority: 1.0 },
  ];
}

import type { NextConfig } from "next";

type Pattern = NonNullable<NonNullable<NextConfig["images"]>["remotePatterns"]>[number];

// Аватарки OAuth-провайдеров. Это не пользовательский контент —
// домены фиксированы для всего жизненного цикла приложения.
const oauthAvatarHosts: Pattern[] = [
  { protocol: "https", hostname: "avatars.yandex.net" },
  { protocol: "https", hostname: "sun*.userapi.com" },
  { protocol: "https", hostname: "*.vk.com" },
];

const storagePublic = process.env.STORAGE_PUBLIC_BASE;
const remotePatterns: Pattern[] = [...oauthAvatarHosts];

if (storagePublic) {
  try {
    const u = new URL(storagePublic);
    remotePatterns.push({
      protocol: u.protocol.replace(":", "") as "https" | "http",
      hostname: u.hostname,
    });
  } catch {
    // Игнорим невалидный STORAGE_PUBLIC_BASE — getEnv() в рантайме поймает.
  }
}

const config: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  typedRoutes: true,
  images: {
    remotePatterns,
    // Next 16 по умолчанию запрещает оптимизировать картинки с приватных
    // адресов — это защита от SSRF. Локальная разработка держит файлы в MinIO
    // на localhost:9000 (см. docs/testing.md), и без послабления там все фото
    // отдают 400.
    //
    // Условие именно на development, а не «не прод»: `next build` сам ставит
    // NODE_ENV=production и запекает это значение в сборку. То есть послабление
    // живёт только под `next dev`; локальная прод-сборка покажет битые фото —
    // так и задумано, ослаблять её ради удобства нельзя.
    dangerouslyAllowLocalIP: process.env.NODE_ENV === "development",
  },
};

export default config;

import type { NextConfig } from "next";
// Адреса этой машины в локальной сети — по ним с телефона и открывают dev.
// Правило вынесено в общий модуль: те же адреса нужны процессу realtime для
// allow-list Origin, а импортировать этот конфиг оттуда нельзя.
import { lanAddresses } from "./src/lib/net/lan-addresses";

function extraDevOrigins(): string[] {
  return (process.env.DEV_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

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
  // Dev-сервер отдаёт свои ресурсы (чанки, HMR) только тому origin, с которого
  // сам поднят, — по умолчанию localhost. Телефон в той же сети открывает сайт
  // по адресу машины вида 192.168.x.x, и чанки ему блокируются: разметка
  // приезжает, а гидратация не проходит. Снаружи это выглядит не как ошибка, а
  // как «тормозит и не открываются шторки» — интерактива просто нет.
  //
  // Адреса берутся у самих сетевых интерфейсов, а не пишутся руками: они
  // меняются при переезде между сетями, и захардкоженный IP молча перестал бы
  // работать. DEV_ORIGINS добавляет к ним произвольные хосты через запятую —
  // например, адрес туннеля.
  //
  // Поле действует только под `next dev`; в production-сборке Next его не
  // смотрит, поэтому послаблением для прода это не является.
  allowedDevOrigins: [...lanAddresses(), ...extraDevOrigins()],
};

export default config;

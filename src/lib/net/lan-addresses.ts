// Адреса этой машины в локальной сети. Нужны в двух местах: next.config.ts
// разрешает по ним dev-origin'ы (с телефона сайт открывают по 192.168.x.x), а
// процессу realtime они нужны для allow-list Origin у сокета.
//
// Импортировать next.config.ts из отдельного процесса нельзя — это завело бы
// зависимость на Next. Поэтому правило живёт здесь.

import { networkInterfaces } from "node:os";

export function lanAddresses(): string[] {
  return Object.values(networkInterfaces())
    .flatMap((list) => list ?? [])
    .filter((n) => n.family === "IPv4" && !n.internal)
    .map((n) => n.address);
}

// Браузер шлёт Origin со схемой и портом, а lanAddresses() отдаёт голые IP:
// сравнивать их напрямую нельзя, сокет с телефона был бы отвергнут.
export function devOrigins(addresses: readonly string[], port: number): string[] {
  return [
    `http://localhost:${port}`,
    `http://127.0.0.1:${port}`,
    ...addresses.map((ip) => `http://${ip}:${port}`),
  ];
}

// Замер стоимости соединения. Открывает сокеты ступенями и снимает память
// изнутри процесса через /health. Считает цену одного соединения — по ней
// видно, линейно ли растёт расход.

import WebSocket from "ws";

const BASE = `http://127.0.0.1:${process.env.REALTIME_PORT ?? 3100}`;
const STEPS = [0, 200, 500, 1000, 2000];

type Stats = { connections: number; rssMb: number; heapUsedMb: number; externalMb: number };

async function stats(): Promise<Stats> {
  const r = await fetch(`${BASE}/health`);
  return r.json() as Promise<Stats>;
}

function open(): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${BASE.replace("http", "ws")}/ws`);
    ws.once("open", () => resolve(ws));
    ws.once("error", reject);
  });
}

const sockets: WebSocket[] = [];
let idle = 0;

console.log("соединений |  RSS МБ | heap МБ | external МБ | на соединение КБ");
for (const target of STEPS) {
  while (sockets.length < target) {
    // Пачками: тысяча одновременных рукопожатий упрётся в лимит дескрипторов
    // раньше, чем в память, и замер сорвётся не там, где интересно.
    const batch = Math.min(50, target - sockets.length);
    sockets.push(...await Promise.all(Array.from({ length: batch }, open)));
  }
  // Пауза, чтобы осел GC: без неё замер ловит пик аллокаций, а не рабочий уровень.
  await new Promise((r) => setTimeout(r, 3000));
  const s = await stats();
  if (target === 0) idle = s.rssMb;
  const per = target ? ((s.rssMb - idle) * 1024) / target : 0;
  console.log(
    `${String(s.connections).padStart(10)} | ${String(s.rssMb).padStart(7)} |`
    + ` ${String(s.heapUsedMb).padStart(7)} | ${String(s.externalMb).padStart(11)} |`
    + ` ${target ? per.toFixed(1).padStart(16) : "—".padStart(16)}`,
  );
}

for (const ws of sockets) ws.close();
process.exit(0);

// Замер стоимости соединения для процесса realtime.
//
// Первый пилот мерил не то: соединения были анонимные и простаивали, а самого
// сервера — с реестром, LISTEN и пер-сокетным состоянием — ещё не существовало.
// Здесь всё иначе:
// - подключения НАСТОЯЩИЕ: сессия в базе, cookie, допустимый Origin;
// - соединений на пользователя не больше, чем позволяет сам сервер, поэтому
//   сеются сотни пользователей — это и ближе к жизни, чем одна вкладка ×2000;
// - идёт веерный трафик через pg_notify, то есть рабочий режим, а не тишина;
// - память снимается изнутри процесса и снаружи, из cgroup: mem_limit считает
//   не RSS, а ещё и сокетные буферы ядра, и разница тут значимая.
//
// Запускать против контейнера (Linux, cgroup), а не против node на macOS.

import { Client } from "pg";
import WebSocket from "ws";

const DB = process.env.MEASURE_DATABASE_URL ?? process.env.DATABASE_URL!;
const BASE = process.env.MEASURE_BASE ?? "http://127.0.0.1:3100";
const ORIGIN = process.env.MEASURE_ORIGIN ?? "http://localhost:3000";
const CONTAINER = process.env.MEASURE_CONTAINER ?? "";
const STEPS = [0, 200, 500, 1000, 2000];
const PER_USER = 8;
const BATCH = 50;

const db = new Client({ connectionString: DB });
const sockets: WebSocket[] = [];
const tokens: string[] = [];
let seededUsers: string[] = [];

type Health = { connections: number; users: number; rssMb: number };

async function health(): Promise<Health> {
  const r = await fetch(`${BASE}/health`);
  return r.json() as Promise<Health>;
}

// cgroup v2 внутри контейнера. Это то, во что упирается mem_limit, и оно больше
// RSS: сокетные буферы ядра process.memoryUsage() не видит.
async function cgroupMb(): Promise<number | null> {
  if (!CONTAINER) return null;
  const { execFile } = await import("node:child_process");
  return new Promise((resolve) => {
    execFile("docker", ["exec", CONTAINER, "cat", "/sys/fs/cgroup/memory.current"],
      (err, stdout) => resolve(err ? null : +(Number(stdout.trim()) / 1024 / 1024).toFixed(1)));
  });
}

async function seed(count: number): Promise<void> {
  const users = Math.ceil(count / PER_USER);
  for (let i = 0; i < users; i += 1) {
    const id = `measure_u_${i}`;
    await db.query(
      `insert into users (id, email) values ($1, $2) on conflict (id) do nothing`,
      [id, `measure_${i}@example.invalid`],
    );
    seededUsers.push(id);
    for (let j = 0; j < PER_USER; j += 1) {
      const token = `measure_t_${i}_${j}`;
      await db.query(
        `insert into sessions (session_token, user_id, expires)
         values ($1, $2, now() + interval '1 day') on conflict do nothing`,
        [token, id],
      );
      tokens.push(token);
    }
  }
}

function open(token: string, index: number): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${BASE.replace("http", "ws")}/ws`, {
      headers: {
        origin: ORIGIN,
        cookie: `authjs.session-token=${token}`,
        // То же, что дописывает Caddy. Без этого все соединения приходят с
        // одного адреса и упираются в лимит на IP — то есть замер проверял бы
        // лимит, а не память. Разные адреса заодно подтверждают, что правило
        // «последний элемент X-Forwarded-For» на сервере действительно работает.
        "x-forwarded-for": `203.0.113.1, 10.${(index >> 16) & 255}.${(index >> 8) & 255}.${index & 255}`,
      },
    });
    ws.once("open", () => resolve(ws));
    ws.once("error", reject);
  });
}

// Веер: одно событие уходит во все сокеты получателя. Именно он и есть рабочий
// режим, которого в первом пилоте не было вовсе.
async function fanout(rounds: number): Promise<void> {
  for (let i = 0; i < rounds; i += 1) {
    const userId = seededUsers[i % seededUsers.length];
    const payload = JSON.stringify({
      kind: "chat_message",
      threadId: `t_measure_${i}`,
      messageId: `m_measure_${i}`,
      recipients: [userId],
      countFor: userId,
    });
    await db.query("select pg_notify('inrenta_realtime', $1)", [payload]);
  }
}

async function cleanup(): Promise<void> {
  await db.query("delete from sessions where session_token like 'measure_t_%'");
  await db.query("delete from users where id like 'measure_u_%'");
}

async function main(): Promise<void> {
  await db.connect();
  await cleanup();
  await seed(STEPS[STEPS.length - 1]);

  console.log("соединений |  RSS МБ | cgroup МБ | на соединение КБ");
  let idle = 0;

  for (const target of STEPS) {
    while (sockets.length < target) {
      // Пачками: тысяча одновременных рукопожатий упрётся в лимит дескрипторов
      // раньше, чем в память, и замер сорвётся не там, где интересно.
      const size = Math.min(BATCH, target - sockets.length);
      const slice = tokens.slice(sockets.length, sockets.length + size);
      sockets.push(...await Promise.all(
        slice.map((t, k) => open(t, sockets.length + k)),
      ));
    }
    if (target > 0) await fanout(Math.min(target, 200));
    // Пауза, чтобы осел GC: без неё замер ловит пик аллокаций, а не рабочий
    // уровень. На нулевом шаге она же покрывает пик старта — иначе базовая
    // точка берётся на нём, и вся арифметика уезжает в минус.
    await new Promise((r) => setTimeout(r, target === 0 ? 6000 : 4000));

    const h = await health();
    const cg = await cgroupMb();
    if (target === 0) idle = h.rssMb;
    const per = target ? ((h.rssMb - idle) * 1024) / target : 0;
    console.log(
      `${String(h.connections).padStart(10)} | ${String(h.rssMb).padStart(7)} |`
      + ` ${String(cg ?? "—").padStart(9)} |`
      + ` ${target ? per.toFixed(1).padStart(16) : "—".padStart(16)}`,
    );
  }

  for (const ws of sockets) ws.close();
  await cleanup();
  await db.end();
  process.exit(0);
}

void main();

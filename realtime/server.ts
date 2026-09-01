// Процесс доставки в реальном времени.
//
// Почему он отдельный: кастомный сервер несовместим с output: "standalone"
// (node_modules/next/dist/docs/01-app/02-guides/custom-server.md:14), а
// Web-Request/Response в route handlers не дают доступа к событию upgrade и не
// позволяют вернуть 101.
//
// Фанаут идёт через Postgres LISTEN/NOTIFY: app пишет событие в ту же
// транзакцию, что и данные, поэтому событие не может обогнать то, о чём
// рассказывает. Обратная сторона — NOTIFY не персистентен: всё, что случилось
// в разрыве, потеряно, и после переподключения слушателя клиентам уходит
// широковещательный resync.
//
// Инвариант доступа: реестр ключуется userId ИЗ СЕССИИ. Клиент ключей подписки
// не присылает вообще, поэтому подписаться на чужие события невозможно по
// построению. Тела сообщения событие не несёт — даже неверный список
// получателей содержимого не раскроет.

import { createServer, type IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";
import { Client, Pool } from "pg";
import { WebSocketServer, type WebSocket } from "ws";
import { sessionTokenFromHeader } from "../src/lib/auth/cookie-name";
import { clientIpFromForwardedFor } from "../src/lib/http/client-ip";
import { isAllowedOrigin, sessionVerdict } from "../src/lib/realtime/access";
import {
  CLOSE, REALTIME_CHANNEL, parseNotify, toClientFrame, type ClientFrame,
} from "../src/lib/realtime/events";
import { devOrigins, lanAddresses } from "../src/lib/net/lan-addresses";

// ============================== Окружение ==============================
// Свой узкий парсер, а не src/lib/env.ts: тот тянет zod и всю прод-схему, а
// REALTIME_PORT в ней нет вовсе. NEXTAUTH_URL читается именно этот — от него
// зависят и префикс cookie, и allow-list Origin, и своё имя переменной развело
// бы поведение дева и прода молча.
function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`realtime: переменная ${name} не задана`);
    process.exit(1);
  }
  return v;
}

const DATABASE_URL = required("DATABASE_URL");
const NEXTAUTH_URL = required("NEXTAUTH_URL");
const PORT = Number(process.env.REALTIME_PORT ?? 3100);
const IS_DEV = process.env.NODE_ENV !== "production";

// В деве сайт открывают с телефона по 192.168.x.x — те же адреса, что разрешает
// allowedDevOrigins в next.config.ts. Порт нужен обязательно: браузер шлёт
// Origin со схемой и портом, а lanAddresses() отдаёт голые IP.
//
// DEV_ORIGINS — та же переменная, что уже читает next.config.ts. Нужна, когда
// процесс запущен в контейнере: изнутри него networkInterfaces() показывает
// адреса docker-моста, а не сети, в которой стоит телефон, и проверка с
// телефона молча провалилась бы по Origin.
const ALLOWED_ORIGINS = IS_DEV
  ? [
    ...devOrigins(lanAddresses(), Number(process.env.PORT ?? 3000)),
    ...(process.env.DEV_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean),
  ]
  : [NEXTAUTH_URL.replace(/\/$/, "")];

// ============================== Пределы ==============================
const TTL_BASE_MS = 15 * 60 * 1000;
// Джиттер обязателен: без него все вкладки, подключившиеся разом после
// рестарта, разом же отвалятся через 15 минут и разом переподключатся — и так
// по кругу, с саморазогревом.
const TTL_JITTER = 0.2;
const HEARTBEAT_MS = 30_000;
const MAX_PER_USER = 8;
const MAX_PER_IP = 40;
const MAX_PAYLOAD = 4 * 1024;
// Возраст последнего успешного пинга LISTEN, после которого healthcheck врёт.
const LISTEN_STALE_MS = 60_000;
const LISTEN_PING_MS = 15_000;
const LISTEN_MAX_RETRIES = 10;

// ============================== Реестр ==============================
// Несколько вкладок одного человека — норма, отсюда Set.
const registry = new Map<string, Set<WebSocket>>();
const ipCounts = new Map<string, number>();
const socketMeta = new WeakMap<WebSocket, { userId: string; ip: string; alive: boolean }>();

function register(socket: WebSocket, userId: string, ip: string): void {
  let set = registry.get(userId);
  if (!set) registry.set(userId, (set = new Set()));
  set.add(socket);
  ipCounts.set(ip, (ipCounts.get(ip) ?? 0) + 1);
  socketMeta.set(socket, { userId, ip, alive: true });
}

function unregister(socket: WebSocket): void {
  const meta = socketMeta.get(socket);
  if (!meta) return;
  const set = registry.get(meta.userId);
  if (set) {
    set.delete(socket);
    if (set.size === 0) registry.delete(meta.userId);
  }
  const left = (ipCounts.get(meta.ip) ?? 1) - 1;
  if (left <= 0) ipCounts.delete(meta.ip);
  else ipCounts.set(meta.ip, left);
  socketMeta.delete(socket);
}

function send(socket: WebSocket, frame: ClientFrame): void {
  if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(frame));
}

function sendToUser(userId: string, frame: ClientFrame): void {
  const set = registry.get(userId);
  if (!set) return;             // Штатная ветка: человек не подключён.
  for (const socket of set) send(socket, frame);
}

function broadcast(frame: ClientFrame): void {
  for (const set of registry.values()) for (const socket of set) send(socket, frame);
}

// ============================== База ==============================
// Пул узкий: единственный запрос — проверка сессии на подключении.
const pool = new Pool({ connectionString: DATABASE_URL, max: 4 });

type SessionLookup = { userId: string; expires: Date; bannedAt: Date | null } | null;

async function lookupSession(token: string): Promise<SessionLookup> {
  const { rows } = await pool.query<{ user_id: string; expires: Date; banned_at: Date | null }>(
    `select s.user_id, s.expires, u.banned_at
       from sessions s
       join users u on u.id = s.user_id
      where s.session_token = $1
      limit 1`,
    [token],
  );
  const row = rows[0];
  return row ? { userId: row.user_id, expires: row.expires, bannedAt: row.banned_at } : null;
}

// ============================== Аутентификация ==============================
type Rejection = { code: number; status: number; reason: string };

async function authenticate(req: IncomingMessage): Promise<
  { ok: true; userId: string; ip: string } | { ok: false } & Rejection
> {
  // WebSocket не подчиняется CORS, и SameSite=lax этого не заменяет.
  // Отсутствующий Origin отвергается явно — non-browser клиенты его не шлют.
  if (!isAllowedOrigin(req.headers.origin, ALLOWED_ORIGINS)) {
    return { ok: false, code: CLOSE.origin, status: 403, reason: "origin" };
  }

  // X-Forwarded-For принимается на веру намеренно: порт сервиса наружу не
  // публикуется, дотянуться до него может только Caddy из внутренней сети
  // compose. Опубликуй порт — и лимит на IP обойдётся одной строкой заголовка.
  const ip = clientIpFromForwardedFor(
    Array.isArray(req.headers["x-forwarded-for"])
      ? req.headers["x-forwarded-for"].join(",")
      : req.headers["x-forwarded-for"],
  );
  if ((ipCounts.get(ip) ?? 0) >= MAX_PER_IP) {
    return { ok: false, code: CLOSE.tooMany, status: 429, reason: "ip" };
  }

  const token = sessionTokenFromHeader(req.headers.cookie, NEXTAUTH_URL);
  if (!token) return { ok: false, code: CLOSE.unauthorized, status: 401, reason: "no_cookie" };

  let row: SessionLookup;
  try {
    row = await lookupSession(token);
  } catch (e) {
    console.error("realtime: сессию прочитать не удалось", e);
    return { ok: false, code: CLOSE.tooMany, status: 503, reason: "db" };
  }

  const verdict = sessionVerdict(row, new Date());
  if (!verdict.ok) {
    const code = verdict.reason === "banned" ? CLOSE.banned : CLOSE.unauthorized;
    return { ok: false, code, status: 401, reason: verdict.reason };
  }

  if ((registry.get(verdict.userId)?.size ?? 0) >= MAX_PER_USER) {
    return { ok: false, code: CLOSE.tooMany, status: 429, reason: "user" };
  }
  return { ok: true, userId: verdict.userId, ip };
}

// ============================== Сервер ==============================
let listenHealthyAt = Date.now();

const http = createServer((req, res) => {
  if (req.url !== "/health") {
    res.writeHead(404).end();
    return;
  }
  // Смотрим на возраст последнего успешного пинга LISTEN, а не на факт жизни
  // процесса: классический отказ — half-open TCP, когда порт отвечает, а
  // слушатель мёртв.
  const stale = Date.now() - listenHealthyAt > LISTEN_STALE_MS;
  const m = process.memoryUsage();
  res.writeHead(stale ? 503 : 200, { "content-type": "application/json" });
  res.end(JSON.stringify({
    ok: !stale,
    connections: socketCount(),
    users: registry.size,
    rssMb: +(m.rss / 1024 / 1024).toFixed(1),
  }));
});

function socketCount(): number {
  let n = 0;
  for (const set of registry.values()) n += set.size;
  return n;
}

// noServer, а не { server }: апгрейд обрабатывается вручную, иначе отказ нельзя
// отдать внятным HTTP-статусом — соединение просто рвалось бы.
const wss = new WebSocketServer({
  noServer: true,
  // Явно, хотя у сервера ws это и так дефолт: perMessageDeflate держал бы
  // zlib-контекст на каждое соединение.
  perMessageDeflate: false,
  maxPayload: MAX_PAYLOAD,
});

http.on("upgrade", (req: IncomingMessage, socket: Duplex, head: Buffer) => {
  if (new URL(req.url ?? "/", "http://localhost").pathname !== "/ws") {
    socket.destroy();
    return;
  }
  void authenticate(req).then((auth) => {
    if (!auth.ok) {
      socket.write(`HTTP/1.1 ${auth.status} ${auth.reason}\r\nConnection: close\r\n\r\n`);
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      accept(ws, auth.userId, auth.ip);
    });
  }).catch((e) => {
    console.error("realtime: апгрейд не состоялся", e);
    socket.destroy();
  });
});

function accept(socket: WebSocket, userId: string, ip: string): void {
  register(socket, userId, ip);

  // TTL с разбросом. Нужен потому, что выход из аккаунта и сброс пароля удаляют
  // строку сессии, а сокет иначе пушил бы до закрытия вкладки — при TTL сессии
  // в тридцать дней.
  const ttl = TTL_BASE_MS * (1 + (Math.random() * 2 - 1) * TTL_JITTER);
  const ttlTimer = setTimeout(() => socket.close(CLOSE.ttl, "ttl"), ttl);

  socket.on("pong", () => {
    const meta = socketMeta.get(socket);
    if (meta) meta.alive = true;
  });
  // Клиент прикладных сообщений не шлёт вообще: heartbeat идёт ws-фреймами.
  // Всё пришедшее игнорируем — на этом и держится смысл maxPayload.
  socket.on("message", () => {});
  socket.on("error", () => socket.terminate());
  socket.on("close", () => {
    clearTimeout(ttlTimer);
    unregister(socket);
  });
}

// Полумёртвые сокеты (iOS замораживает вкладку, close приходит с задержкой или
// не приходит вовсе) иначе копятся в реестре и едят бюджет памяти.
setInterval(() => {
  for (const set of registry.values()) {
    for (const socket of set) {
      const meta = socketMeta.get(socket);
      if (!meta) continue;
      if (!meta.alive) { socket.terminate(); continue; }
      meta.alive = false;
      socket.ping();
    }
  }
}, HEARTBEAT_MS).unref();

// ============================== LISTEN ==============================
let listener: Client | null = null;
let listenRetries = 0;

async function startListening(): Promise<void> {
  const client = new Client({ connectionString: DATABASE_URL, keepAlive: true });
  client.on("error", (e) => {
    console.error("realtime: соединение слушателя оборвалось", e);
    void relisten();
  });
  client.on("notification", (msg) => {
    if (!msg.payload) return;
    // Битый payload обязан вернуть null, а не бросить: исключение здесь роняет
    // процесс, а restart: unless-stopped перезапустил бы его в цикл.
    const payload = parseNotify(msg.payload);
    if (!payload) {
      console.error("realtime: payload не разобрался");
      return;
    }
    for (const userId of payload.recipients) {
      sendToUser(userId, toClientFrame(payload, userId));
    }
  });

  await client.connect();
  await client.query(`LISTEN ${REALTIME_CHANNEL}`);
  listener = client;
  listenRetries = 0;
  listenHealthyAt = Date.now();
  console.log(`realtime: слушаю ${REALTIME_CHANNEL}`);
}

async function relisten(): Promise<void> {
  if (listener) {
    const old = listener;
    listener = null;
    old.removeAllListeners();
    await old.end().catch(() => {});
  }
  if (listenRetries >= LISTEN_MAX_RETRIES) {
    // Не healthcheck: compose по проваленному healthcheck контейнер НЕ
    // перезапускает, restart: unless-stopped срабатывает только на выход.
    console.error("realtime: слушатель не восстановился, выхожу");
    process.exit(1);
  }
  const delay = Math.min(30_000, 500 * 2 ** listenRetries);
  listenRetries += 1;
  setTimeout(() => {
    void startListening()
      // Разрыв означает потерю всего, что случилось в нём: NOTIFY не
      // персистентен. Клиенты дочитывают дельту сами — с джиттером на своей
      // стороне, иначе все вкладки ударят в базу одновременно.
      .then(() => broadcast({ type: "resync" }))
      .catch(() => { void relisten(); });
  }, delay);
}

// Собственный пинг по тому же соединению: half-open TCP не обнаруживается ничем
// другим — процесс жив, порт отвечает, а событий больше не приходит.
setInterval(() => {
  if (!listener) return;
  listener.query("select 1")
    .then(() => { listenHealthyAt = Date.now(); })
    .catch(() => { void relisten(); });
}, LISTEN_PING_MS).unref();

http.listen(PORT, () => console.log(`realtime: порт ${PORT}`));
void startListening().catch((e) => {
  console.error("realtime: первый LISTEN не удался", e);
  void relisten();
});

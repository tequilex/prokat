// Вердикт «пускать ли этот сокет». Чистая функция над уже прочитанной строкой
// сессии — базы не знает, поэтому покрывается тестами без живого Postgres. Это
// единственная поверхность, отделяющая чужие события от своих, и оставить её
// непокрытой нельзя.

export type SessionRow = {
  userId: string;
  expires: Date;
  bannedAt: Date | null;
};

export type SessionVerdict =
  | { ok: true; userId: string }
  | { ok: false; reason: "no_session" | "expired" | "banned" };

export function sessionVerdict(row: SessionRow | null, now: Date): SessionVerdict {
  if (!row) return { ok: false, reason: "no_session" };
  // Срок проверяется явно: cookie живёт 30 дней, и протухшая строка иначе
  // держала бы сокет до закрытия вкладки.
  if (row.expires.getTime() <= now.getTime()) return { ok: false, reason: "expired" };
  // adminBanUser ставит бан, но сессии не удаляет — забаненный держит живую
  // cookie.
  if (row.bannedAt !== null) return { ok: false, reason: "banned" };
  return { ok: true, userId: row.userId };
}

// WebSocket не подчиняется CORS, и SameSite=lax его не заменяет. Отсутствующий
// Origin отвергается ЯВНО: non-browser клиенты заголовка не шлют вовсе, и
// привычное `origin && !allowed.has(origin)` пропустило бы их все.
export function isAllowedOrigin(
  origin: string | undefined | null,
  allowed: readonly string[],
): boolean {
  if (!origin) return false;
  return allowed.includes(origin);
}

// Caddy стоит edge'ом и дописывает адрес пира в конец X-Forwarded-For, поэтому
// доверяем последнему элементу. Первый подделывается клиентом — на нём лимиты
// на регистрацию и сброс обходились бы одной строкой заголовка.
//
// Правило вынесено в функцию над голой строкой: процесс realtime получает не
// web-Headers, а http.IncomingMessage с обычным объектом заголовков, и вторая
// реализация того же правила разъехалась бы с этой молча.
export function clientIpFromForwardedFor(xff: string | undefined | null): string {
  if (!xff) return "local";
  const parts = xff.split(",").map((p) => p.trim()).filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : "local";
}

export function clientIp(headers: Headers): string {
  return clientIpFromForwardedFor(headers.get("x-forwarded-for"));
}

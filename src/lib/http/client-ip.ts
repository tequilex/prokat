// Caddy стоит edge'ом и дописывает адрес пира в конец X-Forwarded-For, поэтому
// доверяем последнему элементу. Первый подделывается клиентом — на нём лимиты
// на регистрацию и сброс обходились бы одной строкой заголовка.
export function clientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (!xff) return "local";
  const parts = xff.split(",").map((p) => p.trim()).filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : "local";
}

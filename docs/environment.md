# Переменные окружения

Рабочий шаблон — [`.env.example`](../.env.example): скопировать в `.env` и
запускаться можно как есть. Здесь — что каждая переменная делает, кто её читает
и без чего что ломается.

Валидация живёт в `src/lib/env.ts` (zod). Пустая строка приравнивается к
незаданному значению, поэтому оставлять `KEY=` безопасно.

**Секреты в документацию не попадают.** Реальные значения — только в `.env`
(в `.gitignore`) и в панелях провайдеров.

## Обязательные всегда

| Переменная | Назначение | Кто читает | Проверка |
|---|---|---|---|
| `DATABASE_URL` | строка подключения к Postgres | приложение, миграции, seed | должна начинаться с `postgres://` или `postgresql://` |
| `NEXTAUTH_URL` | публичный адрес сайта | auth, письма, sitemap, canonical, выбор `secure` для cookie | валидный URL |
| `NEXTAUTH_SECRET` | подпись Auth.js | Auth.js | минимум 32 символа |

`NEXTAUTH_URL` влияет больше, чем кажется: от его схемы (`http`/`https`)
зависит имя session-cookie и флаг `secure`, а от значения — базовый адрес в
ссылках из писем и в канонических URL.

## Обязательные в production

| Переменная | Назначение | Кто читает |
|---|---|---|
| `DOMAIN` | домен для Caddy и выпуска сертификата | `Caddyfile`, `docker-compose.yml` |
| `LETSENCRYPT_EMAIL` | почта для Let's Encrypt | `Caddyfile` |
| `AUTH_TRUST_HOST` | `true` за reverse-proxy | Auth.js |
| `NODE_ENV=production` | режим контейнера | приложение |
| весь блок `STORAGE_*` | загрузка изображений | приложение |

Без `AUTH_TRUST_HOST=true` за Caddy Auth.js режет все `/api/auth/*` с ошибкой
`UntrustedHost`.

`NODE_ENV` нужен именно в прод-`.env`, потому что его читает контейнер. В
локальном `.env` его, наоборот, быть не должно: Next выставляет его сам, а
значение `development` в файле ломает `pnpm build`.

## Группы «все или ни одной»

Валидатор требует, чтобы каждая группа была заполнена целиком либо пуста
целиком. Половина заполненной группы — ошибка старта.

### OAuth-провайдеры (по паре)

| Переменная | Комментарий |
|---|---|
| `YANDEX_CLIENT_ID`, `YANDEX_CLIENT_SECRET` | callback: `{NEXTAUTH_URL}/api/auth/callback/yandex` |
| `VK_CLIENT_ID`, `VK_CLIENT_SECRET` | callback: `{NEXTAUTH_URL}/api/oauth/vk/callback` — **не** `/api/auth/callback/vk` |

Незаданный провайдер просто не появляется в форме входа. VK не принимает
`localhost`, для локальной проверки нужен https-туннель.

### Почта (все пять)

`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`.

- `SMTP_FROM` обязан совпадать с `SMTP_USER` — Яндекс не даёт отправлять от
  чужого адреса.
- `SMTP_PASSWORD` — пароль приложения, не пароль от аккаунта.
- Порт 465 включает implicit TLS, 587 — STARTTLS (решается в коде по значению).
- Пусто в dev → письма печатаются в консоль dev-сервера.
- Пусто в production → регистрация и сброс пароля недоступны, вход по
  существующему паролю работает.

### Хранилище изображений (все пять)

`STORAGE_ENDPOINT`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY_ID`,
`STORAGE_SECRET_ACCESS_KEY`, `STORAGE_PUBLIC_BASE`.

Пусто в dev → `/api/upload` отвечает `503 storage_not_configured`; остальное
приложение работает.

**`STORAGE_PUBLIC_BASE` нужен ещё и на этапе сборки** — из него собирается
allow-list хостов для `next/image` в `next.config.ts`. docker-compose
прокидывает его в билд как build arg, поэтому `.env` должен быть заполнен до
первого `docker compose build`.

### Бэкапы (все четыре)

`BACKUP_S3_ENDPOINT`, `BACKUP_S3_BUCKET`, `BACKUP_S3_ACCESS_KEY_ID`,
`BACKUP_S3_SECRET_ACCESS_KEY`. Только прод, читает контейнер `backup`.

## Необязательные

| Переменная | Назначение | Формат |
|---|---|---|
| `BLOCKED_EMAIL_DOMAINS` | дополняет встроенный стоп-лист доменов | список через запятую |
| `INDEXNOW_KEY` | ключ IndexNow | hex, 8–128 символов |
| `YANDEX_METRIKA_ID` | счётчик Метрики; пусто — выключена | только цифры |

Метрика подключается лишь при `NODE_ENV=production` **и** заданном ID.

`INDEXNOW_KEY` валидируется, но в приложении сейчас не используется: см.
раздел про IndexNow в [seo.md](seo.md).

## Не через `src/lib/env.ts`

`DB_PASSWORD` приложение не читает вообще. Её потребляет `docker-compose.yml`:
подставляет в `POSTGRES_PASSWORD` контейнера базы и собирает из неё
`DATABASE_URL` для контейнера приложения (блок `environment` сильнее `env_file`).
В `.env` её всё равно держат верной — из неё строят строку подключения миграции
и `psql` с хоста.

Пароль уезжает в URL, поэтому спецсимволы в нём нежелательны.

## Что ломается без чего

| Пусто | Последствие |
|---|---|
| `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET` | приложение не стартует |
| `YANDEX_*` / `VK_*` | соответствующая кнопка входа отсутствует |
| `SMTP_*` (dev) | письма в консоли |
| `SMTP_*` (prod) | нет регистрации и сброса пароля |
| `STORAGE_*` (dev) | `/api/upload` → 503, фото и свои обложки не загрузить |
| `STORAGE_*` (prod) | приложение не стартует |
| `BACKUP_S3_*` | бэкапы не уходят в S3 |
| `INDEXNOW_KEY` | ничего (модуль не подключён) |
| `YANDEX_METRIKA_ID` | аналитика выключена |

## Изменение переменных в проде

`docker compose restart` **не перечитывает** `env_file`. Нужно пересоздание:

```bash
docker compose up -d --force-recreate app
```

Если менялся `STORAGE_PUBLIC_BASE` — нужна ещё и пересборка, он запечён в билд.

## Локальное S3 вместо Timeweb

Обе группы, `STORAGE_*` и `BACKUP_S3_*`, можно направить на локальный MinIO —
тогда становятся проверяемыми загрузка картинок и бэкапы. Значения и подводные
камни (разные эндпоинты для приложения и для контейнера бэкапа, перезапуск
dev-сервера ради `next/image`) — в [testing.md](testing.md).

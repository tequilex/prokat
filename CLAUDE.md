# inrenta — C2C-маркетплейс аренды вещей

Веб-сервис «арендуй что угодно рядом» в духе Авито, но для аренды. Любой
пользователь одновременно и **арендатор**, и **продавец**: размещает свои вещи и
бронирует чужие. Платежей внутри нет — сервис сводит людей и ведёт заявки на
бронь, оплата и залог остаются между ними.

Проект называется **inrenta**. Имя `prokat` осталось только у репозитория на
GitHub и у локального каталога — это рабочая заглушка с начала разработки, в
коде и текстах её быть не должно.

Общение и UI — на русском; идентификаторы кода и commit-сообщения — на английском.

## Стек

- **Fullstack:** Next.js 15 (App Router, Server Components, Server Actions),
  React 19, TypeScript strict. SSR на всех публичных страницах.
- **БД:** PostgreSQL 16 + Drizzle ORM. Схема — `drizzle/schema.ts`.
- **Auth:** Auth.js v5, database-сессии. Яндекс ID, VK ID (свой OAuth 2.1 +
  PKCE), почта с паролем (argon2id).
- **Storage:** S3-совместимое, изображения через `sharp` → webp.
- **Стили:** Tailwind + CSS-токены в `theme/`, светлая и тёмная темы.
- **Тесты:** Vitest, только в `tests/**`.
- **Деплой:** docker-compose (Caddy + app + Postgres + backup).

## Команды

```bash
pnpm dev                 # dev-сервер (перед pnpm build остановить — общий .next)
pnpm build               # production-сборка
pnpm test                # vitest
pnpm exec tsc --noEmit   # проверка типов
pnpm check-theme         # проверка обязательных CSS-токенов
pnpm db:generate         # миграция из drizzle/schema.ts
pnpm db:migrate          # применить миграции
pnpm db:seed             # тестовые данные (идемпотентно)
pnpm db:studio           # drizzle studio
```

`pnpm lint` **не работает** — конфигурации ESLint в проекте нет, `next lint`
уходит в интерактивный визард и виснет. Не вызывать в скриптах. Подробности —
[docs/testing.md](docs/testing.md).

Поднять окружение: `docker compose up -d db` → `pnpm db:migrate && pnpm db:seed`
→ `pnpm dev`. Быстрый вход в dev: `GET /api/dev/login` (или `?role=admin`).

## Архитектурные принципы

Зависимости идут в одну сторону: `app → server → lib → db`.

| Слой | Отвечает за |
|---|---|
| `src/app/**` | роуты, страницы, метаданные |
| `src/server/*.ts` | чтение данных |
| `src/server/actions/*.ts` | мутации (Server Actions) |
| `src/lib/**` | доменная логика без БД + инфраструктура |
| `src/components/**` | UI |
| `drizzle/schema.ts` | схема БД |
| `theme/**` | токены, шрифты, тексты, SEO-дефолты |

Псевдонимы: `@/` → `src`, `@theme/` → `theme`, `@db/` → `drizzle`.

Подробно — [docs/architecture.md](docs/architecture.md).

## Правила разработки

- **Проверять права в самой мутации.** Server Action доступен по сети напрямую,
  минуя UI. Гарда на странице недостаточно.
- **Валидировать входные данные zod'ом** в actions: payload приходит извне и
  типу не соответствует автоматически.
- **Темы и адаптив обязательны на каждом экране.** Цвета — только через токены
  `theme/tokens.css`, не хардкодить. Мобайл проектируется первым классом, без
  горизонтального скролла body. Внимание: зелёный — это `--color-primary`,
  а `--color-accent` это охра.
- **Тесты только в `tests/**`**, импорт через `@/`. Тест рядом с исходником не
  запустится.
- **Коммиты** чистые и осмысленные, без нарратива задач и планов в теле.
  Идентификаторы и сообщения — на английском.
- Перед завершением задачи: `pnpm test` и `pnpm exec tsc --noEmit`.

## Ключевые ограничения

- **Премодерации нет** — объявление публикуется сразу `active`.
- **Крона нет.** Единственный планировщик в проде — контейнер бэкапа.
  Протухание заявок ленивое, перед чтением списков.
- **Rate limiter в памяти процесса** — обнуляется рестартом, не переживёт
  масштабирование.
- **Даты держит только подтверждённая заявка.** Создание заявки календарь не
  трогает.
- **Диапазон брони включает обе границы.**
- **`emailVerified` не означает «аккаунт живой»** — у OAuth-пользователей он
  всегда `NULL`. Признак способа входа — строки в `accounts`.
- **Без `STORAGE_*` локально** `/api/upload` отвечает 503; это нормально.

## Документация

| Нужно | Читать |
|---|---|
| куда положить новую логику | [docs/architecture.md](docs/architecture.md) |
| правила брони, занятости, статусы | [docs/domain.md](docs/domain.md) |
| вход, сессии, письма, доступ | [docs/auth.md](docs/auth.md) |
| загрузка картинок, обложки | [docs/media.md](docs/media.md) |
| метаданные, sitemap, JSON-LD | [docs/seo.md](docs/seo.md) |
| цвета, скругления, кант, тени | [theme/tokens.schema.md](theme/tokens.schema.md) |
| переменные окружения | [docs/environment.md](docs/environment.md) |
| тесты и проверки | [docs/testing.md](docs/testing.md) |
| деплой и эксплуатация | [docs/DEPLOY.md](docs/DEPLOY.md) |
| восстановление БД | [docs/RECOVERY.md](docs/RECOVERY.md) |
| почему сделано именно так | [docs/decisions/](docs/decisions/) |
| что осознанно отложено | [docs/BACKLOG.md](docs/BACKLOG.md) |

Оглавление — [docs/README.md](docs/README.md).

## Documentation Policy

Documentation describes the CURRENT state of the project.

Do not create documentation for temporary implementation plans.

After completing a task:

- update existing documentation if the current system changed;
- record significant architectural decisions in `docs/decisions/`;
- do not preserve implementation plans unless they contain important historical
  information.

Do not duplicate the same fact across multiple documentation files.

When documentation conflicts with the code, treat the code as the current source
of truth and update the documentation.

**If you are unsure how something works, inspect the code before documenting it.
Never guess.** Если после изучения кода однозначного ответа нет — пиши
`NEEDS REVIEW` и объясняй, что именно не удалось установить.

### Что проверить перед завершением задачи

Если задача изменила поведение системы, архитектурный подход, схему БД, API,
user flow, команды запуска/тестов/деплоя или важные ограничения — обнови
соответствующий документ **в той же задаче**. Если ничего из этого не менялось —
документацию писать не надо.

Не заводи новый `.md`, если факт можно корректно добавить в существующий.
Числа, статусы и списки файлов в прозе не пиши: они устаревают молча — вместо
них давай команду, которая покажет актуальный ответ.

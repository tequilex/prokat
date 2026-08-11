# Вход и регистрация по почте — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить третий способ входа — почта с паролем, с подтверждением почты и сбросом пароля — не ломая существующие Яндекс ID и VK ID.

**Architecture:** Credentials-провайдер Auth.js не используется: он требует JWT-сессий, а в проекте `session.strategy: "database"`. Вместо этого повторяется паттерн VK-флоу — проверили пароль, вставили строку в `sessions`, поставили cookie. Общие куски выносятся из `oauth-vk.ts` в `session.ts`. Вся логика пишется поверх узкого порта данных `store.ts`, чтобы сценарные тесты гонялись на реализации в памяти без живого Postgres.

**Tech Stack:** Next.js 15 (App Router, Server Actions), Drizzle ORM + Postgres 16, `@node-rs/argon2`, `nodemailer`, Vitest.

**Спека:** [`docs/superpowers/specs/2026-08-11-email-password-auth-design.md`](../specs/2026-08-11-email-password-auth-design.md) — при расхождении плана и спеки прав спек.

**Ветка:** `email-login`.

---

## Порядок и зависимости

Задачи 1–9 — фундамент без UI, каждая самодостаточна и коммитится отдельно. Задачи 10–13 — флоу поверх фундамента. 14 — UI. 15–16 — правки соседнего кода и документация.

| # | Задача | Зависит от |
|---|---|---|
| 1 | Схема БД | — |
| 2 | Переменные окружения | — |
| 3 | Нормализация почты и стоп-лист | 2 |
| 4 | Хэш пароля | 3 |
| 5 | Общий модуль сессий | — |
| 6 | Порт данных `store.ts` | 1, 5 |
| 7 | Одноразовые токены | 1, 6 |
| 8 | Отправка писем | 2 |
| 9 | Лимиты и IP клиента | — |
| 10 | Регистрация | 3, 4, 6, 7, 8, 9 |
| 11 | Подтверждение почты | 5, 6, 7 |
| 12 | Вход | 4, 5, 6, 9 |
| 13 | Сброс пароля | 4, 5, 6, 7, 8, 9 |
| 14 | UI на `/login` и `/reset` | 10–13 |
| 15 | Правка VK-флоу | 5, 6 |
| 16 | Seed, dev-логин и документация | 4, 5 |

---

## Файловая структура

Создаётся:

| Файл | Ответственность |
|---|---|
| `src/lib/auth/email.ts` | нормализация адреса, стоп-лист доменов (спека называет файл `blocked-email-domains.ts` — там название устарело, берём `email.ts`: в нём же живёт нормализация) |
| `src/lib/auth/password.ts` | argon2id: хэш, проверка, фиктивная проверка, правила |
| `src/lib/auth/session.ts` | выдача/удаление database-сессии, имя cookie, TTL, `safeCallback` |
| `src/lib/auth/store.ts` | порт данных + drizzle-реализация |
| `src/lib/auth/email-tokens.ts` | выпуск, погашение и чистка одноразовых токенов |
| `src/lib/mail/mailer.ts` | выбор транспорта (SMTP / консоль), отправка |
| `src/lib/mail/templates.ts` | сборка трёх писем |
| `src/lib/http/client-ip.ts` | IP из `X-Forwarded-For` |
| `src/server/actions/auth-email.ts` | Server Actions всех четырёх флоу |
| `src/app/api/auth/email/verify/route.ts` | переход по ссылке подтверждения |
| `src/app/(auth)/reset/page.tsx` | экран нового пароля |
| `src/components/auth/EmailAuthForm.tsx` | форма на `/login` |
| `src/components/auth/ResetPasswordForm.tsx` | форма нового пароля |
| `tests/fixtures/auth-store.ts` | реализация порта в памяти для сценарных тестов |

Правится: `drizzle/schema.ts`, `src/lib/env.ts`, `src/lib/rate-limit.ts`, `src/lib/auth/oauth-vk.ts`, `src/app/api/oauth/vk/callback/route.ts`, `src/app/api/dev/login/route.ts`, `src/app/(auth)/login/page.tsx`, `theme/content.ts`, `scripts/seed.ts`, `.env.example`, `docs/DEPLOY.md`.

---

## Task 1: Схема БД

**Files:**
- Modify: `drizzle/schema.ts`
- Create: `drizzle/migrations/****_email_auth.sql` (генерируется)
- Test: `tests/db/schema-email-auth.test.ts`

- [ ] **Step 1: Написать падающий тест**

```ts
import { describe, it, expect } from "vitest";
import { users, emailTokens, emailTokenPurpose } from "@db/schema";

describe("schema: email auth", () => {
  it("users has nullable password_hash", () => {
    expect(users.passwordHash).toBeDefined();
    expect(users.passwordHash.notNull).toBe(false);
  });

  it("email_tokens has the columns the flows rely on", () => {
    for (const col of ["id", "userId", "purpose", "tokenHash", "expiresAt", "usedAt", "createdAt"]) {
      expect(emailTokens[col as keyof typeof emailTokens]).toBeDefined();
    }
    expect(emailTokens.tokenHash.isUnique).toBe(true);
  });

  it("purpose enum covers verify and reset only", () => {
    expect(emailTokenPurpose.enumValues).toEqual(["verify", "reset"]);
  });
});
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `pnpm vitest run tests/db/schema-email-auth.test.ts`
Expected: FAIL — `emailTokens` не экспортируется из `@db/schema`.

- [ ] **Step 3: Добавить колонку и таблицу**

В `drizzle/schema.ts` в описание `users` добавить рядом с `image`:

```ts
  // argon2id. NULL у OAuth-юзеров: пароль есть только у тех, кто регистрировался почтой.
  passwordHash: text("password_hash"),
```

Ниже `verificationTokens` добавить:

```ts
export const emailTokenPurpose = pgEnum("email_token_purpose", ["verify", "reset"]);

// Одноразовые ссылки из писем. В БД лежит sha256 от токена, оригинал уходит в письмо:
// дамп базы не должен давать вход в чужие аккаунты.
export const emailTokens = pgTable("email_tokens", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  purpose: emailTokenPurpose("purpose").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  // Штамп предъявления. Токены, отменённые выпуском нового письма, не штампуются,
  // а удаляются — иначе льготное окно на повторный клик оживляло бы их.
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  userPurposeIdx: index("email_tokens_user_purpose_idx").on(t.userId, t.purpose),
}));
```

- [ ] **Step 4: Прогнать тест**

Run: `pnpm vitest run tests/db/schema-email-auth.test.ts`
Expected: PASS.

- [ ] **Step 5: Сгенерировать и применить миграцию**

Run: `pnpm db:generate` затем `pnpm db:migrate`
Expected: новый файл в `drizzle/migrations/`, миграция применяется без ошибок. Проверить глазами, что в SQL только `ALTER TABLE users ADD COLUMN password_hash`, `CREATE TYPE email_token_purpose` и `CREATE TABLE email_tokens` — ничего лишнего.

- [ ] **Step 6: Коммит**

```bash
git add drizzle/ tests/db/schema-email-auth.test.ts
git commit -m "feat(db): password hash column and email tokens table"
```

---

## Task 2: Переменные окружения

**Files:**
- Modify: `src/lib/env.ts`
- Test: `tests/auth/env-smtp.test.ts`

- [ ] **Step 1: Написать падающие тесты**

Новый файл: `base` в существующих тестах живёт в `tests/auth/env-oauth.test.ts` и в `tests/env.test.ts` его нет — объявляем свой.

```ts
import { describe, it, expect } from "vitest";
import { parseEnv } from "@/lib/env";

const base = {
  NODE_ENV: "test",
  DATABASE_URL: "postgres://app:test@localhost:5432/app",
  NEXTAUTH_URL: "http://localhost:3000",
  NEXTAUTH_SECRET: "x".repeat(32),
};

const smtp = {
  SMTP_HOST: "smtp.yandex.ru",
  SMTP_PORT: "465",
  SMTP_USER: "noreply@example.ru",
  SMTP_PASSWORD: "secret",
  SMTP_FROM: "noreply@example.ru",
};

describe("env: SMTP", () => {
  it("accepts env without SMTP (console transport in dev)", () => {
    expect(parseEnv(base).SMTP_HOST).toBeUndefined();
  });

  it("parses a full SMTP set", () => {
    expect(parseEnv({ ...base, ...smtp }).SMTP_PORT).toBe(465);
  });

  it("rejects a partial SMTP set", () => {
    const { SMTP_FROM: _omit, ...partial } = smtp;
    expect(() => parseEnv({ ...base, ...partial })).toThrow(/SMTP_/);
  });

  it("splits BLOCKED_EMAIL_DOMAINS into a list", () => {
    const env = parseEnv({ ...base, BLOCKED_EMAIL_DOMAINS: "Foo.com, bar.com ," });
    expect(env.BLOCKED_EMAIL_DOMAINS).toEqual(["foo.com", "bar.com"]);
  });
});
```

- [ ] **Step 2: Убедиться, что падает**

Run: `pnpm vitest run tests/auth/env-smtp.test.ts`
Expected: FAIL — `SMTP_PORT` не число, `BLOCKED_EMAIL_DOMAINS` не массив.

- [ ] **Step 3: Расширить схему env**

В `src/lib/env.ts` в объект схемы добавить:

```ts
  SMTP_HOST:     z.string().min(1).optional(),
  SMTP_PORT:     z.coerce.number().int().positive().optional(),
  SMTP_USER:     z.string().min(1).optional(),
  SMTP_PASSWORD: z.string().min(1).optional(),
  SMTP_FROM:     z.string().email().optional(),

  // Дополняет встроенный список в src/lib/auth/email.ts: домен закрывается
  // рестартом контейнера, без пересборки.
  BLOCKED_EMAIL_DOMAINS: z.string()
    .transform((s) => s.split(",").map((d) => d.trim().toLowerCase()).filter(Boolean))
    .pipe(z.array(z.string()))
    .optional(),
```

В `superRefine` рядом с проверкой `STORAGE_*` добавить такую же «все или ни одной» для ключей `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` с сообщением `"SMTP_* env vars must be all set or all empty"` и `path: ["SMTP_HOST"]`.

**Важно:** в проде отсутствие `SMTP_*` допустимо (регистрация и сброс просто скрыты), поэтому в блок `if (v.NODE_ENV === "production")` ничего не добавляем.

- [ ] **Step 4: Прогнать тесты**

Run: `pnpm vitest run tests/auth/env-smtp.test.ts`
Expected: PASS.

- [ ] **Step 5: Коммит**

```bash
git add src/lib/env.ts tests/auth/env-smtp.test.ts
git commit -m "feat(env): smtp settings and blocked email domains"
```

---

## Task 3: Нормализация почты и стоп-лист

**Files:**
- Create: `src/lib/auth/email.ts`
- Test: `tests/auth/email.test.ts`

- [ ] **Step 1: Написать падающий тест**

```ts
import { describe, it, expect } from "vitest";
import { normalizeEmail, emailDomain, isBlockedDomain } from "@/lib/auth/email";

describe("normalizeEmail", () => {
  it("trims and lowercases", () => {
    expect(normalizeEmail("  A@Ya.RU ")).toBe("a@ya.ru");
  });
});

describe("emailDomain", () => {
  it("returns the part after the last @", () => {
    expect(emailDomain("a@ya.ru")).toBe("ya.ru");
  });
  it("returns null for a malformed address", () => {
    expect(emailDomain("not-an-email")).toBeNull();
  });
});

describe("isBlockedDomain", () => {
  it("blocks the built-in list", () => {
    expect(isBlockedDomain("a@gmail.com")).toBe(true);
    expect(isBlockedDomain("a@OUTLOOK.com")).toBe(true);
  });
  it("allows russian providers", () => {
    expect(isBlockedDomain("a@yandex.ru")).toBe(false);
    expect(isBlockedDomain("a@mail.ru")).toBe(false);
  });
  it("does not block subdomains implicitly", () => {
    expect(isBlockedDomain("a@mail.gmail.com.ru")).toBe(false);
  });
  it("honours the extra list from env", () => {
    expect(isBlockedDomain("a@foo.com", ["foo.com"])).toBe(true);
  });
});
```

- [ ] **Step 2: Убедиться, что падает**

Run: `pnpm vitest run tests/auth/email.test.ts`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализовать**

```ts
// src/lib/auth/email.ts
import { getEnv } from "@/lib/env";

// Стоп-лист иностранных почтовых сервисов: требование законодательства РФ
// (см. спеку). Список расширяется правкой файла либо BLOCKED_EMAIL_DOMAINS в .env.
// Проверяется ТОЛЬКО при регистрации: на подтверждении и сбросе он сделал бы
// уже существующий аккаунт невосстановимым.
const BUILT_IN_BLOCKED = [
  "gmail.com", "googlemail.com",
  "outlook.com", "hotmail.com", "live.com", "msn.com",
  "yahoo.com", "ymail.com",
  "icloud.com", "me.com", "mac.com",
  "aol.com", "proton.me", "protonmail.com", "gmx.com", "zoho.com",
] as const;

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function emailDomain(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at <= 0 || at === email.length - 1) return null;
  return email.slice(at + 1).toLowerCase();
}

export function isBlockedDomain(email: string, extra?: readonly string[]): boolean {
  const domain = emailDomain(normalizeEmail(email));
  if (!domain) return false;
  const fromEnv = extra ?? getEnv().BLOCKED_EMAIL_DOMAINS ?? [];
  return BUILT_IN_BLOCKED.includes(domain as (typeof BUILT_IN_BLOCKED)[number])
    || fromEnv.includes(domain);
}
```

- [ ] **Step 4: Прогнать тесты**

Run: `pnpm vitest run tests/auth/email.test.ts`
Expected: PASS.

- [ ] **Step 5: Коммит**

```bash
git add src/lib/auth/email.ts tests/auth/email.test.ts
git commit -m "feat(auth): email normalisation and domain blocklist"
```

---

## Task 4: Хэш пароля

**Files:**
- Create: `src/lib/auth/password.ts`
- Test: `tests/auth/password.test.ts`

- [ ] **Step 1: Поставить зависимость**

Run: `pnpm add @node-rs/argon2`

- [ ] **Step 2: Написать падающий тест**

```ts
import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword, fakeVerify, checkPasswordRules, devSeedPassword } from "@/lib/auth/password";

describe("password hashing", () => {
  it("round-trips", async () => {
    const hash = await hashPassword("correct horse battery");
    expect(hash).not.toContain("correct horse");
    expect(await verifyPassword(hash, "correct horse battery")).toBe(true);
    expect(await verifyPassword(hash, "wrong")).toBe(false);
  });

  it("fakeVerify resolves without throwing", async () => {
    await expect(fakeVerify()).resolves.toBeUndefined();
  });

  it("verifyPassword returns false on a malformed hash instead of throwing", async () => {
    expect(await verifyPassword("not-a-hash", "x")).toBe(false);
  });
});

describe("checkPasswordRules", () => {
  it("rejects short passwords", () => {
    expect(checkPasswordRules("short", "a@ya.ru")).toBe("Пароль короче 8 символов");
  });
  it("rejects a password equal to the email", () => {
    expect(checkPasswordRules("a@ya.ru", "A@YA.RU")).toBeTruthy();
  });
  it("rejects absurdly long passwords", () => {
    expect(checkPasswordRules("x".repeat(201), "a@ya.ru")).toBeTruthy();
  });
  it("accepts a sane password", () => {
    expect(checkPasswordRules("normalnyi-parol", "a@ya.ru")).toBeNull();
  });
});

describe("devSeedPassword", () => {
  it("returns null in production", async () => {
    expect(await devSeedPassword("production")).toBeNull();
  });
  it("returns a hash outside production", async () => {
    expect(await devSeedPassword("development")).toMatch(/^\$argon2id\$/);
  });
});
```

- [ ] **Step 3: Убедиться, что падает**

Run: `pnpm vitest run tests/auth/password.test.ts`
Expected: FAIL — модуль не найден.

- [ ] **Step 4: Реализовать**

**Важно:** `Algorithm` в `@node-rs/argon2` объявлен как `declare const enum`, а в `tsconfig.json` включён `isolatedModules` — импорт этого символа валит сборку с `TS2748`. Argon2id и так дефолт пакета, поэтому просто не импортируем его.

```ts
// src/lib/auth/password.ts
import { hash, verify } from "@node-rs/argon2";
import { normalizeEmail } from "@/lib/auth/email";

// Параметры заданы явно, а не взяты из дефолтов пакета: рекомендация OWASP.
// algorithm не указываем — Argon2id и так дефолт, а его enum нельзя импортировать
// при isolatedModules (TS2748).
const OPTS = { memoryCost: 19456, timeCost: 2, parallelism: 1 };

// Хэш заведомо несуществующего пароля: гоняем его, когда юзера нет, чтобы по
// времени ответа нельзя было определить, зарегистрирован ли адрес.
let dummyHash: string | null = null;

export const MIN_LENGTH = 8;
export const MAX_LENGTH = 200;

export async function hashPassword(plain: string): Promise<string> {
  return hash(plain, OPTS);
}

export async function verifyPassword(storedHash: string, plain: string): Promise<boolean> {
  try {
    return await verify(storedHash, plain, OPTS);
  } catch {
    return false;
  }
}

export async function fakeVerify(): Promise<void> {
  dummyHash ??= await hash("dummy-password-for-timing", OPTS);
  await verifyPassword(dummyHash, "definitely-not-the-password");
}

// Kill-switch для seed'а: пароли тестовым владельцам раздаются только вне прода.
// Живёт здесь, а не в scripts/seed.ts, потому что scripts/ вне алиаса @/ и
// seed.ts вызывает main() на верхнем уровне — импорт из теста полез бы в Postgres.
export async function devSeedPassword(nodeEnv: string | undefined): Promise<string | null> {
  if (nodeEnv === "production") return null;
  return hashPassword(DEV_SEED_PASSWORD);
}

export const DEV_SEED_PASSWORD = "prokat-dev-12345";

export function checkPasswordRules(plain: string, email: string): string | null {
  if (plain.length < MIN_LENGTH) return `Пароль короче ${MIN_LENGTH} символов`;
  if (plain.length > MAX_LENGTH) return `Пароль длиннее ${MAX_LENGTH} символов`;
  if (normalizeEmail(plain) === normalizeEmail(email)) return "Пароль не может совпадать с почтой";
  return null;
}
```

- [ ] **Step 5: Прогнать тесты**

Run: `pnpm vitest run tests/auth/password.test.ts`
Expected: PASS. Тест на round-trip идёт ~200 мс — это нормально для argon2.

- [ ] **Step 6: Коммит**

```bash
git add package.json pnpm-lock.yaml src/lib/auth/password.ts tests/auth/password.test.ts
git commit -m "feat(auth): argon2id password hashing and rules"
```

---

## Task 5: Общий модуль сессий

**Files:**
- Create: `src/lib/auth/session.ts`
- Modify: `src/lib/auth/oauth-vk.ts`, `src/app/api/oauth/vk/callback/route.ts`, `src/app/api/dev/login/route.ts`
- Test: `tests/auth/session.test.ts`

- [ ] **Step 1: Написать падающий тест**

Переменные окружения трогаем через хелпер `withEnv` — скопировать из `tests/auth/oauth-vk.test.ts:22-31`. Прямая запись в `process.env` без восстановления течёт между файлами внутри одного vitest-воркера.

```ts
import { describe, it, expect } from "vitest";
import { safeCallback, sessionCookieName, sessionTtlSeconds } from "@/lib/auth/session";
// withEnv — копия хелпера из tests/auth/oauth-vk.test.ts

describe("safeCallback", () => {
  it("keeps relative paths", () => {
    expect(safeCallback("/cabinet/listings")).toBe("/cabinet/listings");
  });
  it("rejects protocol-relative and absolute urls", () => {
    expect(safeCallback("//evil.com")).toBe("/");
    expect(safeCallback("https://evil.com")).toBe("/");
    expect(safeCallback(null)).toBe("/");
  });
});

describe("sessionCookieName", () => {
  it("uses the __Secure- prefix on https", () => {
    withEnv({ NEXTAUTH_URL: "https://example.ru" }, () => {
      expect(sessionCookieName()).toBe("__Secure-authjs.session-token");
    });
  });

  it("uses the plain name on http", () => {
    withEnv({ NEXTAUTH_URL: "http://localhost:3000" }, () => {
      expect(sessionCookieName()).toBe("authjs.session-token");
    });
  });
});

describe("sessionTtlSeconds", () => {
  it("is 30 days", () => {
    expect(sessionTtlSeconds).toBe(30 * 24 * 60 * 60);
  });
});
```

- [ ] **Step 2: Убедиться, что падает**

Run: `pnpm vitest run tests/auth/session.test.ts`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Создать `src/lib/auth/session.ts`**

Перенести из `oauth-vk.ts` без изменения поведения: `SESSION_TTL_SECONDS`, `sessionTtlSeconds`, `sessionCookieName()`. Перенести `safeCallback` из `api/oauth/vk/callback/route.ts`. Добавить выдачу и удаление сессий:

```ts
// src/lib/auth/session.ts
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { sessions } from "@db/schema";
import { getEnv } from "@/lib/env";

const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;
export const sessionTtlSeconds = SESSION_TTL_SECONDS;

export function sessionCookieName(): string {
  return getEnv().NEXTAUTH_URL.startsWith("https://")
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";
}

// Только относительный путь: иначе callbackUrl превращается в открытый редирект.
export function safeCallback(input: string | null | undefined): string {
  if (!input) return "/";
  if (!input.startsWith("/") || input.startsWith("//")) return "/";
  return input;
}

export function sessionCookieOptions(expires: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: getEnv().NEXTAUTH_URL.startsWith("https://"),
    path: "/",
    expires,
  };
}

export async function issueSession(userId: string): Promise<{ sessionToken: string; expires: Date }> {
  const sessionToken = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  await getDb().insert(sessions).values({ sessionToken, userId, expires });
  return { sessionToken, expires };
}

// Сброс пароля обязан выкидывать все живые сессии: он же реакция на угон.
export async function dropAllSessions(userId: string): Promise<void> {
  await getDb().delete(sessions).where(eq(sessions.userId, userId));
}
```

- [ ] **Step 4: Переключить потребителей**

В `src/lib/auth/oauth-vk.ts` удалить `sessionCookieName`, `sessionTtlSeconds`, `SESSION_TTL_SECONDS`. Ре-экспорт локальной привязки **не** создаёт, а `SESSION_TTL_SECONDS` используется внутри `upsertUserAndSession` (`oauth-vk.ts:210`) — нужны обе строки:

```ts
import { sessionTtlSeconds } from "@/lib/auth/session";
export { sessionCookieName, sessionTtlSeconds } from "@/lib/auth/session";
```

и заменить в теле `SESSION_TTL_SECONDS` на `sessionTtlSeconds`.

В `src/app/api/oauth/vk/callback/route.ts` и `src/app/api/dev/login/route.ts` заменить импорты этих двух символов на `@/lib/auth/session`; в callback-роуте удалить локальный `safeCallback` и импортировать его оттуда же.

- [ ] **Step 5: Прогнать тесты и типы**

Run: `pnpm vitest run tests/auth/session.test.ts && pnpm exec tsc --noEmit`
Expected: PASS, типы чистые.

- [ ] **Step 6: Проверить, что dev-логин жив**

Run: `pnpm dev`, открыть `http://localhost:3000/api/dev/login?role=admin`
Expected: редирект на главную, в шапке — залогиненный админ.

- [ ] **Step 7: Коммит**

```bash
git add src/lib/auth/ src/app/api/ tests/auth/session.test.ts
git commit -m "refactor(auth): extract shared session issuing from vk flow"
```

---

## Task 6: Порт данных

**Files:**
- Create: `src/lib/auth/store.ts`, `tests/fixtures/auth-store.ts`
- Test: `tests/auth/store-fake.test.ts`

Смысл задачи: вся логика следующих задач принимает `store` аргументом, поэтому сценарии тестируются без Postgres. Drizzle-реализация остаётся тонкой обёрткой без ветвлений — она покрывается только ручной проверкой.

- [ ] **Step 1: Описать интерфейс**

```ts
// src/lib/auth/store.ts
export type AuthUser = {
  id: string;
  email: string;
  passwordHash: string | null;
  emailVerified: Date | null;
  bannedAt: Date | null;
  hasOAuthAccounts: boolean;
};

export type StoredToken = {
  id: string;
  userId: string;
  purpose: "verify" | "reset";
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
};

export interface AuthStore {
  findUserByEmail(email: string): Promise<AuthUser | null>;
  createUser(email: string, passwordHash: string): Promise<AuthUser>;
  // Нужны Task 15: VK-флоу переезжает на порт, иначе его нечем тестировать —
  // сейчас он ходит в getDb() напрямую.
  findUserIdByAccount(provider: string, providerAccountId: string): Promise<string | null>;
  createUserWithAccount(input: {
    email: string; name: string | null; image: string | null;
    provider: string; providerAccountId: string;
    accessToken: string; refreshToken: string | null; expiresAt: number | null; scope: string;
  }): Promise<{ ok: true; userId: string } | { ok: false; reason: "email_taken" }>;
  setPassword(userId: string, passwordHash: string): Promise<void>;
  markEmailVerified(userId: string): Promise<void>;
  insertToken(t: StoredToken): Promise<void>;
  findTokenByHash(tokenHash: string): Promise<StoredToken | null>;
  markTokenUsed(id: string): Promise<void>;
  deleteTokens(userId: string, purpose: "verify" | "reset"): Promise<void>;
  deleteExpiredTokens(userId: string, now: Date): Promise<void>;
  issueSession(userId: string): Promise<{ sessionToken: string; expires: Date }>;
  dropAllSessions(userId: string): Promise<void>;
}
```

- [ ] **Step 2: Написать drizzle-реализацию**

В том же файле — `export function drizzleAuthStore(): AuthStore`, где каждый метод это один запрос. `findUserByEmail` тянет `hasOAuthAccounts` подзапросом по `accounts`:

```ts
const rows = await db.select({
  id: users.id, email: users.email, passwordHash: users.passwordHash,
  emailVerified: users.emailVerified, bannedAt: users.bannedAt,
  accountId: accounts.provider,
})
  .from(users)
  .leftJoin(accounts, eq(accounts.userId, users.id))
  .where(eq(users.email, email))
  .limit(1);
```

`hasOAuthAccounts` = `rows[0].accountId !== null`. `issueSession` и `dropAllSessions` делегируют в `@/lib/auth/session` (поэтому задача зависит от Task 5).

`createUserWithAccount` оборачивает обе вставки в `db.transaction(...)`: сейчас `users` и `accounts` пишутся двумя несвязанными запросами (`oauth-vk.ts:183` и `:194`), и падение второй оставляет юзера-сироту без единого способа входа. Занятая почта возвращается как `{ ok: false, reason: "email_taken" }`, а не бросает исключение на `unique`.

- [ ] **Step 3: Написать реализацию в памяти**

```ts
// tests/fixtures/auth-store.ts
import type { AuthStore, AuthUser, StoredToken } from "@/lib/auth/store";

export function fakeAuthStore(seed: Partial<AuthUser>[] = []) {
  const users: AuthUser[] = seed.map((u, i) => ({
    id: u.id ?? `u${i + 1}`, email: u.email ?? `u${i + 1}@ya.ru`,
    passwordHash: u.passwordHash ?? null, emailVerified: u.emailVerified ?? null,
    bannedAt: u.bannedAt ?? null, hasOAuthAccounts: u.hasOAuthAccounts ?? false,
  }));
  const tokens: StoredToken[] = [];
  const sessions: Array<{ token: string; userId: string }> = [];
  let seq = users.length;

  const store: AuthStore = { /* методы поверх этих массивов */ } as AuthStore;
  return { store, users, tokens, sessions };
}
```

- [ ] **Step 4: Тест на саму фикстуру**

Проверить `createUser` → `findUserByEmail` → `setPassword` → `dropAllSessions`; что `deleteTokens` сносит только нужный `purpose`; что `deleteExpiredTokens` не трогает живые токены; что `createUserWithAccount` отдаёт `email_taken` на занятый адрес и что при ошибке вставки аккаунта юзер не остаётся (транзакционность фикстуры имитируется откатом массива).

Run: `pnpm vitest run tests/auth/store-fake.test.ts`
Expected: PASS.

- [ ] **Step 5: Коммит**

```bash
git add src/lib/auth/store.ts tests/fixtures/auth-store.ts tests/auth/store-fake.test.ts
git commit -m "feat(auth): data port for email auth flows"
```

---

## Task 7: Одноразовые токены

**Files:**
- Create: `src/lib/auth/email-tokens.ts`
- Test: `tests/auth/email-tokens.test.ts`

Правила из спеки: токен 32 байта, в БД sha256; `verify` живёт 24 часа, `reset` — 1 час; предъявление штампует `usedAt`; выпуск нового токена того же назначения **удаляет** прежние; для `verify` повторный клик в течение 15 минут после предъявления — успех, для `reset` — нет.

- [ ] **Step 1: Написать падающие тесты**

```ts
describe("issueToken", () => {
  it("returns a raw token and stores only its hash", async () => { /* … */ });
  it("deletes previous tokens of the same purpose", async () => { /* … */ });
  it("keeps tokens of the other purpose", async () => { /* … */ });
  it("clears expired tokens of the user", async () => { /* … */ });
});

describe("consumeToken", () => {
  it("accepts a fresh token once", async () => { /* … */ });
  it("rejects an expired token", async () => { /* … */ });
  it("rejects a token of another purpose", async () => { /* … */ });
  it("rejects an unknown token", async () => { /* … */ });
  it("accepts a verify token re-presented inside the 15 minute grace window", async () => { /* … */ });
  it("rejects a verify token re-presented after the grace window", async () => { /* … */ });
  it("rejects a reset token re-presented at all", async () => { /* … */ });
});
```

- [ ] **Step 2: Убедиться, что падают**

Run: `pnpm vitest run tests/auth/email-tokens.test.ts`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализовать**

```ts
// src/lib/auth/email-tokens.ts
import { createHash, randomBytes } from "node:crypto";
import { newId } from "@/lib/auth/id";
import type { AuthStore } from "@/lib/auth/store";

export type TokenPurpose = "verify" | "reset";

const TTL_SECONDS: Record<TokenPurpose, number> = { verify: 24 * 60 * 60, reset: 60 * 60 };
// Почтовые клиенты и антивирусы ходят по ссылке раньше человека и сжигают токен.
const VERIFY_GRACE_MS = 15 * 60 * 1000;

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export async function issueToken(
  store: AuthStore, userId: string, purpose: TokenPurpose, now = new Date(),
): Promise<string> {
  await store.deleteExpiredTokens(userId, now);
  // Прежние токены удаляем, а не штампуем usedAt: иначе льготное окно оживит их.
  await store.deleteTokens(userId, purpose);
  const raw = randomBytes(32).toString("base64url");
  await store.insertToken({
    id: newId(), userId, purpose, tokenHash: hashToken(raw),
    expiresAt: new Date(now.getTime() + TTL_SECONDS[purpose] * 1000), usedAt: null,
  });
  return raw;
}

export type ConsumeResult = { ok: true; userId: string } | { ok: false };

export async function consumeToken(
  store: AuthStore, raw: string, purpose: TokenPurpose, now = new Date(),
): Promise<ConsumeResult> {
  const row = await store.findTokenByHash(hashToken(raw));
  if (!row || row.purpose !== purpose) return { ok: false };
  if (row.expiresAt.getTime() <= now.getTime()) return { ok: false };
  if (row.usedAt) {
    const withinGrace = now.getTime() - row.usedAt.getTime() < VERIFY_GRACE_MS;
    if (purpose !== "verify" || !withinGrace) return { ok: false };
    return { ok: true, userId: row.userId };
  }
  await store.markTokenUsed(row.id);
  return { ok: true, userId: row.userId };
}
```

- [ ] **Step 4: Прогнать тесты**

Run: `pnpm vitest run tests/auth/email-tokens.test.ts`
Expected: PASS.

- [ ] **Step 5: Коммит**

```bash
git add src/lib/auth/email-tokens.ts tests/auth/email-tokens.test.ts
git commit -m "feat(auth): single-use email tokens with verify grace window"
```

---

## Task 8: Отправка писем

**Files:**
- Create: `src/lib/mail/mailer.ts`, `src/lib/mail/templates.ts`
- Modify: `theme/content.ts`
- Test: `tests/lib/mailer.test.ts`

- [ ] **Step 1: Поставить зависимость**

Run: `pnpm add nodemailer && pnpm add -D @types/nodemailer`

- [ ] **Step 2: Написать падающий тест**

```ts
import { describe, it, expect, vi } from "vitest";
import { mailTransportAvailable, sendMail, __setTransportForTests } from "@/lib/mail/mailer";
import { verifyEmail, resetEmail } from "@/lib/mail/templates";

describe("mail templates", () => {
  it("puts the link and the ttl into the verify email", () => {
    const mail = verifyEmail("a@ya.ru", "https://example.ru/api/auth/email/verify?token=abc");
    expect(mail.subject).toBeTruthy();
    expect(mail.text).toContain("https://example.ru/api/auth/email/verify?token=abc");
    expect(mail.text).toContain("24");
  });

  it("warns to ignore an unexpected reset email", () => {
    expect(resetEmail("a@ya.ru", "https://example.ru/reset?token=abc").text).toMatch(/проигнорируйте/i);
  });
});

describe("sendMail", () => {
  it("delegates to the transport", async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    __setTransportForTests({ send });
    await sendMail({ to: "a@ya.ru", subject: "s", text: "t" });
    expect(send).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 3: Убедиться, что падает**

Run: `pnpm vitest run tests/lib/mailer.test.ts`
Expected: FAIL — модули не найдены.

- [ ] **Step 4: Реализовать**

`mailer.ts`: тип `Mail = { to: string; subject: string; text: string }`, интерфейс `Transport { send(mail: Mail): Promise<void> }`.

- `mailTransportAvailable()` → `true`, если заданы `SMTP_*`, либо если `NODE_ENV !== "production"` (консольный транспорт).
- Ленивый выбор транспорта: `SMTP_*` заданы → `nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } })`; иначе (и только вне прода) — консольный, печатающий `[mail] to=… subject=… text=…`.
- `__setTransportForTests` — точка подмены, как `_resetEnvCacheForTests` в `env.ts`.
- Ошибка отправки пробрасывается наружу: вызывающий Server Action превращает её в «Не удалось отправить письмо, попробуйте позже».

`templates.ts`: три функции — `verifyEmail(to, link)`, `verifyEmailAgain(to, link)`, `resetEmail(to, link)`. Тексты берутся из `content.auth.mail.*` в `theme/content.ts`, срок жизни ссылки подставляется в текст, в каждом письме строка «Если это были не вы — просто проигнорируйте письмо».

- [ ] **Step 5: Прогнать тесты**

Run: `pnpm vitest run tests/lib/mailer.test.ts`
Expected: PASS.

- [ ] **Step 6: Коммит**

```bash
git add package.json pnpm-lock.yaml src/lib/mail/ theme/content.ts tests/lib/mailer.test.ts
git commit -m "feat(mail): smtp and console transports with auth templates"
```

---

## Task 9: Лимиты и IP клиента

**Files:**
- Modify: `src/lib/rate-limit.ts`
- Create: `src/lib/http/client-ip.ts`
- Test: `tests/lib/rate-limit.test.ts`, `tests/lib/client-ip.test.ts`

- [ ] **Step 1: Написать падающие тесты**

Для `client-ip`: из `X-Forwarded-For: "1.2.3.4, 5.6.7.8"` берётся **последний** элемент (`5.6.7.8`) — его дописывает Caddy, первый подконтролен клиенту; без заголовка — `local`.

Для `rate-limit`: `checkLimit("a@ya.ru|1.2.3.4", "login")` разрешает 10 попыток и отклоняет одиннадцатую с `reason: "window"`; `register` отклоняет вторую попытку подряд с `reason: "gap"`.

- [ ] **Step 2: Убедиться, что падают**

Run: `pnpm vitest run tests/lib/rate-limit.test.ts tests/lib/client-ip.test.ts`
Expected: FAIL.

- [ ] **Step 3: Расширить лимитер**

В `src/lib/rate-limit.ts` переименовать первый параметр `checkLimit(userId, kind)` в `key` (сигнатура совместима — это строка) и добавить правила:

```ts
  login:    { windowMs: 15 * 60 * 1000, maxInWindow: 10, gapMs: 0 },
  register: { windowMs: 60 * 60 * 1000, maxInWindow: 5,  gapMs: 5_000 },
  resend:   { windowMs: 60 * 60 * 1000, maxInWindow: 5,  gapMs: 60_000 },
  reset:    { windowMs: 60 * 60 * 1000, maxInWindow: 3,  gapMs: 60_000 },
  // Второй, более широкий контур по IP для всего, что шлёт письма: без него
  // смена IP снимает лимит по почте, а лимит по почте не мешает бомбить разные ящики.
  mail_ip:  { windowMs: 60 * 60 * 1000, maxInWindow: 10, gapMs: 0 },
```

`resend` и `reset` ключуются по почте, `mail_ip` — по IP; оба проверяются вместе (спека, таблица лимитов).

Обновить `LimitKind`. Комментарий в шапке файла про «ключ — userId» поправить: теперь ключом может быть почта или IP.

- [ ] **Step 4: Реализовать `client-ip.ts`**

```ts
// Caddy стоит edge'ом и дописывает адрес пира в конец X-Forwarded-For,
// поэтому доверяем последнему элементу. Первый подделывается клиентом.
export function clientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (!xff) return "local";
  const parts = xff.split(",").map((p) => p.trim()).filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : "local";
}
```

- [ ] **Step 5: Прогнать тесты**

Run: `pnpm vitest run tests/lib/`
Expected: PASS. Готовых тестов лимитера в репозитории нет — этот файл первый, поэтому проверить заодно, что старые виды (`comment`, `post`, `booking`) продолжают работать после переименования параметра.

- [ ] **Step 6: Коммит**

```bash
git add src/lib/rate-limit.ts src/lib/http/client-ip.ts tests/lib/
git commit -m "feat(security): auth rate limits and trusted client ip"
```

---

## Task 10: Регистрация

**Files:**
- Create: `src/server/actions/auth-email.ts`
- Test: `tests/auth/register.test.ts`

Логика пишется чистой функцией `registerWithPassword(deps, input)`, где `deps = { store, now, sendMail }`; Server Action — тонкая обёртка, собирающая `deps` и лимиты.

- [ ] **Step 1: Написать падающие тесты по таблице коллизий из спеки**

```ts
it("creates an unverified user and sends a verify email", async () => { /* … */ });
it("rejects a blocked domain", async () => { /* … */ });
it("rejects a password shorter than 8 chars", async () => { /* … */ });
it("refuses when the email belongs to an OAuth account", async () => {
  // hasOAuthAccounts: true → error "oauth_account_exists", пароль НЕ трогается
});
it("refuses when the email is already verified", async () => { /* "already_registered" */ });
it("overwrites the password of an abandoned unverified registration", async () => { /* … */ });
it("claims a user that has neither password nor oauth accounts", async () => {
  // seed-юзеры и /api/dev/login: passwordHash null, hasOAuthAccounts false
});
it("refuses when the mail transport is unavailable", async () => { /* … */ });
```

Порядок проверок обязателен: `hasOAuthAccounts` → `emailVerified` → `passwordHash`. Дискриминатор — `accounts`, **не** `emailVerified`: у всех OAuth-юзеров он NULL, и проверка по нему открывала бы захват чужого аккаунта.

- [ ] **Step 2: Убедиться, что падают**

Run: `pnpm vitest run tests/auth/register.test.ts`
Expected: FAIL.

- [ ] **Step 3: Реализовать `registerWithPassword` + Server Action**

Server Action `register(formData)`:
1. `mailTransportAvailable()` — иначе `{ ok: false, error: "mail_unavailable" }` (гейт живёт не только в рендере: прямой вызов в обход UI завёл бы неподтверждаемый аккаунт).
2. `normalizeEmail`, zod-валидация, `checkPasswordRules`, `isBlockedDomain`.
3. `checkLimit(clientIp(headers()), "register")`.
4. Ветвление по таблице коллизий.
5. `hashPassword` → `createUser`/`setPassword` → `issueToken(store, userId, "verify")` → `sendMail(verifyEmail(...))`.
6. Возврат `{ ok: true, data: { sentTo: email } }`.

Там же — `checkEmailDomain(email)`: возвращает `{ blocked: boolean; domain: string | null }`, вызывается формой на blur. Список в браузер не уезжает.

- [ ] **Step 4: Повторное письмо подтверждения**

Спека требует его в трёх местах: кнопка «Отправить ещё раз» на экране «письмо отправлено», предложение переотправить при попытке входа в неподтверждённый аккаунт и отдельная строка в таблице лимитов. Без него аккаунт, до которого не дошло первое письмо, оказывается в тупике.

Тесты (дописать в тот же файл):

```ts
it("re-issues a verify token and sends the email again", async () => { /* … */ });
it("invalidates the previous link when a new one is sent", async () => { /* старый токен удалён */ });
it("answers identically for unknown and already verified emails", async () => { /* без перечисления */ });
it("respects the resend limit", async () => { /* resend по почте + mail_ip по IP */ });
```

Реализация `resendVerification(email)`: транспорт доступен → `checkLimit(email, "resend")` и `checkLimit(clientIp(...), "mail_ip")` → `findUserByEmail` → письмо шлём **только** если юзер есть, `passwordHash !== null` и `emailVerified === null`; шаблон `verifyEmailAgain` из Task 8. Ответ всегда одинаковый: «Если подтверждение требуется — письмо отправлено».

- [ ] **Step 5: Прогнать тесты**

Run: `pnpm vitest run tests/auth/register.test.ts`
Expected: PASS.

- [ ] **Step 6: Коммит**

```bash
git add src/server/actions/auth-email.ts tests/auth/register.test.ts
git commit -m "feat(auth): registration with email confirmation and resend"
```

---

## Task 11: Подтверждение почты

**Files:**
- Create: `src/app/api/auth/email/verify/route.ts`
- Test: `tests/auth/verify.test.ts`

- [ ] **Step 1: Написать падающие тесты**

Успех: `emailVerified` проставлен, сессия выдана, редирект на `/welcome`. Отказ: редирект на `/login?error=verify_token_invalid`. Стоп-лист на этом шаге **не** применяется — тест на это обязателен: домен из списка не должен ломать подтверждение уже созданного аккаунта.

- [ ] **Step 2: Убедиться, что падают**

Run: `pnpm vitest run tests/auth/verify.test.ts`
Expected: FAIL.

- [ ] **Step 3: Реализовать роут**

`GET /api/auth/email/verify?token=…`: `consumeToken(store, token, "verify")` → `markEmailVerified` → `issueSession` → cookie через `sessionCookieOptions` → редирект на `/welcome`. `export const runtime = "nodejs"` и `export const dynamic = "force-dynamic"` — как в VK-роуте.

- [ ] **Step 4: Прогнать тесты**

Run: `pnpm vitest run tests/auth/verify.test.ts`
Expected: PASS.

- [ ] **Step 5: Коммит**

```bash
git add src/app/api/auth/email/verify/ tests/auth/verify.test.ts
git commit -m "feat(auth): email confirmation route"
```

---

## Task 12: Вход

**Files:**
- Modify: `src/server/actions/auth-email.ts`
- Test: `tests/auth/login.test.ts`

- [ ] **Step 1: Написать падающие тесты**

```ts
it("issues a session on a correct password", async () => { /* … */ });
it("returns the same error for unknown email and wrong password", async () => { /* … */ });
it("runs a fake verify when the user does not exist", async () => { /* fakeVerify вызван */ });
it("points to OAuth when the user has accounts but no password", async () => { /* … */ });
it("behaves as unknown when the user has neither password nor accounts", async () => { /* … */ });
it("refuses an unverified account and offers to resend", async () => { /* … */ });
it("issues a session for a banned user (guard redirects later)", async () => { /* … */ });
it("respects the rate limit", async () => { /* … */ });
```

- [ ] **Step 2: Убедиться, что падают**

Run: `pnpm vitest run tests/auth/login.test.ts`
Expected: FAIL.

- [ ] **Step 3: Реализовать `loginWithPassword`**

Порядок ровно как в спеке: юзера нет → `fakeVerify()` + `invalid_credentials`; `passwordHash` пуст и есть привязки → `use_oauth`; `passwordHash` пуст и привязок нет → как «юзера нет»; пароль не сошёлся → `invalid_credentials`; `emailVerified` пуст → `email_not_verified` (форма на этот код показывает кнопку, дёргающую `resendVerification` из Task 10); иначе `issueSession` + cookie + `safeCallback`.

Забаненного пускаем: сессия выдаётся, `requireAuthState` уводит на `/banned` — одна дорога вместо двух.

- [ ] **Step 4: Прогнать тесты**

Run: `pnpm vitest run tests/auth/login.test.ts`
Expected: PASS.

- [ ] **Step 5: Коммит**

```bash
git add src/server/actions/auth-email.ts tests/auth/login.test.ts
git commit -m "feat(auth): password login"
```

---

## Task 13: Сброс пароля

**Files:**
- Modify: `src/server/actions/auth-email.ts`
- Create: `src/app/(auth)/reset/page.tsx`
- Test: `tests/auth/reset.test.ts`

- [ ] **Step 1: Написать падающие тесты**

```ts
it("answers identically whether or not the email exists", async () => { /* … */ });
it("does not issue a token for an oauth-only user", async () => { /* … */ });
it("does not issue a token for an unverified account", async () => { /* … */ });
it("sets the new password and drops every session", async () => { /* … */ });
it("deletes the remaining reset tokens after a successful reset", async () => { /* … */ });
it("rejects a reset token presented twice", async () => { /* без льготного окна */ });
```

- [ ] **Step 2: Убедиться, что падают**

Run: `pnpm vitest run tests/auth/reset.test.ts`
Expected: FAIL.

- [ ] **Step 3: Реализовать**

`requestPasswordReset(email)`: транспорт доступен → лимит по почте и по IP → `findUserByEmail` → токен выпускается только если `passwordHash !== null && emailVerified !== null` → письмо. Ответ **всегда** один и тот же.

`resetPassword(token, newPassword)`: `consumeToken(..., "reset")` → `checkPasswordRules` → `setPassword` → `dropAllSessions(userId)` → `deleteTokens(userId, "reset")` → `issueSession` → cookie → `/`.

`src/app/(auth)/reset/page.tsx` — Server Component: читает `?token=`, проверяет его существование и срок до отрисовки, при негодном показывает объяснение и ссылку на `/login`; иначе рендерит `ResetPasswordForm`.

- [ ] **Step 4: Прогнать тесты**

Run: `pnpm vitest run tests/auth/reset.test.ts`
Expected: PASS.

- [ ] **Step 5: Коммит**

```bash
git add src/server/actions/auth-email.ts "src/app/(auth)/reset/" tests/auth/reset.test.ts
git commit -m "feat(auth): password reset flow"
```

---

## Task 14: UI на `/login` и `/reset`

**Files:**
- Create: `src/components/auth/EmailAuthForm.tsx`, `src/components/auth/ResetPasswordForm.tsx`
- Modify: `src/app/(auth)/login/page.tsx`, `theme/content.ts`
- Test: `tests/components/email-auth-form.test.tsx`

- [ ] **Step 1: Написать падающие тесты компонента**

Через `@testing-library/react` (уже в проекте): переключение «Войти» / «Регистрация»; при вводе почты из стоп-листа под полем появляется красная строка; кнопка блокируется на время отправки (по образцу `useAsyncLock` в `ProviderButtons`); ошибка сервера показывается текстом.

- [ ] **Step 2: Убедиться, что падают**

Run: `pnpm vitest run tests/components/email-auth-form.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Реализовать форму**

Клиентский компонент с `useActionState`. Режимы: `login` | `register` | `forgot`. На `blur` поля почты дёргает `checkEmailDomain` и показывает красную строку под полем — заранее в форме про стоп-лист ничего не написано. Цвета только через токены `theme/tokens.css`, тексты — из `theme/content.ts`. Обязательны обе темы и мобильная ширина без горизонтального скролла.

- [ ] **Step 4: Встроить в `/login`**

В `src/app/(auth)/login/page.tsx`: форма входа рендерится всегда; регистрация и «забыли пароль» — при `mailTransportAvailable()`. Добавить разбор `?error=`: `OAuthAccountNotLinked` → «У этой почты уже есть вход по паролю», `email_taken` → то же для VK, `verify_token_invalid` → «Ссылка недействительна или устарела».

Страница сейчас вообще не принимает `searchParams`, а в Next 15 это `Promise` — сигнатура будет `{ searchParams: Promise<{ error?: string }> }` с `await`, иначе уйдёт время на отладку типов.

Экран «письмо отправлено» после регистрации и ответ `email_not_verified` при входе показывают кнопку «Отправить письмо ещё раз», дёргающую `resendVerification`; кнопка блокируется тем же `useAsyncLock`, что и провайдеры.

- [ ] **Step 5: Прогнать тесты и типы**

Run: `pnpm vitest run && pnpm exec tsc --noEmit && pnpm lint`
Expected: всё зелёное.

- [ ] **Step 6: Проверить руками**

`pnpm dev` без `SMTP_*`: регистрация → ссылка в консоли → `/welcome` → выбор ника. Проверить светлую и тёмную темы и ширину 320 px.

- [ ] **Step 7: Коммит**

```bash
git add src/components/auth/ "src/app/(auth)/login/page.tsx" theme/content.ts tests/components/
git commit -m "feat(auth): email form on the login screen"
```

---

## Task 15: Правка VK-флоу

**Files:**
- Modify: `src/lib/auth/oauth-vk.ts`, `src/app/api/oauth/vk/callback/route.ts`
- Test: `tests/auth/oauth-vk.test.ts`

Предварительно: `upsertUserAndSession` сейчас ходит в `getDb()` напрямую, поэтому тестировать её нечем — в репозитории есть единственный прецедент мока БД (`tests/storage/upload-route.test.ts`), и он покрывает только один `insert`. Первым делом функция переводится на порт `store.ts` из Task 6 (`findUserIdByAccount`, `findUserByEmail`, `createUserWithAccount`), после чего тесты пишутся на фикстуре в памяти без моков drizzle-цепочек.

- [ ] **Step 1: Написать падающие тесты**

```ts
it("finds an existing user by the accounts row", async () => { /* прежнее поведение живо */ });
it("does not link by email anymore", async () => { /* коллизия → email_taken, чужой аккаунт не тронут */ });
it("creates user and account atomically", async () => { /* падение вставки accounts не оставляет сироту */ });
it("still works for a vk account without email (placeholder address)", async () => { /* … */ });
```

- [ ] **Step 2: Убедиться, что падают**

Run: `pnpm vitest run tests/auth/oauth-vk.test.ts`
Expected: FAIL.

- [ ] **Step 3: Убрать склейку и добавить транзакцию**

`upsertUserAndSession` принимает `store: AuthStore` аргументом (по умолчанию — `drizzleAuthStore()`), и её тело сводится к: `findUserIdByAccount("vk", profile.user_id)` → нашли, выдаём сессию; не нашли — `createUserWithAccount(...)`, который сам вернёт `email_taken` на занятый адрес и сделает обе вставки в одной транзакции. Ветка поиска по `profile.email` (`oauth-vk.ts:172-179`) удаляется целиком. Callback-роут на `email_taken` редиректит на `/login?error=email_taken`.

Уже склеенные аккаунты не затрагиваются: они находятся по строке в `accounts`.

- [ ] **Step 4: Прогнать тесты**

Run: `pnpm vitest run tests/auth/`
Expected: PASS.

- [ ] **Step 5: Коммит**

```bash
git add src/lib/auth/oauth-vk.ts src/app/api/oauth/vk/ tests/auth/oauth-vk.test.ts
git commit -m "fix(auth): stop linking vk accounts by email"
```

---

## Task 16: Seed, dev-логин и документация

**Files:**
- Modify: `scripts/seed.ts`, `.env.example`, `docs/DEPLOY.md`, `CLAUDE.md`
- Test: `tests/auth/seed-passwords.test.ts`

- [ ] **Step 1: Убедиться, что kill-switch покрыт**

`devSeedPassword` уже написана и покрыта в Task 4 — она живёт в `src/lib/auth/password.ts`, а не в `scripts/seed.ts`: каталог `scripts/` вне алиаса `@/`, а `seed.ts` вызывает `main()` на верхнем уровне, поэтому импорт из теста полез бы в Postgres. Здесь только проверить, что тест из Task 4 зелёный.

Run: `pnpm vitest run tests/auth/password.test.ts`
Expected: PASS.

- [ ] **Step 2: Проставить пароли seed-юзерам**

В `scripts/seed.ts` пятерым владельцам добавить `passwordHash: await devSeedPassword(process.env.NODE_ENV)` и `emailVerified: new Date()`. Пароль (`DEV_SEED_PASSWORD`) печатается в вывод seed'а, чтобы им можно было войти сразу после `pnpm db:seed`.

**Идемпотентность:** seed выходит раньше, если город `kazan` уже есть, — на уже засеянной базе пароли не появятся. Поэтому проставление паролей делается отдельным шагом до этой проверки: `update users set password_hash=…, email_verified=now() where email like '%@seed.local' and password_hash is null`. Тогда `pnpm db:seed` на старой базе доводит владельцев до входибельного состояния, не пересевая всё заново.

Смысл: адреса `ownerN@seed.local` несуществующие, письмо туда не дойдёт, поэтому без этого шага вход по паролю на деве проверить нечем.

- [ ] **Step 3: Дописать `.env.example`**

```
# === Почта (регистрация по паролю) ===
# Без SMTP_* письма печатаются в консоль (только вне production),
# а в проде регистрация и сброс пароля скрыты.
# SMTP_HOST=smtp.yandex.ru
# SMTP_PORT=465
# SMTP_USER=noreply@example.ru
# SMTP_PASSWORD=
# SMTP_FROM=noreply@example.ru
# BLOCKED_EMAIL_DOMAINS=          # добавляется к встроенному стоп-листу
```

- [ ] **Step 4: Дописать `docs/DEPLOY.md`**

В раздел 6 добавить, что почта на своём домене поднимается в Яндекс 360, а SPF/DKIM обязательны, иначе письма улетают в спам. В чеклист после деплоя добавить: регистрация, письмо, подтверждение, вход, сброс.

- [ ] **Step 5: Обновить `CLAUDE.md`**

В разделе «Стек» к строке про Auth дописать третий способ входа; в карту кода добавить `src/lib/mail/`; в URL-таблицу — `/reset`; счётчик тестов обновить по факту.

- [ ] **Step 6: Финальная проверка**

Run: `pnpm test && pnpm exec tsc --noEmit && pnpm lint`
Expected: всё зелёное.

Затем остановить dev-сервер и прогнать `pnpm build` — общий каталог `.next`, иначе сборка падает.

- [ ] **Step 7: Коммит**

```bash
git add scripts/seed.ts .env.example docs/DEPLOY.md CLAUDE.md tests/auth/seed-passwords.test.ts
git commit -m "chore(auth): dev seed passwords and deployment docs"
```

---

## Ручная проверка после всего плана

Из спеки, раздел «Ручная проверка после реализации» — восемь пунктов. Отдельно стоит выделить последний: `@node-rs/argon2` нативный, а образ собирается на `node:20-alpine` с `output: "standalone"`. Прецедент `sharp` говорит, что трассировка справляется, но проверить старт контейнера и регистрацию внутри него надо явно, до продового деплоя.

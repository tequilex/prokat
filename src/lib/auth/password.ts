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

// Пароль, который seed раздаёт тестовым владельцам вне прода.
export const DEV_SEED_PASSWORD = "inrenta-dev-12345";

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

export function checkPasswordRules(plain: string, email: string): string | null {
  if (plain.length < MIN_LENGTH) return `Пароль короче ${MIN_LENGTH} символов`;
  if (plain.length > MAX_LENGTH) return `Пароль длиннее ${MAX_LENGTH} символов`;
  if (normalizeEmail(plain) === normalizeEmail(email)) return "Пароль не может совпадать с почтой";
  return null;
}

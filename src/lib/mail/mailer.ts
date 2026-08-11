import { getEnv } from "@/lib/env";

export type Mail = { to: string; subject: string; text: string };

export interface Transport {
  send(mail: Mail): Promise<void>;
}

// Транспорт выбирается по наличию SMTP_*: заданы → SMTP, пусты → печать в консоль.
// Консольный доступен только вне прода: в проде отсутствие SMTP означает
// «транспорта нет», и регистрация со сбросом просто недоступны.
let override: Transport | null = null;
let cached: Transport | null = null;

export function __setTransportForTests(t: Transport | null): void {
  override = t;
  cached = null;
}

export function mailTransportAvailable(): boolean {
  if (override) return true;
  const env = getEnv();
  return Boolean(env.SMTP_HOST) || env.NODE_ENV !== "production";
}

function consoleTransport(): Transport {
  return {
    async send(mail) {
      console.info(`[mail] to=${mail.to} subject=${mail.subject}\n${mail.text}`);
    },
  };
}

async function smtpTransport(): Promise<Transport> {
  const env = getEnv();
  const nodemailer = await import("nodemailer");
  const tx = nodemailer.createTransport({
    host: env.SMTP_HOST!,
    port: env.SMTP_PORT!,
    // 465 — implicit TLS, 587 — STARTTLS.
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER!, pass: env.SMTP_PASSWORD! },
  });
  return {
    async send(mail) {
      await tx.sendMail({ from: env.SMTP_FROM!, to: mail.to, subject: mail.subject, text: mail.text });
    },
  };
}

async function transport(): Promise<Transport> {
  if (override) return override;
  if (cached) return cached;
  const env = getEnv();
  cached = env.SMTP_HOST ? await smtpTransport() : consoleTransport();
  return cached;
}

// Ошибка отправки поднимается наверх: Server Action превращает её в понятное
// «Не удалось отправить письмо», а аккаунт остаётся неподтверждённым и его
// можно дожать кнопкой «Отправить ещё раз».
export async function sendMail(mail: Mail): Promise<void> {
  const tx = await transport();
  await tx.send(mail);
}

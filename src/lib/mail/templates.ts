import { content } from "@theme/content";
import type { Mail } from "@/lib/mail/mailer";

// Тексты живут в theme/content.ts по конвенции проекта. В каждом письме —
// срок жизни ссылки и строка «если это были не вы».
const m = content.auth.mail;

function body(intro: string, link: string, ttl: string): string {
  return `${intro}\n\n${link}\n\n${ttl}\n${m.ignore}\n\n— ${m.brand}`;
}

export function verifyEmail(to: string, link: string): Mail {
  return { to, subject: m.verifySubject, text: body(m.verifyIntro, link, m.verifyTtl) };
}

export function verifyEmailAgain(to: string, link: string): Mail {
  return { to, subject: m.verifyAgainSubject, text: body(m.verifyAgainIntro, link, m.verifyTtl) };
}

export function resetEmail(to: string, link: string): Mail {
  return { to, subject: m.resetSubject, text: body(m.resetIntro, link, m.resetTtl) };
}

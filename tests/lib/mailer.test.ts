import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { sendMail, __setTransportForTests } from "@/lib/mail/mailer";
import { verifyEmail, verifyEmailAgain, resetEmail } from "@/lib/mail/templates";
import { MAIL_DAILY_CAP, _resetForTests } from "@/lib/rate-limit";
import { content } from "@theme/content";

beforeEach(() => { _resetForTests(); });
afterEach(() => { __setTransportForTests(null); });

describe("mail templates", () => {
  const link = "https://example.ru/api/auth/email/verify?token=abc";

  it("puts the link and the ttl into the verify email", () => {
    const mail = verifyEmail("a@ya.ru", link);
    expect(mail.to).toBe("a@ya.ru");
    expect(mail.subject).toBeTruthy();
    expect(mail.text).toContain(link);
    expect(mail.text).toContain("24");
  });

  it("signs the letters with the site name", () => {
    // Письмо от чужого имени выглядит фишингом: подпись обязана совпадать с тем,
    // что человек видел на сайте.
    const mail = verifyEmail("a@ya.ru", link);
    expect(mail.subject).toContain(content.site.name);
    expect(mail.text.trimEnd()).toMatch(new RegExp(`${content.site.name}$`));
  });

  it("has a distinct subject for the repeat email", () => {
    expect(verifyEmailAgain("a@ya.ru", link).subject).not.toBe(verifyEmail("a@ya.ru", link).subject);
  });

  it("warns to ignore an unexpected reset email", () => {
    const mail = resetEmail("a@ya.ru", "https://example.ru/reset?token=abc");
    expect(mail.text).toMatch(/проигнорируйте/i);
    expect(mail.text).toContain("1 час");
  });
});

describe("sendMail", () => {
  it("delegates to the transport", async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    __setTransportForTests({ send });
    await sendMail({ to: "a@ya.ru", subject: "s", text: "t" });
    expect(send).toHaveBeenCalledOnce();
    expect(send).toHaveBeenCalledWith({ to: "a@ya.ru", subject: "s", text: "t" });
  });

  it("propagates a transport failure so the action can tell the user", async () => {
    __setTransportForTests({ send: vi.fn().mockRejectedValue(new Error("smtp down")) });
    await expect(sendMail({ to: "a@ya.ru", subject: "s", text: "t" })).rejects.toThrow("smtp down");
  });

  it("stops at the daily cap instead of letting the provider block the mailbox", async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    __setTransportForTests({ send });

    for (let i = 0; i < MAIL_DAILY_CAP; i++) {
      await sendMail({ to: `a${i}@ya.ru`, subject: "s", text: "t" });
    }
    await expect(sendMail({ to: "over@ya.ru", subject: "s", text: "t" })).rejects.toThrow(/daily mail cap/i);
    expect(send).toHaveBeenCalledTimes(MAIL_DAILY_CAP);
  });
});

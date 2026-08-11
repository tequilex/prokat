import { describe, it, expect, vi, afterEach } from "vitest";
import { sendMail, __setTransportForTests } from "@/lib/mail/mailer";
import { verifyEmail, verifyEmailAgain, resetEmail } from "@/lib/mail/templates";

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
});

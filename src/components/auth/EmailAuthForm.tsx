"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { Button } from "@/components/ui/button";
import {
  checkEmailDomain, login, register, requestReset, resendVerificationEmail,
} from "@/server/actions/auth-email";

const INPUT = "h-11 w-full rounded-pill border border-border bg-background px-5 text-foreground";

type Mode = "login" | "register" | "forgot";

export function EmailAuthForm({
  canRegister,
  callbackUrl = "/",
}: {
  // Регистрация и сброс доступны только при рабочем почтовом транспорте.
  // Вход остаётся всегда: проверка пароля письма не требует.
  canRegister: boolean;
  callbackUrl?: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [domainError, setDomainError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [pending, startTransition] = useTransition();

  const switchTo = (next: Mode) => {
    setMode(next);
    setError(null);
    setDomainError(null);
    setNeedsVerification(false);
  };

  // Заранее в форме про стоп-лист ничего не написано — строка появляется только
  // когда человек ввёл такой адрес. Список при этом остаётся на сервере.
  const checkDomain = () => {
    if (mode !== "register" || !email.includes("@")) return;
    startTransition(async () => {
      const res = await checkEmailDomain(email);
      setDomainError(res.blocked ? res.message : null);
    });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNeedsVerification(false);

    startTransition(async () => {
      if (mode === "register") {
        if (password !== password2) { setError("Пароли не совпадают"); return; }
        const res = await register({ email, password });
        if (res.ok) setSentTo(res.data.sentTo);
        else setError(res.error);
        return;
      }

      if (mode === "forgot") {
        await requestReset(email);
        // Ответ всегда одинаковый — форма не должна работать проверялкой аккаунтов.
        setSentTo(email);
        return;
      }

      const res = await login({ email, password, callbackUrl });
      // Путь приходит из рантайма и уже пропущен через safeCallback на сервере,
      // а typedRoutes ждёт литерал — отсюда приведение.
      if (res.ok) { router.push(res.data.redirectTo as Route); router.refresh(); return; }
      setError(res.error);
      setNeedsVerification(res.code === "email_not_verified");
    });
  };

  const resend = () => {
    startTransition(async () => {
      await resendVerificationEmail(email);
      setResent(true);
    });
  };

  if (sentTo) {
    return (
      <div className="flex flex-col gap-4 text-sm">
        <p className="text-foreground">
          {mode === "forgot"
            ? <>Если почта <span className="font-medium">{sentTo}</span> зарегистрирована, мы отправили на неё ссылку для смены пароля.</>
            : <>Письмо отправлено на <span className="font-medium">{sentTo}</span>. Откройте ссылку из него, чтобы завершить регистрацию.</>}
        </p>
        {mode === "register" && (
          <Button type="button" variant="outline" disabled={pending || resent} onClick={resend}>
            {resent ? "Письмо отправлено ещё раз" : "Отправить письмо ещё раз"}
          </Button>
        )}
        <button type="button" className="text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => { setSentTo(null); setResent(false); switchTo("login"); }}>
          Вернуться ко входу
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        Почта
        <input
          type="email" required autoComplete="email" value={email} className={INPUT}
          placeholder="pochta@example.ru"
          onChange={(e) => { setEmail(e.target.value); setDomainError(null); }}
          onBlur={checkDomain}
        />
      </label>
      {domainError && <p className="text-sm text-destructive">{domainError}</p>}

      {mode !== "forgot" && (
        <label className="flex flex-col gap-1 text-sm">
          Пароль
          <input
            type="password" required minLength={8} className={INPUT}
            placeholder={mode === "register" ? "Не короче 8 символов" : "Ваш пароль"}
            autoComplete={mode === "register" ? "new-password" : "current-password"}
            value={password} onChange={(e) => setPassword(e.target.value)}
          />
        </label>
      )}

      {mode === "register" && (
        <label className="flex flex-col gap-1 text-sm">
          Повторите пароль
          <input type="password" required minLength={8} autoComplete="new-password" className={INPUT}
            placeholder="Тот же пароль ещё раз"
            value={password2} onChange={(e) => setPassword2(e.target.value)} />
        </label>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
      {needsVerification && (
        <Button type="button" variant="outline" disabled={pending || resent} onClick={resend}>
          {resent ? "Письмо отправлено" : "Отправить письмо ещё раз"}
        </Button>
      )}

      <Button type="submit" disabled={pending || Boolean(domainError)}>
        {mode === "login" ? "Войти" : mode === "register" ? "Зарегистрироваться" : "Отправить ссылку"}
      </Button>

      <div className="flex flex-wrap justify-between gap-2 text-sm text-muted-foreground">
        {mode === "login" ? (
          <>
            {canRegister && (
              <button type="button" className="hover:text-foreground transition-colors" onClick={() => switchTo("register")}>
                Регистрация
              </button>
            )}
            {canRegister && (
              <button type="button" className="hover:text-foreground transition-colors" onClick={() => switchTo("forgot")}>
                Забыли пароль?
              </button>
            )}
          </>
        ) : (
          <button type="button" className="hover:text-foreground transition-colors" onClick={() => switchTo("login")}>
            Уже есть аккаунт — войти
          </button>
        )}
      </div>
    </form>
  );
}

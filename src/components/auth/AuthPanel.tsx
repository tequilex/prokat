"use client";

// Вход двумя шагами: почта с паролем на первом экране, список сервисов — на
// втором. Шаг живёт состоянием внутри карточки, а не отдельным URL: тогда один
// и тот же компонент работает и на /login, и в модалке брони, где нельзя
// уходить со страницы, чтобы не потерять выбранные даты.

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { EmailAuthForm } from "@/components/auth/EmailAuthForm";
import { ProviderButtons } from "@/components/auth/ProviderButtons";

export function AuthPanel({
  nextAuthProviders,
  vkEnabled,
  canRegister,
  callbackUrl = "/",
  title = null,
}: {
  nextAuthProviders: string[];
  vkEnabled: boolean;
  // Регистрация и сброс требуют письма; вход по паролю — нет.
  canRegister: boolean;
  callbackUrl?: string;
  // Заголовок первого шага. null — когда заголовок уже даёт страница
  // (на /login это <h1>), иначе он задваивается.
  title?: string | null;
}) {
  const [step, setStep] = useState<"email" | "providers">("email");
  const hasProviders = nextAuthProviders.length > 0 || vkEnabled;

  if (step === "providers") {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setStep("email")}
            aria-label="Назад ко входу по почте"
            className="-ml-1 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h2 className="font-display text-lg">Выберите сервис</h2>
        </div>

        <ProviderButtons
          nextAuthProviders={nextAuthProviders}
          vkEnabled={vkEnabled}
          callbackUrl={callbackUrl}
        />

        <button
          type="button"
          onClick={() => setStep("email")}
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Войти по почте
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {title && <h2 className="font-display text-lg">{title}</h2>}

      <EmailAuthForm canRegister={canRegister} callbackUrl={callbackUrl} />

      {hasProviders && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">или</span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <button
            type="button"
            onClick={() => setStep("providers")}
            className="h-11 w-full rounded-pill border border-border bg-muted/50 text-sm font-medium transition-colors hover:bg-muted"
          >
            Войти через сервис
          </button>
        </div>
      )}
    </div>
  );
}

"use client";

// Модальное окно входа в точке брони: пользователь не уходит со страницы,
// а после OAuth возвращается на callbackUrl (URL позиции с выбранными датами).

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { content } from "@theme/content";
import { ProviderButtons } from "@/components/auth/ProviderButtons";

export function LoginDialog({
  open, onOpenChange, callbackUrl, nextAuthProviders, vkEnabled, isDev,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  callbackUrl: string;
  nextAuthProviders: string[];
  vkEnabled: boolean;
  isDev: boolean;
}) {
  const hasAny = nextAuthProviders.length > 0 || vkEnabled;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 shadow-lg">
          <Dialog.Title className="font-display text-xl">
            Войдите, чтобы забронировать
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-muted-foreground">
            Выбранные даты сохранятся — после входа вы вернётесь на этот шаг.
          </Dialog.Description>

          <div className="mt-5">
            {hasAny ? (
              <ProviderButtons
                nextAuthProviders={nextAuthProviders}
                vkEnabled={vkEnabled}
                callbackUrl={callbackUrl}
              />
            ) : (
              <p className="text-center text-sm text-muted-foreground">{content.auth.noProviders}</p>
            )}
          </div>

          {isDev && (
            <a
              href={`/api/dev/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
              className="mt-4 block w-full rounded-md border border-border bg-muted/50 px-4 py-2 text-center text-sm font-medium hover:bg-muted"
            >
              Войти как Dev User (dev only)
            </a>
          )}

          <Dialog.Close asChild>
            <button
              type="button"
              aria-label="Закрыть"
              className="absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

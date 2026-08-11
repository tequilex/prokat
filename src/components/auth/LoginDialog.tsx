"use client";

// Модальное окно входа в точке брони: пользователь не уходит со страницы,
// а после OAuth возвращается на callbackUrl (URL позиции с выбранными датами).

import { content } from "@theme/content";
import { Modal, ModalContent, ModalTitle } from "@/components/ui/Modal";
import { AuthPanel } from "@/components/auth/AuthPanel";

export function LoginDialog({
  open, onOpenChange, callbackUrl, nextAuthProviders, vkEnabled, canRegisterByEmail,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  callbackUrl: string;
  nextAuthProviders: string[];
  vkEnabled: boolean;
  canRegisterByEmail: boolean;
}) {
  const hasAny = nextAuthProviders.length > 0 || vkEnabled;

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent
        // Описания у окна нет — иначе Radix ищет несуществующий элемент.
        aria-describedby={undefined}
        className="md:max-w-sm"
      >
        {/* Заголовок скрыт визуально, но нужен: без него Radix ругается, а
            скринридер не понимает, что за окно открылось. */}
        <ModalTitle className="sr-only">Вход</ModalTitle>

        {hasAny || canRegisterByEmail ? (
          <AuthPanel
            nextAuthProviders={nextAuthProviders}
            vkEnabled={vkEnabled}
            canRegister={canRegisterByEmail}
            callbackUrl={callbackUrl}
          />
        ) : (
          <p className="text-center text-sm text-muted-foreground">{content.auth.noProviders}</p>
        )}
      </ModalContent>
    </Modal>
  );
}

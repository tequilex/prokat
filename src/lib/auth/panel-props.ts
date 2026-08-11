import { buildEdgeConfig } from "@/lib/auth/config.edge";
import { getEnv } from "@/lib/env";
import { mailTransportAvailable } from "@/lib/mail/mailer";

// Что показывать в карточке входа: список штатных провайдеров Auth.js, флаг VK
// (у него собственный роут) и доступность почтового транспорта — без него
// регистрация и сброс пароля не завершить, поэтому они скрыты.
// Считается на сервере и прокидывается в клиентские компоненты, которые
// открывают вход модалкой (хедер, таб-бар, баннер на главной, точка брони).

export type AuthPanelProps = {
  nextAuthProviders: string[];
  vkEnabled: boolean;
  canRegisterByEmail: boolean;
};

export function authPanelProps(): AuthPanelProps {
  const env = getEnv();
  return {
    nextAuthProviders: (buildEdgeConfig().providers ?? []).flatMap((p) => {
      const id = (p as { id?: string }).id;
      return id ? [id] : [];
    }),
    vkEnabled: Boolean(env.VK_CLIENT_ID && env.VK_CLIENT_SECRET),
    canRegisterByEmail: mailTransportAvailable(),
  };
}

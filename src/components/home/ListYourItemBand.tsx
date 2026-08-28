import Link from "next/link";
import { content } from "@theme/content";
import { LoginTrigger } from "@/components/auth/LoginTrigger";

export function ListYourItemBand({
  href,
  authProps,
}: {
  href: string;
  // Задан — значит перед нами аноним: кнопка открывает вход модалкой вместо
  // ухода на /login.
  authProps?: { nextAuthProviders: string[]; vkEnabled: boolean; canRegisterByEmail: boolean };
}) {
  const cta = "shrink-0 rounded-lg bg-background px-5 py-2.5 text-sm font-semibold text-foreground transition-transform active:scale-[0.97]";

  return (
    <section className="flex flex-col items-start gap-4 rounded-lg bg-foreground px-6 py-8 text-background sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-lg font-semibold">{content.home.bandTitle}</h2>
        <p className="mt-1 text-sm text-background/70">{content.home.bandText}</p>
      </div>
      {authProps ? (
        <LoginTrigger {...authProps} className={cta}>{content.home.bandCta}</LoginTrigger>
      ) : (
        <Link href={href as never} className={cta}>{content.home.bandCta}</Link>
      )}
    </section>
  );
}

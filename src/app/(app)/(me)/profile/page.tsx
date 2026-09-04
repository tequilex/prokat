import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAuthState } from "@/lib/auth/guard";
import { getUserProfile, getCabinetIdentity } from "@/server/me";
import { getActiveCities } from "@/server/catalog";
import { countNewRequests } from "@/server/owner";
import { ProfileForm } from "@/components/me/ProfileForm";
import { ProfileCoverField } from "@/components/me/ProfileCoverField";
import { ChangePasswordForm } from "@/components/me/ChangePasswordForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Профиль", robots: { index: false } };

// Человекочитаемые названия провайдеров входа (accounts.provider).
const PROVIDER_LABELS: Record<string, string> = {
  yandex: "Яндекс ID",
  vkid: "ВКонтакте",
  mail_ru: "Мой Мир@mail.ru",
  ok_ru: "Одноклассники",
};

export default async function ProfilePage() {
  const session = await requireAuthState();
  if (!session) redirect("/login?from=/profile");

  // identity и счётчик нужны миниатюре шапки в выборе обложки — превью
  // показывает страницу такой, какой её увидят.
  const [profile, identity, newCount, cities] = await Promise.all([
    getUserProfile(session.user.id),
    getCabinetIdentity(session.user.id),
    countNewRequests(session.user.id),
    getActiveCities(),
  ]);
  if (!profile || !identity) redirect("/login");
  const { user, providers } = profile;

  return (
    <section aria-label="Профиль" className="flex flex-col gap-5">
      <div className="surface p-5 sm:p-6">
        <h2 className="mb-3 text-lg font-semibold">Данные</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          {user.email}
        </p>
        {/* Город могли отключить уже после того, как человек его выбрал. В
          * списке активных его нет, <select> нарисовался бы пустым, но со
          * старым id в состоянии — и любое сохранение, хоть имени, падало бы с
          * ошибкой про город, которого человек не трогал. Показываем «Не
          * указан», что правде и соответствует. */}
        <ProfileForm
          initialName={user.name ?? ""}
          initialPhone={user.phone ?? ""}
          initialBio={user.bio ?? ""}
          initialCityId={cities.some((c) => c.id === user.cityId) ? user.cityId! : ""}
          cities={cities.map((c) => ({ id: c.id, name: c.name, slug: c.slug }))}
        />
        <div className="mt-5">
          <h3 className="mb-2 text-sm font-medium">Обложка профиля</h3>
          <ProfileCoverField me={identity} pendingCount={newCount} />
        </div>
        <p className="mt-3 text-sm">
          <a href={`/u/${user.id}`} className="text-accent hover:underline underline-offset-2">
            Открыть мой публичный профиль →
          </a>
        </p>
      </div>

      {/* Только аккаунтам с паролем: OAuth-юзерам менять нечего, а задать пароль
        * им можно лишь через подтверждение почты — см. docs/BACKLOG.md. */}
      {user.passwordHash !== null && (
        <div className="surface p-5 sm:p-6">
          <h2 className="mb-3 text-lg font-semibold">Безопасность</h2>
          <ChangePasswordForm />
        </div>
      )}

      <div className="surface p-5 sm:p-6">
        <h2 className="mb-3 text-lg font-semibold">Способы входа</h2>
        {providers.length === 0 && user.passwordHash !== null ? (
          <p className="text-sm text-muted-foreground">
            Вход по почте с паролем.
          </p>
        ) : providers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Нет привязанных OAuth-аккаунтов (dev-вход).
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {providers.map((p) => (
              <li key={p} className="rounded-sm border border-border px-3 py-1.5 text-sm">
                {PROVIDER_LABELS[p] ?? p}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Привязка дополнительных способов входа появится позже.
        </p>
      </div>
    </section>
  );
}

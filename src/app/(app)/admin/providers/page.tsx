import type { Metadata } from "next";
import Link from "next/link";
import { adminListProviders } from "@/server/admin";
import { adminSetProviderVerified } from "@/server/actions/admin";
import { ActionButton } from "@/components/admin/ActionButton";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Прокаты — админка", robots: { index: false } };

export default async function AdminProvidersPage() {
  const rows = await adminListProviders();

  return (
    <section aria-label="Прокаты">
      <p className="mb-4 text-sm text-muted-foreground">{rows.length} прокатов</p>
      <ul className="flex flex-col gap-3">
        {rows.map(({ provider, cityName, citySlug, ownerEmail, listingCount }) => (
          <li key={provider.id} className="rounded-lg border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <Link href={`/${citySlug}/${provider.slug}` as never} className="font-medium hover:underline underline-offset-2">
                  {provider.name}
                </Link>
                {provider.isVerified && (
                  <span className="ml-2 rounded-pill bg-primary/10 px-2 py-0.5 text-xs">проверен</span>
                )}
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {cityName} · {ownerEmail} · {listingCount} позиций ·{" "}
                  {provider.createdAt.toLocaleDateString("ru-RU")}
                </p>
              </div>
              <ActionButton
                label={provider.isVerified ? "Снять отметку" : "Отметить проверенным"}
                action={adminSetProviderVerified.bind(null, provider.id, !provider.isVerified)}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

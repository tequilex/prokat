import type { Metadata } from "next";
import Link from "next/link";
import { adminListListings } from "@/server/admin";
import { adminSetListingStatus } from "@/server/actions/admin";
import { ActionButton } from "@/components/admin/ActionButton";
import { formatPrice } from "@/lib/catalog/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Позиции — админка", robots: { index: false } };

const STATUS_LABEL: Record<string, string> = {
  active: "активна",
  hidden: "скрыта",
  archived: "архив",
  on_moderation: "на модерации",
};

export default async function AdminListingsPage() {
  const rows = await adminListListings();

  return (
    <section aria-label="Позиции">
      <p className="mb-4 text-sm text-muted-foreground">Последние {rows.length} позиций</p>
      <ul className="flex flex-col gap-2">
        {rows.map(({ listing, providerName, providerSlug, citySlug }) => (
          <li key={listing.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card px-4 py-3">
            <div className="min-w-0">
              <Link
                href={`/${citySlug}/${providerSlug}/${listing.slug}` as never}
                className="font-medium hover:underline underline-offset-2"
              >
                {listing.title}
              </Link>
              <p className="text-sm text-muted-foreground">
                {providerName}
                {listing.priceDay !== null ? ` · ${formatPrice(listing.priceDay)}/сутки` : ""}
                {" · "}{STATUS_LABEL[listing.status] ?? listing.status}
              </p>
            </div>
            <div className="flex gap-2">
              {listing.status !== "active" && (
                <ActionButton label="Активировать" action={adminSetListingStatus.bind(null, listing.id, "active")} />
              )}
              {listing.status === "active" && (
                <ActionButton
                  label="Скрыть"
                  confirmText="Скрыть позицию из каталога?"
                  action={adminSetListingStatus.bind(null, listing.id, "hidden")}
                />
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

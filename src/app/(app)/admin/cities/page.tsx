import type { Metadata } from "next";
import { adminListCities } from "@/server/admin";
import { adminSetCityActive } from "@/server/actions/admin";
import { ActionButton } from "@/components/admin/ActionButton";
import { CityForm } from "@/components/admin/CityForm";
import { listingsCountLabel } from "@/lib/catalog/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Города — админка", robots: { index: false } };

export default async function AdminCitiesPage() {
  const rows = await adminListCities();

  return (
    <section aria-label="Города" className="flex flex-col gap-6">
      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">Добавить город</h2>
        <CityForm />
      </div>

      <ul className="flex flex-col gap-2">
        {rows.map(({ city, listingCount }) => (
          <li key={city.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card px-4 py-3">
            <div>
              <span className="font-medium">{city.name}</span>
              {!city.isActive && (
                <span className="ml-2 rounded-pill bg-muted px-2 py-0.5 text-xs text-muted-foreground">отключён</span>
              )}
              <p className="text-sm text-muted-foreground">
                /{city.slug}{city.region ? ` · ${city.region}` : ""} · {listingsCountLabel(listingCount)}
              </p>
            </div>
            <ActionButton
              label={city.isActive ? "Отключить" : "Включить"}
              confirmText={city.isActive ? "Отключить город? Его страницы пропадут из каталога." : undefined}
              action={adminSetCityActive.bind(null, city.id, !city.isActive)}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

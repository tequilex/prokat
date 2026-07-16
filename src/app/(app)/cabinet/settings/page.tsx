import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAuthState } from "@/lib/auth/guard";
import { getOwnerProvider, getProviderCity } from "@/server/owner";
import { getActiveCities } from "@/server/catalog";
import { ProviderForm } from "@/components/cabinet/ProviderForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Настройки проката", robots: { index: false } };

export default async function CabinetSettingsPage() {
  const session = await requireAuthState();
  if (!session) redirect("/login?from=/cabinet");
  const provider = await getOwnerProvider(session.user.id);
  if (!provider) redirect("/cabinet/new");

  const [cities, city] = await Promise.all([
    getActiveCities(),
    getProviderCity(provider.cityId),
  ]);

  const phones = Array.isArray(provider.phones) ? (provider.phones as string[]) : [];
  const workHours = provider.workHoursJson && typeof provider.workHoursJson === "object"
    && "text" in (provider.workHoursJson as Record<string, unknown>)
    ? String((provider.workHoursJson as Record<string, unknown>).text)
    : "";

  return (
    <section aria-label="Настройки проката">
      {city && (
        <p className="mb-4 text-sm text-muted-foreground">
          Публичная страница: /{city.slug}/{provider.slug}
        </p>
      )}
      <ProviderForm
        mode="edit"
        cities={cities.map((c) => ({ id: c.id, name: c.name }))}
        initial={{
          name: provider.name,
          cityId: provider.cityId,
          description: provider.description ?? "",
          address: provider.address ?? "",
          phones: phones.join(", "),
          workHours,
        }}
      />
    </section>
  );
}

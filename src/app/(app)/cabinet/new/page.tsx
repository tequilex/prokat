import type { Metadata } from "next";
import { getActiveCities } from "@/server/catalog";
import { ProviderForm } from "@/components/cabinet/ProviderForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Создать прокат", robots: { index: false } };

export default async function ProviderOnboardingPage() {
  const cities = await getActiveCities();
  return (
    <main>
      <h1 className="font-display text-2xl font-bold">Создайте свой прокат</h1>
      <p className="mt-2 max-w-lg text-sm text-muted-foreground">
        Укажите контакты и адрес — они будут видны клиентам в каталоге.
        После создания добавьте позиции, и они появятся в выдаче.
      </p>
      <div className="mt-6">
        <ProviderForm
          mode="create"
          cities={cities.map((c) => ({ id: c.id, name: c.name }))}
          initial={{
            name: "", cityId: cities.length === 1 ? cities[0].id : "",
            description: "", address: "", phones: "", workHours: "",
          }}
        />
      </div>
    </main>
  );
}

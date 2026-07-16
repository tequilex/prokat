import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAuthState } from "@/lib/auth/guard";
import { getOwnerProvider, getProviderStats } from "@/server/owner";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Статистика", robots: { index: false } };

export default async function CabinetStatsPage() {
  const session = await requireAuthState();
  if (!session) redirect("/login?from=/cabinet");
  const provider = await getOwnerProvider(session.user.id);
  if (!provider) redirect("/cabinet/new");

  const stats = await getProviderStats(provider.id);
  const totalViews = stats.reduce((s, x) => s + x.views30d, 0);
  const totalRequests = stats.reduce((s, x) => s + x.requests30d, 0);

  return (
    <section aria-label="Статистика за 30 дней">
      <p className="mb-4 text-sm text-muted-foreground">
        За последние 30 дней: {totalViews} просмотров, {totalRequests} заявок.
      </p>
      {stats.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">Добавьте позиции — здесь появится статистика.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Позиция</th>
                <th className="py-2 pr-3 font-medium">Просмотры</th>
                <th className="py-2 font-medium">Заявки</th>
              </tr>
            </thead>
            <tbody>
              {stats
                .slice()
                .sort((a, b) => b.views30d - a.views30d)
                .map((s) => (
                  <tr key={s.listingId} className="border-b border-border">
                    <td className="py-2 pr-3">{s.title}</td>
                    <td className="py-2 pr-3">{s.views30d}</td>
                    <td className="py-2">{s.requests30d}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

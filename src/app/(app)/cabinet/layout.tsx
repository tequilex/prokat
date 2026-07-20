// Каркас кабинета владельца. НИКАКИХ redirect'ов здесь: layout кэшируется
// при client-side навигации — гейты живут в страницах (нет провайдера →
// /cabinet/new, /cabinet/new с провайдером → /cabinet/requests).

import { requireAuthState } from "@/lib/auth/guard";
import { redirect } from "next/navigation";
import { countNewRequests, getOwnerProvider } from "@/server/owner";
import { AccountShell } from "@/components/account/AccountShell";
import { buildAccountNav } from "@/components/account/accountNav";

export default async function CabinetLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuthState();
  if (!session) redirect("/login?from=/cabinet");

  const provider = await getOwnerProvider(session.user.id);
  if (!provider) {
    return <div className="mx-auto w-full max-w-5xl px-4 py-6">{children}</div>;
  }

  const newCount = await countNewRequests(provider.id);

  return (
    <AccountShell
      title="Кабинет"
      items={buildAccountNav({ hasProvider: true, newRequestsCount: newCount })}
    >
      {children}
    </AccountShell>
  );
}

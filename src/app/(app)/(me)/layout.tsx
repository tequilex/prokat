// Личный кабинет покупателя: заявки и профиль.

import { redirect } from "next/navigation";
import { requireAuthState } from "@/lib/auth/guard";
import { countNewRequests, getOwnerProvider } from "@/server/owner";
import { AccountShell } from "@/components/account/AccountShell";
import { buildAccountNav } from "@/components/account/accountNav";

export default async function MeLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuthState();
  if (!session) redirect("/login?from=/requests");

  // Единая навигация кабинета: owner-табы появятся, если у пользователя есть прокат.
  const provider = await getOwnerProvider(session.user.id);
  const newCount = provider ? await countNewRequests(provider.id) : 0;

  return (
    <AccountShell
      title="Кабинет"
      items={buildAccountNav({ hasProvider: Boolean(provider), newRequestsCount: newCount })}
    >
      {children}
    </AccountShell>
  );
}

// Личная зона кабинета (заявки, профиль). Единая навигация: owner-табы
// показываются всем залогиненным юзерам.

import { redirect } from "next/navigation";
import { requireAuthState } from "@/lib/auth/guard";
import { countNewRequests } from "@/server/owner";
import { getCabinetIdentity } from "@/server/me";
import { AccountShell } from "@/components/account/AccountShell";
import { buildAccountNav } from "@/components/account/accountNav";

export default async function MeLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuthState();
  if (!session) redirect("/login?from=/requests");

  const [newCount, identity] = await Promise.all([
    countNewRequests(session.user.id),
    getCabinetIdentity(session.user.id),
  ]);

  return (
    <AccountShell
      groups={buildAccountNav({ newRequestsCount: newCount })}
      identity={identity}
    >
      {children}
    </AccountShell>
  );
}

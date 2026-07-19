// Личный кабинет покупателя: заявки и профиль.

import { redirect } from "next/navigation";
import { requireAuthState } from "@/lib/auth/guard";
import { AccountShell } from "@/components/account/AccountShell";

export default async function MeLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuthState();
  if (!session) redirect("/login?from=/requests");

  return (
    <AccountShell
      title="Личный кабинет"
      items={[
        { href: "/requests", label: "Мои заявки" },
        { href: "/profile", label: "Профиль" },
      ]}
    >
      {children}
    </AccountShell>
  );
}

// Админка. Доступ — только role=admin (assertAdmin редиректит остальных).

import { assertAdmin } from "@/lib/auth/assert-admin";
import { AccountShell } from "@/components/account/AccountShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await assertAdmin();

  return (
    <AccountShell
      groups={[
        {
          title: "модерация",
          items: [
            { href: "/admin/listings", label: "Объявления" },
            { href: "/admin/requests", label: "Заявки" },
            { href: "/admin/users", label: "Пользователи" },
          ],
        },
        {
          title: "справочники",
          items: [
            { href: "/admin/cities", label: "Города" },
            { href: "/admin/categories", label: "Категории" },
          ],
        },
      ]}
    >
      {children}
    </AccountShell>
  );
}

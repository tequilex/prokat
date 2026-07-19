// Админка. Доступ — только role=admin (assertAdmin редиректит остальных).

import { assertAdmin } from "@/lib/auth/assert-admin";
import { AccountShell } from "@/components/account/AccountShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await assertAdmin();

  return (
    <AccountShell
      title="Админка"
      items={[
        { href: "/admin/providers", label: "Прокаты" },
        { href: "/admin/listings", label: "Позиции" },
        { href: "/admin/cities", label: "Города" },
        { href: "/admin/categories", label: "Категории" },
        { href: "/admin/requests", label: "Заявки" },
        { href: "/admin/users", label: "Пользователи" },
      ]}
    >
      {children}
    </AccountShell>
  );
}

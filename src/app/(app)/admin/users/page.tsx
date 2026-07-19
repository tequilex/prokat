import type { Metadata } from "next";
import { adminListUsers } from "@/server/admin";
import { adminBanUser, adminUnbanUser } from "@/server/actions/admin";
import { ActionButton } from "@/components/admin/ActionButton";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Пользователи — админка", robots: { index: false } };

export default async function AdminUsersPage() {
  const rows = await adminListUsers();

  return (
    <section aria-label="Пользователи">
      <p className="mb-4 text-sm text-muted-foreground">Последние {rows.length} пользователей</p>
      <ul className="flex flex-col gap-2">
        {rows.map(({ user, requestCount }) => (
          <li key={user.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card px-4 py-3">
            <div className="min-w-0">
              <span className="font-medium">{user.name ?? user.email}</span>
              {user.username && <span className="ml-2 text-sm text-muted-foreground">@{user.username}</span>}
              {user.role !== "user" && (
                <span className="ml-2 rounded-pill bg-primary/10 px-2 py-0.5 text-xs">{user.role}</span>
              )}
              {user.bannedAt && (
                <span className="ml-2 rounded-pill bg-destructive/15 px-2 py-0.5 text-xs">забанен</span>
              )}
              <p className="text-sm text-muted-foreground">
                {user.email} · {requestCount} заявок · с {user.createdAt.toLocaleDateString("ru-RU")}
                {user.banReason ? ` · причина бана: ${user.banReason}` : ""}
              </p>
            </div>
            {user.bannedAt ? (
              <ActionButton
                label="Разбанить"
                confirmText="Разблокировать пользователя?"
                action={adminUnbanUser.bind(null, user.id)}
              />
            ) : (
              <ActionButton
                label="Забанить"
                promptText="Причина блокировки (минимум 5 символов):"
                variant="ghost"
                action={adminBanUser.bind(null, user.id)}
              />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

// Каркас кабинета владельца: заголовок и табы. НИКАКИХ redirect'ов здесь:
// layout кэшируется при client-side навигации и не имеет надёжного pathname —
// redirect из layout ловил цикл. Онбординг-гейт живёт в страницах:
// каждая страница кабинета сама редиректит на /cabinet/new без провайдера,
// а /cabinet/new — на /cabinet/requests, если прокат уже есть.

import { requireAuthState } from "@/lib/auth/guard";
import { redirect } from "next/navigation";
import { countNewRequests, getOwnerProvider } from "@/server/owner";
import { CabinetNav } from "@/components/cabinet/CabinetNav";

export default async function CabinetLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuthState();
  if (!session) redirect("/login?from=/cabinet");

  const provider = await getOwnerProvider(session.user.id);
  const newCount = provider ? await countNewRequests(provider.id) : 0;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      {provider && (
        <>
          <h1 className="font-display text-2xl font-bold">{provider.name}</h1>
          <CabinetNav newCount={newCount} />
        </>
      )}
      <div className="mt-5">{children}</div>
    </div>
  );
}

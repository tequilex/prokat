import { redirect } from "next/navigation";
import { requireAuthState } from "@/lib/auth/guard";
import { getOwnerProvider } from "@/server/owner";

export const dynamic = "force-dynamic";

// Точка входа кабинета: с прокатом — на заявки, без — на онбординг.
export default async function CabinetIndex() {
  const session = await requireAuthState();
  if (!session) redirect("/login?from=/cabinet");
  const provider = await getOwnerProvider(session.user.id);
  redirect(provider ? "/cabinet/requests" : "/cabinet/new");
}

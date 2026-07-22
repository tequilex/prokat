import { redirect } from "next/navigation";
import { requireAuthState } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";

// Точка входа кабинета: сразу на «Мои объявления».
export default async function CabinetIndex() {
  const session = await requireAuthState();
  if (!session) redirect("/login?from=/cabinet");
  redirect("/cabinet/listings");
}

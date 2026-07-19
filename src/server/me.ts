// Read-слой личного кабинета покупателя.

import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { accounts, users } from "@db/schema";

export async function getUserProfile(userId: string) {
  const db = getDb();
  const [userRows, accountRows] = await Promise.all([
    db.select().from(users).where(eq(users.id, userId)).limit(1),
    db.select({ provider: accounts.provider }).from(accounts).where(eq(accounts.userId, userId)),
  ]);
  const user = userRows[0];
  if (!user) return null;
  return { user, providers: accountRows.map((a) => a.provider) };
}

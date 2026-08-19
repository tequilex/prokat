"use client";

import { CoverChoiceGrid } from "@/components/account/CoverPicker";
import type { AccountIdentity } from "@/components/account/identity";

/* Обложка на экране настроек: тот же выбор, что открывает кнопка на самой
 * обложке, только без окна — грид лежит прямо на странице. */
export function ProfileCoverField({
  me,
  pendingCount,
}: {
  me: AccountIdentity;
  pendingCount: number;
}) {
  return <CoverChoiceGrid me={me} pendingCount={pendingCount} />;
}

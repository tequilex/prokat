"use client";

import { AvatarChoice } from "@/components/account/AvatarPicker";

/* Аватарка на экране настроек: тот же выбор, что открывает камера на самой
 * аватарке в кабинете, только без окна — лежит прямо на странице. */
export function ProfileAvatarField({
  image,
  name,
}: {
  image: string | null;
  name: string | null;
}) {
  return <AvatarChoice image={image} name={name} />;
}

import { redirect } from "next/navigation";

// Заявки — главный экран кабинета.
export default function CabinetIndex() {
  redirect("/cabinet/requests");
}

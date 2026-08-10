import { LoadingState } from "@/components/ui/LoadingState";

// Один фолбэк на весь кабинет: объявления, заявки, календарь.
export default function CabinetLoading() {
  return <LoadingState title="Открываем кабинет…" />;
}

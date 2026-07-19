import { Wrench, Bike, Shirt, Package, type LucideIcon } from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  tools: Wrench,
  sport: Bike,
  dresses: Shirt,
};

export function verticalIcon(vertical: string | null | undefined): LucideIcon {
  return (vertical ? MAP[vertical] : undefined) ?? Package;
}

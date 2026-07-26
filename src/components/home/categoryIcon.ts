import {
  Wrench, Shirt, Camera, Car, Tent, Gamepad2, Baby, Sofa, Laptop, Dumbbell,
  Package, type LucideIcon,
} from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  tools: Wrench,
  clothing: Shirt,
  photo: Camera,
  transport: Car,
  outdoor: Tent,
  entertainment: Gamepad2,
  kids: Baby,
  home: Sofa,
  electronics: Laptop,
  sport: Dumbbell,
};

export function verticalIcon(vertical: string | null | undefined): LucideIcon {
  return (vertical ? MAP[vertical] : undefined) ?? Package;
}

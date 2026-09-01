import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Avatar } from "@/components/ui/Avatar";

// Аватарка живёт внутри флекс-строк (список переписок, шапка, хаб кабинета).
// У флекса align-items по умолчанию stretch, а shrink-0 держит только ширину —
// поэтому размер обязан быть задан стилем, иначе высокая строка растягивает
// круг в овал. Так это и вылезло в списке переписок, когда строка стала в три
// этажа.

describe("Avatar", () => {
  it("картинка получает жёсткий размер обеими сторонами", () => {
    const { container } = render(
      <div style={{ display: "flex", height: 200 }}>
        <Avatar src="/demo/1.webp" name="Тим" size={44} />
      </div>,
    );
    const img = container.querySelector("img")!;
    expect(img.style.width).toBe("44px");
    expect(img.style.height).toBe("44px");
  });

  it("непрямоугольную картинку кадрирует, а не плющит", () => {
    const { container } = render(<Avatar src="/demo/1.webp" name="Тим" size={44} />);
    expect(container.querySelector("img")!.className).toContain("object-cover");
  });

  it("заглушка с буквой тоже имеет обе стороны", () => {
    const { container } = render(<Avatar src={null} name="Марина" size={32} />);
    const box = container.firstElementChild as HTMLElement;
    expect(box.style.width).toBe("32px");
    expect(box.style.height).toBe("32px");
  });
});

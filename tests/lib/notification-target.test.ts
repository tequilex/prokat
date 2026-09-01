import { describe, it, expect } from "vitest";
import { NOTIFICATION_KINDS } from "@/lib/notifications/kinds";
import { notificationTarget } from "@/lib/notifications/target";

describe("куда ведёт уведомление", () => {
  it("сообщение ведёт в свой тред", () => {
    expect(notificationTarget("chat_message", "t1")).toEqual({
      entity: "thread",
      href: "/chat/t1",
    });
  });

  // Ключ не в слове «заявка», а в том, кто получатель: request_cancelled
  // получает ВЛАДЕЛЕЦ (отменил арендатор), и смотрит он на входящие.
  it("адресованное владельцу ведёт во входящие заявки", () => {
    for (const kind of ["request_created", "request_cancelled"] as const) {
      expect(notificationTarget(kind, "r1").href).toBe("/cabinet/requests");
    }
  });

  it("адресованное арендатору ведёт в свои заявки", () => {
    const kinds = [
      "request_confirmed", "request_declined", "request_completed", "request_no_show",
    ] as const;
    for (const kind of kinds) {
      expect(notificationTarget(kind, "r1").href).toBe("/requests");
    }
  });

  it("тип сущности выводится из вида, отдельной колонкой не хранится", () => {
    expect(notificationTarget("chat_message", "x").entity).toBe("thread");
    expect(notificationTarget("request_created", "x").entity).toBe("booking_request");
  });

  // Полиморфизм без внешнего ключа разъезжается молча — этот тест единственное,
  // что заметит вид, добавленный без адреса.
  it("адрес есть у каждого вида", () => {
    for (const kind of NOTIFICATION_KINDS) {
      expect(notificationTarget(kind, "x").href).toBeTruthy();
    }
  });
});

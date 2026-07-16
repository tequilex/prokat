// Dev/staging seeds: тестовый город, 3 категории (2 с подкатегориями),
// 5 прокатов и 20 позиций. Идемпотентен: если город уже есть — выходит.
// Запуск: pnpm db:seed (нужен DATABASE_URL в .env, миграции применены).

import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { Pool } from "pg";
import {
  users, cities, categories, providers, listings,
} from "../drizzle/schema";
import { newId } from "../src/lib/id";
import { slugify } from "../src/lib/slugify";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }
  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool);

  const existing = await db.select({ id: cities.id }).from(cities).where(eq(cities.slug, "kazan")).limit(1);
  if (existing.length > 0) {
    console.log("Seeds already applied (city 'kazan' exists), nothing to do");
    await pool.end();
    return;
  }

  // --- Город ---
  const cityId = newId();
  await db.insert(cities).values({
    id: cityId,
    name: "Казань",
    slug: "kazan",
    region: "Республика Татарстан",
    lat: 55.7963,
    lon: 49.1088,
  });

  // --- Категории (дерево 2 уровня) ---
  const cat = async (name: string, vertical: string, parentId: string | null = null) => {
    const id = newId();
    await db.insert(categories).values({ id, parentId, name, slug: slugify(name), vertical });
    return id;
  };

  const toolsId = await cat("Инструмент", "tools");
  const powerToolsId = await cat("Электроинструмент", "tools", toolsId);
  const gardenId = await cat("Садовая техника", "tools", toolsId);
  const sportId = await cat("Спорт", "sport");
  const bikesId = await cat("Велосипеды", "sport", sportId);
  const supId = await cat("Сапборды", "sport", sportId);
  const dressesId = await cat("Платья", "dresses");

  // --- Владельцы и прокаты ---
  const providerDefs = [
    { name: "ПрокатМастер", phones: ["+7 900 111-22-33"], address: "ул. Баумана, 10" },
    { name: "Инструмент 116", phones: ["+7 900 222-33-44"], address: "пр. Победы, 45" },
    { name: "ВелоКазань", phones: ["+7 900 333-44-55"], address: "ул. Кремлёвская, 3" },
    { name: "SUP-станция Казанка", phones: ["+7 900 444-55-66"], address: "наб. Казанки, 1" },
    { name: "Платье напрокат", phones: ["+7 900 555-66-77"], address: "ул. Пушкина, 52" },
  ];

  const providerIds: string[] = [];
  for (let i = 0; i < providerDefs.length; i++) {
    const def = providerDefs[i];
    const userId = newId();
    await db.insert(users).values({
      id: userId,
      email: `owner${i + 1}@seed.local`,
      username: `owner${i + 1}`,
      name: `Владелец «${def.name}»`,
    });
    const providerId = newId();
    await db.insert(providers).values({
      id: providerId,
      ownerUserId: userId,
      cityId,
      name: def.name,
      slug: slugify(def.name),
      description: `${def.name} — тестовый прокат из сидов.`,
      address: def.address,
      phones: def.phones,
      workHoursJson: { "mon-fri": "10:00-19:00", "sat-sun": "11:00-17:00" },
    });
    providerIds.push(providerId);
  }

  // --- Позиции: [провайдер, категория, название, цена/день, залог(₽|null), тип залога, кол-во] ---
  const listingDefs: Array<[number, string, string, number, number | null, "money" | "document" | "none", number]> = [
    [0, powerToolsId, "Перфоратор Bosch GBH 2-26", 500, 3000, "money", 3],
    [0, powerToolsId, "Шуруповёрт Makita DF333", 300, 2000, "money", 5],
    [0, powerToolsId, "Болгарка DeWalt 125 мм", 350, 2500, "money", 2],
    [0, gardenId, "Газонокосилка бензиновая Husqvarna", 900, 5000, "money", 2],
    [0, gardenId, "Триммер электрический", 400, 2000, "money", 3],
    [1, powerToolsId, "Отбойный молоток Hilti TE 500", 1200, 8000, "money", 1],
    [1, powerToolsId, "Сварочный аппарат Ресанта 190А", 600, 4000, "money", 2],
    [1, gardenId, "Мотобур со шнеками 150/200 мм", 1000, 5000, "money", 1],
    [1, powerToolsId, "Строительный пылесос Karcher", 500, 3000, "money", 2],
    [2, bikesId, "Горный велосипед Trek Marlin 7", 700, null, "document", 6],
    [2, bikesId, "Городской велосипед Forward", 450, null, "document", 8],
    [2, bikesId, "Детский велосипед 20\"", 300, null, "document", 4],
    [2, bikesId, "Электросамокат Ninebot Max", 900, 5000, "money", 5],
    [3, supId, "Сапборд Aztron Mercury 10'10\"", 800, 3000, "money", 10],
    [3, supId, "Сапборд двухместный 15'", 1400, 5000, "money", 2],
    [3, supId, "Гидрокостюм 3 мм", 300, null, "document", 8],
    [4, dressesId, "Вечернее платье Zara, р. 42-44", 1500, 5000, "money", 1],
    [4, dressesId, "Коктейльное платье, р. 46", 1200, 4000, "money", 1],
    [4, dressesId, "Свадебное платье А-силуэт", 5000, 15000, "money", 1],
    [4, dressesId, "Платье для фотосессии со шлейфом", 2000, 6000, "money", 1],
  ];

  for (const [pIdx, categoryId, title, priceDay, depositAmount, depositType, quantity] of listingDefs) {
    await db.insert(listings).values({
      id: newId(),
      providerId: providerIds[pIdx],
      categoryId,
      title,
      slug: slugify(title),
      description: `${title}. Тестовая позиция из сидов.`,
      priceDay,
      priceWeek: priceDay * 5, // недельная скидка ~30%
      depositAmount,
      depositType,
      quantity,
      status: "active",
    });
  }

  await pool.end();
  console.log(`Seeded: 1 city, 7 categories, ${providerDefs.length} providers, ${listingDefs.length} listings`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

/**
 * Проверка, что хранилище настроено и принимает запись.
 *
 *   pnpm check-storage                       # значения из .env
 *   pnpm exec tsx --env-file=/path/to/env scripts/check-storage.ts
 *
 * Кладёт во временный ключ `_selftest/<random>.txt` крошечный объект, читает
 * его обратно, дёргает публичную ссылку и удаляет за собой. Секреты не печатает.
 *
 * Отдельно сверяет два способа адресации бакета: path-style
 * (`endpoint/bucket/key`, его использует приложение) и virtual-hosted
 * (`bucket.endpoint/key`, дефолт AWS SDK). Провайдеры поддерживают их
 * по-разному, и знать, какой работает, полезно до первой загрузки фото.
 */

import { randomBytes } from "node:crypto";
import {
  S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";

const endpoint = process.env.STORAGE_ENDPOINT;
const bucket = process.env.STORAGE_BUCKET;
const accessKeyId = process.env.STORAGE_ACCESS_KEY_ID;
const secretAccessKey = process.env.STORAGE_SECRET_ACCESS_KEY;
const publicBase = process.env.STORAGE_PUBLIC_BASE;

if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
  console.error("STORAGE_ENDPOINT, STORAGE_BUCKET, STORAGE_ACCESS_KEY_ID и STORAGE_SECRET_ACCESS_KEY обязательны");
  process.exit(1);
}

const payload = `selftest ${new Date().toISOString()}`;

function client(forcePathStyle: boolean): S3Client {
  return new S3Client({
    region: "ru-central1",
    endpoint,
    forcePathStyle,
    credentials: { accessKeyId: accessKeyId!, secretAccessKey: secretAccessKey! },
  });
}

async function roundTrip(forcePathStyle: boolean): Promise<string> {
  const s3 = client(forcePathStyle);
  const key = `_selftest/${randomBytes(12).toString("hex")}.txt`;
  try {
    await s3.send(new PutObjectCommand({
      Bucket: bucket, Key: key, Body: payload, ContentType: "text/plain",
    }));
    const got = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const body = await got.Body!.transformToString();
    if (body !== payload) return "записалось, но прочиталось другое";

    if (publicBase) {
      const res = await fetch(`${publicBase.replace(/\/$/, "")}/${key}`);
      const note = res.ok ? "публичное чтение ok" : `публичное чтение ${res.status}`;
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
      return `ok, ${note}`;
    }
    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    return "ok";
  } catch (e) {
    try { await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })); } catch { /* объект мог не создаться */ }
    return `ОШИБКА: ${e instanceof Error ? e.message : String(e)}`;
  }
}

// Убеждаемся, что проверка не оставила после себя объектов: ключи временные,
// но бакет боевой, и молча мусорить в нём нельзя.
async function leftovers(): Promise<number> {
  const res = await client(true).send(new ListObjectsV2Command({
    Bucket: bucket, Prefix: "_selftest/",
  }));
  return res.KeyCount ?? 0;
}

async function main() {
  console.log(`endpoint: ${endpoint}`);
  console.log(`bucket:   ${bucket}\n`);
  console.log(`path-style (как ходит приложение):  ${await roundTrip(true)}`);
  console.log(`virtual-hosted (дефолт AWS SDK):    ${await roundTrip(false)}`);

  const left = await leftovers();
  console.log(`\nостатков под _selftest/: ${left}${left === 0 ? " — прибрано" : " — ТРЕБУЕТ ВНИМАНИЯ"}`);
}

main().catch((e) => { console.error(e); process.exit(1); });

"use server";

import { cookies } from "next/headers";
import {
  storageSchema,
  type StorageKey,
  type StorageValue,
} from "@/lib/storage/schema";

const COOKIE_OPTIONS = {
  httpOnly: false,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
};

export async function setStorageCookie<K extends StorageKey>(
  key: K,
  value: StorageValue<K>
): Promise<void> {
  const definition = storageSchema[key];

  if (definition.tier !== "cookie") {
    throw new Error(`"${key}" is not a cookie-backed storage key.`);
  }

  const validation = definition.schema.safeParse(value);

  if (!validation.success) {
    throw new Error(`Invalid value for "${key}": ${validation.error.message}`);
  }

  const cookieStore = await cookies();
  cookieStore.set(
    key,
    encodeURIComponent(JSON.stringify(validation.data)),
    COOKIE_OPTIONS
  );
}

export async function deleteStorageCookie<K extends StorageKey>(
  key: K
): Promise<void> {
  const definition = storageSchema[key];

  if (definition.tier !== "cookie") {
    throw new Error(`"${key}" is not a cookie-backed storage key.`);
  }

  const cookieStore = await cookies();
  cookieStore.delete(key);
}

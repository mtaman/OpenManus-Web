import { cookies } from "next/headers";
import {
  storageSchema,
  type StorageKey,
  type StorageValue,
} from "./schema";

export async function getServerStorage<K extends StorageKey>(
  key: K
): Promise<StorageValue<K>> {
  const definition = storageSchema[key];

  if (definition.tier !== "cookie") {
    return definition.defaultValue as StorageValue<K>;
  }

  const cookieStore = await cookies();
  const raw = cookieStore.get(key)?.value;

  if (!raw) {
    return definition.defaultValue as StorageValue<K>;
  }

  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(raw));
    const result = definition.schema.safeParse(parsed);

    if (!result.success) {
      return definition.defaultValue as StorageValue<K>;
    }

    return result.data as StorageValue<K>;
  } catch {
    return definition.defaultValue as StorageValue<K>;
  }
}

export async function getServerStorageSnapshot(): Promise<{
  [K in StorageKey]?: StorageValue<K>;
}> {
  const cookieStore = await cookies();
  const result: Partial<{ [K in StorageKey]: StorageValue<K> }> = {};

  for (const key of Object.keys(storageSchema) as StorageKey[]) {
    const definition = storageSchema[key];

    if (definition.tier !== "cookie") {
      continue;
    }

    const raw = cookieStore.get(key)?.value;

    if (!raw) {
      result[key] = definition.defaultValue as StorageValue<typeof key>;
      continue;
    }

    try {
      const parsed: unknown = JSON.parse(decodeURIComponent(raw));
      const validated = definition.schema.safeParse(parsed);

      result[key] = validated.success
        ? (validated.data as StorageValue<typeof key>)
        : (definition.defaultValue as StorageValue<typeof key>);
    } catch {
      result[key] = definition.defaultValue as StorageValue<typeof key>;
    }
  }

  return result;
}

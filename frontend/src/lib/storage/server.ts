import { cookies } from "next/headers";
import {
  storageSchema,
  type StorageKey,
  type StorageValue,
} from "./schema";

function cleanRawValue(raw: string | undefined): unknown {
  if (!raw) return undefined;
  let val = decodeURIComponent(raw).trim();
  // Strip nested URI encodings if any exist
  while (val.includes("%22") || val.includes("%20")) {
    try {
      val = decodeURIComponent(val).trim();
    } catch {
      break;
    }
  }
  // Strip enclosing quotes
  val = val.replace(/^["']+|["']+$/g, "");
  if (val === "true") return true;
  if (val === "false") return false;
  try {
    return JSON.parse(val);
  } catch {
    return val;
  }
}

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

  const parsed = cleanRawValue(raw);
  const result = definition.schema.safeParse(parsed);
  if (!result.success) {
    return definition.defaultValue as StorageValue<K>;
  }
  return result.data as StorageValue<K>;
}

export async function getServerStorageSnapshot(): Promise<{
  [K in StorageKey]?: StorageValue<K>;
}> {
  const cookieStore = await cookies();
  const result: Record<string, any> = {};

  for (const key of Object.keys(storageSchema) as StorageKey[]) {
    const definition = storageSchema[key];
    if (definition.tier !== "cookie") {
      continue;
    }
    const raw = cookieStore.get(key)?.value;
    if (!raw) {
      result[key] = definition.defaultValue;
      continue;
    }
    const parsed = cleanRawValue(raw);
    const validated = definition.schema.safeParse(parsed);
    result[key] = validated.success ? validated.data : definition.defaultValue;
  }

  return result as { [K in StorageKey]?: StorageValue<K> };
}

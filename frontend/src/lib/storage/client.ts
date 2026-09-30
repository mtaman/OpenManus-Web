"use client";

import type {
  StorageKey,
  StorageSchema,
  StorageTier,
  StorageValue,
} from "./schema";
import { storageSchema, isCookieKey } from "./schema";

type StorageListener<K extends StorageKey = StorageKey> = (
  value: StorageValue<K>,
  key: K
) => void;

type AnyListener = (
  key: StorageKey,
  value: unknown,
  source: "local" | "cookie" | "external"
) => void;

interface StorageEnvelope {
  version: 1;
  key: StorageKey;
  value: unknown;
  timestamp: number;
  sourceId: string;
}

const CHANNEL_NAME = "openmanus-web-storage";

const sourceId =
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const listeners = new Map<StorageKey, Set<StorageListener>>();
const globalListeners = new Set<AnyListener>();

let channel: BroadcastChannel | null = null;
let initialized = false;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function isStorageAvailable(): boolean {
  if (!isBrowser()) {
    return false;
  }
  try {
    const testKey = "__omweb_storage_test__";
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

function getDefinition<K extends StorageKey>(key: K) {
  return storageSchema[key];
}

function parse<K extends StorageKey>(
  key: K,
  raw: string | null
): StorageValue<K> {
  const definition = getDefinition(key);

  if (raw === null) {
    return definition.defaultValue as StorageValue<K>;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    const result = definition.schema.safeParse(parsed);

    if (result.success) {
      return result.data as StorageValue<K>;
    }

    console.warn(
      `[storage] Invalid persisted value for "${key}". Falling back to default.`,
      result.error
    );
    return definition.defaultValue as StorageValue<K>;
  } catch {
    console.warn(`[storage] Failed to parse persisted value for "${key}".`);
    return definition.defaultValue as StorageValue<K>;
  }
}

function serialize<K extends StorageKey>(
  key: K,
  value: StorageValue<K>
): string {
  const definition = getDefinition(key);
  const result = definition.schema.safeParse(value);

  if (!result.success) {
    throw new TypeError(
      `[storage] Invalid value for "${key}": ${result.error.message}`
    );
  }

  return JSON.stringify(result.data);
}

function notify<K extends StorageKey>(
  key: K,
  value: StorageValue<K>,
  source: "local" | "cookie" | "external"
): void {
  listeners.get(key)?.forEach((listener) => {
    listener(value, key);
  });

  globalListeners.forEach((listener) => {
    listener(key, value, source);
  });
}

function initialize(): void {
  if (!isBrowser() || initialized) {
    return;
  }

  initialized = true;

  if ("BroadcastChannel" in window) {
    channel = new BroadcastChannel(CHANNEL_NAME);

    channel.addEventListener("message", (event: MessageEvent) => {
      const envelope = event.data as Partial<StorageEnvelope>;

      if (
        !envelope ||
        envelope.version !== 1 ||
        envelope.sourceId === sourceId ||
        typeof envelope.key !== "string"
      ) {
        return;
      }

      const key = envelope.key as StorageKey;
      if (!(key in storageSchema)) {
        return;
      }

      const definition = getDefinition(key);
      const parsed = definition.schema.safeParse(envelope.value);

      if (!parsed.success) {
        return;
      }

      notify(key, parsed.data as StorageValue<typeof key>, "external");
    });
  }

  window.addEventListener("storage", (event: StorageEvent) => {
    if (!event.key) {
      return;
    }

    if (!(event.key in storageSchema)) {
      return;
    }

    const key = event.key as StorageKey;
    if (getDefinition(key).tier !== "local") {
      return;
    }

    const value = parse(key, event.newValue);
    notify(key, value, "external");
  });
}

function broadcast<K extends StorageKey>(
  key: K,
  value: StorageValue<K>
): void {
  if (!channel) {
    return;
  }

  const envelope: StorageEnvelope = {
    version: 1,
    key,
    value,
    timestamp: Date.now(),
    sourceId,
  };

  try {
    channel.postMessage(envelope);
  } catch (error) {
    console.warn("[storage] BroadcastChannel failed.", error);
  }
}

function getLocal<K extends StorageKey>(key: K): StorageValue<K> {
  initialize();

  if (!isStorageAvailable()) {
    return getDefinition(key).defaultValue as StorageValue<K>;
  }

  try {
    return parse(key, window.localStorage.getItem(key));
  } catch {
    return getDefinition(key).defaultValue as StorageValue<K>;
  }
}

function setLocal<K extends StorageKey>(
  key: K,
  value: StorageValue<K>
): void {
  initialize();

  if (!isStorageAvailable()) {
    return;
  }

  const serialized = serialize(key, value);

  try {
    window.localStorage.setItem(key, serialized);
    notify(key, value, "local");
    broadcast(key, value);
  } catch (error) {
    console.warn(`[storage] Unable to persist "${key}".`, error);
    notify(key, value, "local");
  }
}

type CookieWriter = <K extends StorageKey>(
  key: K,
  value: StorageValue<K>
) => Promise<void>;

let cookieWriter: CookieWriter | null = null;

export function configureCookieWriter(writer: CookieWriter): void {
  cookieWriter = writer;
}

export const storage = {
  get<K extends StorageKey>(key: K): StorageValue<K> {
    const definition = getDefinition(key);

    if (definition.tier === "local") {
      return getLocal(key);
    }

    return definition.defaultValue as StorageValue<K>;
  },

  set<K extends StorageKey>(key: K, value: StorageValue<K>): void {
    const definition = getDefinition(key);

    if (definition.tier === "local") {
      setLocal(key, value);
      return;
    }

    notify(key, value, "cookie");

    if (cookieWriter) {
      void cookieWriter(key, value).catch((error) => {
        console.error(`[storage] Cookie persistence failed for "${key}".`, error);
      });
    }
  },

  remove<K extends StorageKey>(key: K): void {
    const definition = getDefinition(key);

    if (definition.tier !== "local" || !isStorageAvailable()) {
      return;
    }

    try {
      window.localStorage.removeItem(key);
      const defaultValue = definition.defaultValue as StorageValue<K>;
      notify(key, defaultValue, "local");
      broadcast(key, defaultValue);
    } catch {
      // Storage removal failure is non-fatal
    }
  },

  subscribe<K extends StorageKey>(
    key: K,
    listener: StorageListener<K>
  ): () => void {
    initialize();

    let set = listeners.get(key);
    if (!set) {
      set = new Set();
      listeners.set(key, set);
    }

    set.add(listener as StorageListener);

    return () => {
      set?.delete(listener as StorageListener);
      if (set?.size === 0) {
        listeners.delete(key);
      }
    };
  },

  subscribeAll(listener: AnyListener): () => void {
    initialize();
    globalListeners.add(listener);

    return () => {
      globalListeners.delete(listener);
    };
  },

  getDefault<K extends StorageKey>(key: K): StorageValue<K> {
    return getDefinition(key).defaultValue as StorageValue<K>;
  },

  isAvailable(): boolean {
    return isStorageAvailable();
  },
} as const;

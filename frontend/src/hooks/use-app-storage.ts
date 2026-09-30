"use client";

import { useCallback, useSyncExternalStore } from "react";
import { storage } from "@/lib/storage/client";
import { isCookieKey, type StorageKey, type StorageValue } from "@/lib/storage/schema";
import { useStorageCookies } from "@/components/providers/storage-provider";

function createSubscribe<K extends StorageKey>(key: K) {
  return (listener: () => void) =>
    storage.subscribe(key, () => {
      listener();
    });
}

export function useAppStorage<K extends StorageKey>(
  key: K
): readonly [StorageValue<K>, (value: StorageValue<K>) => void] {
  const cookieSnapshot = useStorageCookies();

  const subscribe = useCallback(
    (listener: () => void) => createSubscribe(key)(listener),
    [key]
  );

  const getSnapshot = useCallback(() => {
    if (isCookieKey(key)) {
      return (
        cookieSnapshot[key] ?? storage.getDefault(key)
      ) as StorageValue<K>;
    }
    return storage.get(key);
  }, [key, cookieSnapshot]);

  const getServerSnapshot = useCallback(() => {
    return (
      cookieSnapshot[key] ?? storage.getDefault(key)
    ) as StorageValue<K>;
  }, [key, cookieSnapshot]);

  const value = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const setValue = useCallback(
    (next: StorageValue<K>) => {
      storage.set(key, next);
    },
    [key]
  );

  return [value, setValue] as const;
}

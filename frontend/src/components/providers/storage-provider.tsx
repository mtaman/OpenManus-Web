"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";

import { configureCookieWriter } from "@/lib/storage/client";
import { setStorageCookie } from "@/app/actions/storage";
import type { StorageKey, StorageValue } from "@/lib/storage/schema";

export type CookieSnapshot = Partial<{
  [K in StorageKey]: StorageValue<K>;
}>;

interface StorageContextValue {
  cookies: CookieSnapshot;
}

const StorageContext = createContext<StorageContextValue | null>(null);

interface StorageProviderProps {
  children: ReactNode;
  cookieSnapshot: CookieSnapshot;
}

export function StorageProvider({
  children,
  cookieSnapshot,
}: StorageProviderProps) {
  useMemo(() => {
    configureCookieWriter(
      async <K extends StorageKey>(
        key: K,
        value: StorageValue<K>
      ) => {
        await setStorageCookie(key, value);
      }
    );
  }, []);

  const context = useMemo(
    () => ({
      cookies: cookieSnapshot,
    }),
    [cookieSnapshot]
  );

  return (
    <StorageContext.Provider value={context}>
      {children}
    </StorageContext.Provider>
  );
}

export function useStorageCookies(): CookieSnapshot {
  const context = useContext(StorageContext);
  if (!context) {
    return {};
  }
  return context.cookies;
}

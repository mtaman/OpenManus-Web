"use client";

import type { StateStorage } from "zustand/middleware";

export const zustandStorage: StateStorage = {
  getItem(name: string): string | null {
    if (typeof window === "undefined") {
      return null;
    }
    try {
      return window.localStorage.getItem(name);
    } catch {
      return null;
    }
  },

  setItem(name: string, value: string): void {
    if (typeof window === "undefined") {
      return;
    }
    try {
      window.localStorage.setItem(name, value);
    } catch {
      // Persistence failure must not break UI.
    }
  },

  removeItem(name: string): void {
    if (typeof window === "undefined") {
      return;
    }
    try {
      window.localStorage.removeItem(name);
    } catch {
      // Persistence failure must not break UI.
    }
  },
};

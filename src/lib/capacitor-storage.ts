/**
 * Custom storage adapter for Supabase Auth that mirrors writes to
 * @capacitor/preferences (native iOS UserDefaults) so sessions survive
 * iOS purging WKWebView localStorage.
 *
 * KEY DESIGN DECISIONS:
 * 1. isNative() is a FUNCTION, not a constant — Capacitor bridge may not
 *    be ready when this module first loads.
 * 2. We mirror ALL keys (not just the auth key) because Supabase stores
 *    session data under keys we can't predict exactly.
 * 3. Preferences.set() is fire-and-forget from setItem (sync interface),
 *    but we catch errors to avoid silent failures.
 */
import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

/** Runtime check — never cache at module level */
function isNative(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "uxjjfbxpednwxggeicld";
const AUTH_KEY = `sb-${PROJECT_ID}-auth-token`;
const PROFILE_KEY = `app-cached-profile`;

export const capacitorStorage: Storage = {
  get length() {
    return localStorage.length;
  },

  key(index: number): string | null {
    return localStorage.key(index);
  },

  clear(): void {
    if (isNative()) {
      Preferences.clear().catch((e) =>
        console.warn("[capacitor-storage] clear error:", e)
      );
    }
    localStorage.clear();
  },

  getItem(key: string): string | null {
    return localStorage.getItem(key);
  },

  setItem(key: string, value: string): void {
    localStorage.setItem(key, value);
    if (isNative()) {
      // Fire-and-forget but log errors
      Preferences.set({ key, value }).catch((e) =>
        console.warn("[capacitor-storage] set error:", e)
      );
    }
  },

  removeItem(key: string): void {
    localStorage.removeItem(key);
    if (isNative()) {
      Preferences.remove({ key }).catch((e) =>
        console.warn("[capacitor-storage] remove error:", e)
      );
    }
  },
};

/**
 * Hydrate localStorage from native Preferences before Supabase client init.
 * Call BEFORE creating the Supabase client.
 */
export async function hydrateFromNativeStorage(): Promise<void> {
  if (!isNative()) {
    console.log("[capacitor-storage] Not native platform, skipping hydration");
    return;
  }

  try {
    const { value } = await Preferences.get({ key: AUTH_KEY });
    console.log("[capacitor-storage] Native has session:", !!value);
    console.log("[capacitor-storage] localStorage has session:", !!localStorage.getItem(AUTH_KEY));

    if (value) {
      // Validate it's parseable JSON before writing
      try {
        JSON.parse(value);
        localStorage.setItem(AUTH_KEY, value);
        console.log("[capacitor-storage] ✅ Hydrated session from native storage");
      } catch {
        console.warn("[capacitor-storage] ⚠️ Native session was corrupt, removing");
        await Preferences.remove({ key: AUTH_KEY });
      }
    } else {
      console.log("[capacitor-storage] No session in native storage to hydrate");
    }
  } catch (e) {
    console.warn("[capacitor-storage] Hydration failed:", e);
  }
}

/**
 * Re-hydrate when app returns to foreground (iOS may have purged localStorage).
 */
export async function rehydrateOnForeground(): Promise<void> {
  if (!isNative()) return;

  try {
    const { value } = await Preferences.get({ key: AUTH_KEY });
    const localValue = localStorage.getItem(AUTH_KEY);

    if (value && !localValue) {
      console.log("[capacitor-storage] ⚡ Re-hydrating session on foreground (localStorage was purged)");
      try {
        JSON.parse(value);
        localStorage.setItem(AUTH_KEY, value);
      } catch {
        console.warn("[capacitor-storage] Corrupt session in native storage");
        await Preferences.remove({ key: AUTH_KEY });
      }
    }
  } catch (e) {
    console.warn("[capacitor-storage] Foreground rehydration failed:", e);
}

/**
 * Cache profile data to native Preferences so it survives app restarts
 * even if the network profile fetch fails.
 */
export async function cacheProfile(profile: unknown): Promise<void> {
  try {
    const json = JSON.stringify(profile);
    localStorage.setItem(PROFILE_KEY, json);
    if (isNative()) {
      await Preferences.set({ key: PROFILE_KEY, value: json });
    }
  } catch (e) {
    console.warn("[capacitor-storage] cacheProfile error:", e);
  }
}

/**
 * Retrieve cached profile from native Preferences (fallback if network fails).
 */
export async function getCachedProfile(): Promise<unknown | null> {
  try {
    // Try localStorage first (faster)
    const local = localStorage.getItem(PROFILE_KEY);
    if (local) {
      return JSON.parse(local);
    }
    // Fall back to native Preferences
    if (isNative()) {
      const { value } = await Preferences.get({ key: PROFILE_KEY });
      if (value) {
        const parsed = JSON.parse(value);
        localStorage.setItem(PROFILE_KEY, value); // re-hydrate
        return parsed;
      }
    }
  } catch (e) {
    console.warn("[capacitor-storage] getCachedProfile error:", e);
  }
  return null;
}

/**
 * Clear cached profile (on sign out).
 */
export async function clearCachedProfile(): Promise<void> {
  try {
    localStorage.removeItem(PROFILE_KEY);
    if (isNative()) {
      await Preferences.remove({ key: PROFILE_KEY });
    }
  } catch (e) {
    console.warn("[capacitor-storage] clearCachedProfile error:", e);
  }
}
}

/**
 * Custom storage adapter for Supabase Auth that uses
 * @capacitor/preferences (native iOS UserDefaults) on native platforms
 * and falls back to localStorage on web.
 *
 * CRITICAL: We do NOT cache Capacitor.isNativePlatform() at module level.
 * With remote URL configs, the Capacitor bridge may not be injected yet
 * when this module first evaluates. We check every call instead.
 */
import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

/** Always evaluate at call time — never cache at module level */
function isNative(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

const SUPABASE_AUTH_KEY = `sb-${import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "uxjjfbxpednwxggeicld"}-auth-token`;

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
        console.warn("[capacitor-storage] Preferences.clear failed:", e)
      );
    }
    localStorage.clear();
  },

  getItem(key: string): string | null {
    // Synchronous read from localStorage (hydrated from Preferences on launch)
    return localStorage.getItem(key);
  },

  setItem(key: string, value: string): void {
    localStorage.setItem(key, value);
    if (isNative()) {
      Preferences.set({ key, value }).catch((e) =>
        console.warn("[capacitor-storage] Preferences.set failed:", e)
      );
    }
  },

  removeItem(key: string): void {
    localStorage.removeItem(key);
    if (isNative()) {
      Preferences.remove({ key }).catch((e) =>
        console.warn("[capacitor-storage] Preferences.remove failed:", e)
      );
    }
  },
};

/**
 * On native platforms, hydrate localStorage from Preferences (UserDefaults)
 * so that Supabase's synchronous getItem() finds the persisted session.
 * Call this BEFORE creating the Supabase client.
 */
export async function hydrateFromNativeStorage(): Promise<void> {
  // Check at call time, not module level
  if (!isNative()) {
    console.log("[capacitor-storage] Not native platform, skipping hydration");
    return;
  }

  console.log("[capacitor-storage] Starting native hydration...");

  try {
    // Hydrate the Supabase auth token
    const { value } = await Preferences.get({ key: SUPABASE_AUTH_KEY });
    const localValue = localStorage.getItem(SUPABASE_AUTH_KEY);

    console.log("[capacitor-storage] Native Preferences has session:", !!value);
    console.log("[capacitor-storage] localStorage has session:", !!localValue);

    if (value) {
      // Validate that the stored value is valid JSON before hydrating
      try {
        JSON.parse(value);
        console.log("[capacitor-storage] Hydrating session from native storage (valid JSON)");
        localStorage.setItem(SUPABASE_AUTH_KEY, value);
      } catch (parseErr) {
        console.warn("[capacitor-storage] Native session is invalid JSON, removing:", parseErr);
        await Preferences.remove({ key: SUPABASE_AUTH_KEY });
      }
    } else if (localValue) {
      // localStorage has a session but Preferences doesn't — back it up now
      console.log("[capacitor-storage] Backing up localStorage session to native storage");
      await Preferences.set({ key: SUPABASE_AUTH_KEY, value: localValue });
    } else {
      console.log("[capacitor-storage] No session found in either storage");
    }
  } catch (e) {
    console.error("[capacitor-storage] Hydration failed:", e);
  }
}

/**
 * Re-hydrate from native storage when the app returns to foreground.
 * iOS can purge localStorage while the app is backgrounded.
 */
export async function rehydrateOnForeground(): Promise<void> {
  if (!isNative()) return;

  const localValue = localStorage.getItem(SUPABASE_AUTH_KEY);
  if (localValue) return; // localStorage still has session, nothing to do

  console.log("[capacitor-storage] localStorage empty on foreground, re-hydrating...");

  try {
    const { value } = await Preferences.get({ key: SUPABASE_AUTH_KEY });
    if (value) {
      try {
        JSON.parse(value); // validate
        localStorage.setItem(SUPABASE_AUTH_KEY, value);
        console.log("[capacitor-storage] Re-hydrated session from native storage on foreground");
      } catch {
        console.warn("[capacitor-storage] Invalid session in native storage during re-hydration");
      }
    }
  } catch (e) {
    console.error("[capacitor-storage] Re-hydration on foreground failed:", e);
  }
}

/**
 * Custom storage adapter for Supabase Auth that uses
 * @capacitor/preferences (native iOS UserDefaults) on native platforms
 * and falls back to localStorage on web.
 *
 * This fixes the iOS issue where localStorage in WKWebView can be
 * purged by the OS, causing sessions to be lost between app launches.
 */
import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

const isNative = Capacitor.isNativePlatform();

export const capacitorStorage: Storage = {
  get length() {
    // Not used by Supabase auth, but required by the Storage interface
    return localStorage.length;
  },

  key(index: number): string | null {
    return localStorage.key(index);
  },

  clear(): void {
    if (isNative) {
      Preferences.clear();
    }
    localStorage.clear();
  },

  // Supabase auth calls getItem/setItem/removeItem — these are the critical ones

  getItem(key: string): string | null {
    // On native, we can't do synchronous reads from Preferences.
    // Supabase auth expects synchronous getItem, so we mirror writes to
    // both localStorage AND Preferences. On app launch we hydrate
    // localStorage from Preferences before creating the client.
    return localStorage.getItem(key);
  },

  setItem(key: string, value: string): void {
    localStorage.setItem(key, value);
    if (isNative) {
      Preferences.set({ key, value });
    }
  },

  removeItem(key: string): void {
    localStorage.removeItem(key);
    if (isNative) {
      Preferences.remove({ key });
    }
  },
};

/**
 * On native platforms, hydrate localStorage from Preferences (UserDefaults)
 * so that Supabase's synchronous getItem() finds the persisted session.
 * Call this BEFORE creating the Supabase client.
 */
export async function hydrateFromNativeStorage(): Promise<void> {
  if (!isNative) return;

  const SUPABASE_AUTH_KEY = `sb-${import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "uxjjfbxpednwxggeicld"}-auth-token`;

  try {
    const { value } = await Preferences.get({ key: SUPABASE_AUTH_KEY });
    if (value && !localStorage.getItem(SUPABASE_AUTH_KEY)) {
      console.log("[capacitor-storage] Hydrating session from native storage");
      localStorage.setItem(SUPABASE_AUTH_KEY, value);
    }
  } catch (e) {
    console.warn("[capacitor-storage] Hydration failed:", e);
  }
}

/**
 * Hook that mirrors Supabase auth session tokens to native Preferences
 * (iOS UserDefaults / Android SharedPreferences) so sessions survive
 * iOS purging localStorage from WKWebView.
 *
 * Also listens for app foreground events to re-hydrate localStorage
 * if iOS purged it while backgrounded.
 */
import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import { App as CapApp } from "@capacitor/app";
import { supabase } from "@/integrations/supabase/client";
import { rehydrateOnForeground } from "@/lib/capacitor-storage";

const AUTH_KEY = `sb-${import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "uxjjfbxpednwxggeicld"}-auth-token`;

export function useNativeSessionSync() {
  useEffect(() => {
    // Check at call time, not module level
    let native: boolean;
    try {
      native = Capacitor.isNativePlatform();
    } catch {
      native = false;
    }
    if (!native) return;

    console.log("[NativeSessionSync] Setting up session sync for native platform");

    // 1. Mirror auth state changes to native Preferences
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) {
          // Store the session in the EXACT format Supabase expects:
          // Supabase internally does JSON.stringify(session) on the full session object
          const value = JSON.stringify(session);
          Preferences.set({ key: AUTH_KEY, value })
            .then(() => console.log("[NativeSessionSync] Session saved to native storage"))
            .catch((e) => console.error("[NativeSessionSync] Failed to save session:", e));
        } else {
          Preferences.remove({ key: AUTH_KEY })
            .then(() => console.log("[NativeSessionSync] Session removed from native storage"))
            .catch((e) => console.error("[NativeSessionSync] Failed to remove session:", e));
        }
      }
    );

    // 2. Re-hydrate localStorage when app returns to foreground
    //    iOS can purge WKWebView localStorage while the app is backgrounded
    const foregroundListener = CapApp.addListener("appStateChange", async ({ isActive }) => {
      if (!isActive) return;
      console.log("[NativeSessionSync] App returned to foreground");

      await rehydrateOnForeground();

      // After re-hydration, tell Supabase to re-check its session
      // This ensures the auth state is correct even if localStorage was purged
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error("[NativeSessionSync] getSession after foreground failed:", error);
      } else {
        console.log("[NativeSessionSync] Session after foreground:", session ? "active" : "none");
      }
    });

    return () => {
      subscription.unsubscribe();
      foregroundListener.then((h) => h.remove());
    };
  }, []);
}

/**
 * Hook that mirrors Supabase auth session tokens to native Preferences
 * (iOS UserDefaults / Android SharedPreferences) so sessions survive
 * iOS purging localStorage from WKWebView.
 */
import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import { supabase } from "@/integrations/supabase/client";

const AUTH_KEY = `sb-${import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "uxjjfbxpednwxggeicld"}-auth-token`;

export function useNativeSessionSync() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) {
          // Mirror the full session JSON to native storage
          const value = JSON.stringify(session);
          Preferences.set({ key: AUTH_KEY, value });
          console.log("[NativeSessionSync] Session saved to native storage");
        } else {
          Preferences.remove({ key: AUTH_KEY });
          console.log("[NativeSessionSync] Session removed from native storage");
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);
}

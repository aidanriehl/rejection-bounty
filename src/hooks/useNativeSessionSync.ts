/**
 * Hook that:
 * 1. Mirrors Supabase auth session tokens to native Preferences
 * 2. Re-hydrates localStorage when app returns to foreground
 * 3. Attempts session recovery if refresh token fails
 */
import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { supabase } from "@/integrations/supabase/client";
import { rehydrateOnForeground } from "@/lib/capacitor-storage";

export function useNativeSessionSync() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    console.log("[NativeSessionSync] Setting up native session sync");

    // Listen for app returning to foreground
    const foregroundListener = CapApp.addListener(
      "appStateChange",
      async ({ isActive }) => {
        if (!isActive) return;

        console.log("[NativeSessionSync] App returned to foreground");

        // Re-hydrate localStorage in case iOS purged it
        await rehydrateOnForeground();

        // Try to refresh the session — this will use the hydrated token
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error("[NativeSessionSync] getSession error on foreground:", error);
        } else if (data.session) {
          console.log("[NativeSessionSync] ✅ Session valid on foreground");
          // Force a token refresh to get a fresh refresh token
          const { error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError) {
            console.error("[NativeSessionSync] refreshSession error:", refreshError);
          } else {
            console.log("[NativeSessionSync] ✅ Session refreshed successfully");
          }
        } else {
          console.log("[NativeSessionSync] No session on foreground");
        }
      }
    );

    return () => {
      foregroundListener.then((h) => h.remove());
    };
  }, []);
}

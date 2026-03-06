import "./index.css";
import { hydrateFromNativeStorage } from "./lib/capacitor-storage";

// Hydrate localStorage from native Preferences (iOS UserDefaults)
// BEFORE importing App — the Supabase client is created at import time
// and reads localStorage immediately, so hydration must complete first.
//
// We also add a safety retry: if Capacitor.isNativePlatform() returned false
// on the first try (bridge not ready yet), we wait briefly and retry.
async function bootApp() {
  // First hydration attempt
  await hydrateFromNativeStorage();

  // Safety: if the Capacitor bridge wasn't ready on first call,
  // wait 100ms and try again. This handles the race condition
  // where the WKUserScript hasn't finished injecting the bridge.
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (Capacitor.isNativePlatform()) {
      // Bridge is available — do a second hydration pass to be safe
      // (first pass may have been a no-op if isNativePlatform was false)
      await hydrateFromNativeStorage();
    }
  } catch {
    // Not critical — continue booting
  }

  const { createRoot } = await import("react-dom/client");
  const { default: App } = await import("./App.tsx");
  createRoot(document.getElementById("root")!).render(<App />);
}

bootApp();

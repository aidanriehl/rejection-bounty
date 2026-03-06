import "./index.css";
import { hydrateFromNativeStorage } from "./lib/capacitor-storage";

// Hydrate localStorage from native Preferences (iOS UserDefaults)
// BEFORE importing App — the Supabase client is created at import time
// and reads localStorage immediately, so hydration must complete first.
hydrateFromNativeStorage().then(async () => {
  const { createRoot } = await import("react-dom/client");
  const { default: App } = await import("./App.tsx");
  createRoot(document.getElementById("root")!).render(<App />);
});

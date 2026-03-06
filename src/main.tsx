import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { hydrateFromNativeStorage } from "./lib/capacitor-storage";

// Hydrate localStorage from native Preferences (iOS UserDefaults)
// before rendering, so Supabase finds the persisted session.
hydrateFromNativeStorage().then(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});

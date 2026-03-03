import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Apply saved theme (default to dark)
// Ensure light mode (branded look)
document.documentElement.classList.remove("dark");

createRoot(document.getElementById("root")!).render(<App />);

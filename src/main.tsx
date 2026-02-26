import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./lib/i18n"; // Initialize i18n

// Suppress harmless Supabase Auth AbortError (request cancelled on nav/unmount)
window.addEventListener("unhandledrejection", (e) => {
  if (e.reason?.name === "AbortError" && /signal is aborted/i.test(String(e.reason?.message ?? ""))) {
    e.preventDefault();
    e.stopPropagation();
  }
});

createRoot(document.getElementById("root")!).render(<App />);l
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Unregister any existing service workers to prevent offline detection issues
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
        console.log('Service Worker unregistered:', registration.scope);
      }
      
      // Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
        console.log('All caches cleared');
      }
    } catch (error) {
      console.log('Service Worker cleanup failed:', error);
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);

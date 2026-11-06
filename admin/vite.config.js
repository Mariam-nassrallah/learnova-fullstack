// Vite config for the Learnova admin
// - base "/admin/": the built files are served by Express at /admin
// - proxy: during "npm run dev:admin", API calls go to the Express server
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/admin/",
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
});

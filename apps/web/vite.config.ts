import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Front e API rodam em portas separadas em dev; em produção ficam na mesma
      // origem (ver documento de convenções). O proxy replica isso localmente para o
      // cookie de sessão (SameSite=Strict) funcionar sem CORS.
      "/api": {
        target: "http://localhost:8787",
        changeOrigin: true,
      },
    },
  },
});

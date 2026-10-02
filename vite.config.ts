import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: process.env.BASE_PATH || "/caro/",
  plugins: [react(), tailwindcss()],
  test: {
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});

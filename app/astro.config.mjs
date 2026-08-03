import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import cloudflare from "@astrojs/cloudflare";

export default defineConfig({
  site: "https://k2-craft.com/",
  output: "server",
  adapter: cloudflare({
    imageService: "cloudflare",
  }),
  vite: {
    plugins: [tailwindcss()],
  },
});

import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

// @ts-check
import { defineConfig } from "astro/config";

import react from "@astrojs/react";
import starlight from "@astrojs/starlight";
import catppuccin from "@catppuccin/starlight";
import tailwindcss from "@tailwindcss/vite";

import node from "@astrojs/node";

import { customCopyPlugin } from "./plugins/customCopyPlugin.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Unified configuration for copying and serving files
const copyTargets = [
  {
    src: resolve(__dirname, "AeroSandbox/dist/debug/"),
    serveAt: "/aero/sandbox",
  },
  {
    src: resolve(__dirname, "aeroSW/extras/"),
    serveAt: "/aero/extras",
  },
  {
    src: resolve(__dirname, "aeroSW/dist/prod/"),
    serveAt: "/aero",
  },
  {
    src: resolve(
      __dirname,
      "node_modules/@mercuryworkshop/epoxy-transport/dist/",
    ),
    serveAt: "/epoxy",
  },
  {
    src: resolve(__dirname, "node_modules/@mercuryworkshop/bare-mux/dist/"),
    serveAt: "/baremux",
  },
];

// https://astro.build/config
export default defineConfig({
  site: "https://aero.sh",
  vite: {
    resolve: {
      alias: {
        "@": resolve(__dirname, "./src"),
      },
    },
    plugins: [
      customCopyPlugin(copyTargets),
      tailwindcss({
        config: "./tailwind.config.js",
      }),
    ],
  },
  integrations: [
    react(),
    starlight({
      title: "aero demo",
      logo: {
        src: "./public/full_logo.png",
      },
      favicon: "/logo.png",
      plugins: [
        catppuccin({ dark: "mocha-mauve", light: "latte-mauve" }),
        //starlightTypeDoc({
        //entryFiles: ["../src/**/*.ts"],
        //tsconfig: "../tsconfig.json",
        //})
      ],
      sidebar: [
        {
          label: "Nav",
          items: [
            { label: "Home", link: "/" },
            { label: "Demos", link: "/demos" },
            { label: "Stats", link: "/stats" },
          ],
        },
        {
          label: "Docs",
          autogenerate: { directory: "Docs" },
        },
      ],
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/vortexdl/aero",
        },
        {
          icon: "discord",
          label: "Discord",
          href: "https://discord.gg/browserports",
        },
      ],
    }),
  ],
  server: {
    port: 2526,
  },
  devToolbar: {
    enabled: false,
  },
  adapter: node({
    mode: "hybrid",
  }),
});

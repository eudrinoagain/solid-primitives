import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { defineConfig } from "vitest/config";
import devtools from "solid-devtools/vite";
import solid from "vite-plugin-solid";
import Unocss from "unocss/vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const styles = fs.readFileSync(path.join(__dirname, "./styles.css"), "utf-8");

export const viteConfig = defineConfig({
  server: {
    port: 3000,
  },
  plugins: [
    devtools({
      autoname: true,
    }),
    solid(),
    Unocss({
      preflights: [{ getCSS: () => styles }],
      shortcuts: {
        "center-child": "flex justify-center items-center",
        caption: "text-sm font-mono leading-tight",
        btn: "bg-teal-600 border-1 border-teal-500 hover:bg-teal-500 rounded cursor-pointer center-child select-none text-white font-semibold p-4 py-3 m-2",
        "wrapper-h":
          "p-6 flex justify-center items-center space-x-4 space-y-0 bg-gray-700 rounded-2xl",
        "wrapper-v": "wrapper-h flex-col space-x-0 space-y-4",
        node: "p-4 bg-orange-600 rounded m-2",
        input: "bg-gray-800 rounded border border-gray-600 px-3 py-2 text-white",
        ball: "w-8 h-8 fixed -top-4 -left-4 opacity-50 rounded-full pointer-events-none",
      },
    }),
  ],
  optimizeDeps: {
    exclude: ["@solid-primitives/utils"],
  },
  build: {
    target: "esnext",
  },
  // required to serve from a sub-path (github pages):
  base: "./",
});

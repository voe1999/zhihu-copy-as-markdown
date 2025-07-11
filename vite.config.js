import { defineConfig } from "vite";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, "src/entry.ts"),
            name: "zhihu-downloader",
            fileName: (format) => `zhihu-downloader.${format}.js`,
        },

    },
}) 
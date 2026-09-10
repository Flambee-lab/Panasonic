import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));

function htmlAliasPlugin() {
  const rewrite = (req) => {
    const path = req.url?.split("?")[0];
    if (path === "/monitor" || path === "/monitor/") {
      req.url = req.url.replace(path, "/monitor.html");
    }
    if (path === "/dashboard" || path === "/dashboard/") {
      req.url = req.url.replace(path, "/dashboard.html");
    }
  };

  return {
    name: "html-url-aliases",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        rewrite(req);
        next();
      });
    },
    configurePreview(server) {
      server.middlewares.use((req, _res, next) => {
        rewrite(req);
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), htmlAliasPlugin()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(root, "index.html"),
        monitor: resolve(root, "monitor.html"),
        dashboard: resolve(root, "dashboard.html"),
      },
    },
  },
});

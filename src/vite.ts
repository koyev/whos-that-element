import type { Plugin } from "vite";
import type { WhosThatElementOptions } from "./types.js";
import { transform } from "./core/transform.js";
import { getClientModule } from "./core/client.js";
import { createMiddleware } from "./core/server.js";

const SUPPORTED = /\.(jsx?|tsx?|vue|svelte)$/;
const VIRTUAL_CLIENT_ID = "\0virtual:wte-client";

// Return type is intentionally `any` so consumers running a different Vite
// version (v7 rollup vs v8 rolldown) don't hit Plugin type incompatibilities.
// The internal `Plugin` cast keeps hook implementations fully typed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function wte(options: WhosThatElementOptions = {}): any {
  const { triggerKey = "Alt", editor = "vscode", enabled } = options;
  const middleware = createMiddleware({ editor });

  // Updated in configureServer once the server is actually listening.
  // Important in cross-origin setups like Laravel where HTML is served by
  // PHP on a different port.
  let serverOrigin = "http://localhost:5173";

  const plugin: Plugin = {
    name: "whos-that-element",
    enforce: "pre",
    apply: "serve", // never runs during `vite build`

    configureServer(server) {
      server.middlewares.use(middleware);

      server.httpServer?.on("listening", () => {
        const addr = server.httpServer?.address();
        if (addr && typeof addr === "object") {
          const host =
            addr.address === "::" || addr.address === "0.0.0.0"
              ? "localhost"
              : addr.address;
          serverOrigin = `http://${host}:${addr.port}`;
        }
      });
    },

    // Intercept `import 'whos-that-element/client'` and return the real
    // client script with the correct Vite server endpoint baked in.
    resolveId(id) {
      if (id === "whos-that-element/client") return VIRTUAL_CLIENT_ID;
    },

    load(id, opts) {
      if (id !== VIRTUAL_CLIENT_ID) return;
      // Return a no-op in SSR context — DOM APIs don't exist in Node.js.
      if (opts?.ssr) return "export {}";
      return getClientModule({ triggerKey, endpoint: `${serverOrigin}/__wte/open` });
    },

    transform(code, id) {
      if (enabled === false) return null;
      if (process.env.NODE_ENV === "production") return null;
      if (id.includes("node_modules") || id.includes(".git")) return null;
      if (!SUPPORTED.test(id)) return null;
      return transform(code, id);
    },
  };

  return plugin;
}

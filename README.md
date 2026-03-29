<h1 align="center">Whos that element 🤔</h1>

<p align="center">
  <a href="https://www.npmjs.com/package/whos-that-element"><img src="https://img.shields.io/npm/v/whos-that-element?color=6366f1&label=npm" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/whos-that-element"><img src="https://img.shields.io/npm/dm/whos-that-element?color=6366f1" alt="npm downloads" /></a>
  <a href="https://github.com/koyev/whos-that-element/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/koyev/whos-that-element/ci.yml?branch=main&label=tests" alt="CI status" /></a>
  <a href="https://github.com/koyev/whos-that-element/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/whos-that-element?color=6366f1" alt="license" /></a>
</p>

<p align="center">
  <img src="./assets/banner.png" alt="whos-that-element banner" width="100%" />
</p>

<p align="center">
  Hold <kbd>Alt</kbd> and click any element in the browser to instantly open its source file in your IDE.<br />
  Works with React, Vue, and Svelte. Zero footprint in production.
</p>

---

## How it works

At dev-build time the Vite plugin walks the AST of every component file and injects a `data-wte="file:line:col"` attribute onto each element. A small client script (~1 KB) listens for <kbd>Alt</kbd>+click, reads that attribute, and posts to a local endpoint which calls [`launch-editor`](https://github.com/yyx990803/launch-editor) to open the exact file and line in your IDE.

---

## Installation

```bash
npm install -D whos-that-element
```

---

## Setup

### Laravel + Inertia (React / Vue / Svelte)

**`vite.config.ts`**

```ts
import { defineConfig } from "vite";
import laravel from "laravel-vite-plugin";
import react from "@vitejs/plugin-react"; // or vue() / svelte()
import wte from "whos-that-element/vite";

export default defineConfig({
  plugins: [
    laravel({ input: ["resources/js/app.tsx"], refresh: true }),
    react(),
    wte({ editor: "vscode" }),
  ],
});
```

**`resources/js/app.tsx`**

```ts
import "whos-that-element/client";
```

### Standalone Vite (React / Vue / Svelte)

**`vite.config.ts`**

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react"; // or vue() / svelte()
import wte from "whos-that-element/vite";

export default defineConfig({
  plugins: [react(), wte({ editor: "vscode" })],
});
```

**`src/main.tsx`**

```ts
import "whos-that-element/client";
```

> The `client` import is intercepted by the Vite plugin during dev and replaced with the real client script. In production it resolves to an empty stub — no code ships to users.

---

## Compatibility

| Environment                          | Status                 |
| ------------------------------------ | ---------------------- |
| Laravel + Inertia (React/Vue/Svelte) | ✅ Supported           |
| Vite + React / Vue / Svelte          | ✅ Supported           |
| Next.js                              | ❌ Not supported (yet) |
| Nuxt                                 | 🔜 Coming soon         |

---

## Options

| Option       | Type      | Default    | Description                                                   |
| ------------ | --------- | ---------- | ------------------------------------------------------------- |
| `editor`     | `string`  | `'vscode'` | IDE to open. One of `vscode`, `cursor`, `webstorm`, `sublime` |
| `triggerKey` | `string`  | `'Alt'`    | Modifier key. On macOS, `Alt` is the Option (⌥) key           |
| `enabled`    | `boolean` | auto       | Explicitly enable or disable the plugin                       |

---

Made with ❤️ by [koyev](https://github.com/koyev)

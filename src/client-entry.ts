// Fallback stub for whos-that-component/client.
//
// This file is only reached in production builds (where the wtc Vite plugin
// is not active). In development the plugin intercepts this module via
// resolveId/load and injects the real client script with the correct Vite
// server endpoint URL. In production this empty module is imported instead,
// which is a safe no-op and tree-shakes away entirely.
export {};

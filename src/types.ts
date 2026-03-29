export interface WhosThatComponentOptions {
  /** Modifier key required to trigger click. Default: 'Alt' */
  triggerKey?: "Alt" | "Meta" | "Ctrl" | "Shift";
  /** The IDE to open. Default: 'vscode' */
  editor?: "vscode" | "webstorm" | "cursor" | "sublime" | "antigravity";
  /** Explicitly enable or disable the plugin. Defaults to auto-detect from env. */
  enabled?: boolean;
}

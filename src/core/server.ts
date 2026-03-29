import { execFile } from "node:child_process";
import launchEditor from "launch-editor";

// launch-editor expects binary names, not product names.
// Map our option values to the correct executable.
const EDITOR_BINARIES: Record<string, string> = {
  vscode: "code",
  cursor: "cursor",
  webstorm: "webstorm",
  sublime: "subl",
  antigravity: "antigravity",
};

// macOS app bundle names used with `open -a` to bring the window to front.
const EDITOR_APP_NAMES: Record<string, string> = {
  vscode: "Visual Studio Code",
  cursor: "Cursor",
  webstorm: "WebStorm",
  sublime: "Sublime Text",
};

function focusEditor(editor: string): void {
  const appName = EDITOR_APP_NAMES[editor];
  if (!appName) return;
  if (process.platform === "darwin") {
    execFile("open", ["-a", appName]);
  } else if (process.platform === "linux") {
    execFile("wmctrl", ["-a", appName], () => {});
  }
  // Windows: CLI launch via launch-editor brings the window to front natively.
}

export function createMiddleware(options: { editor: string }) {
  return function (req: any, res: any, next: () => void) {
    // Strip query params before matching — dev servers often append cache-busting
    // strings like ?t=1234567890 that would break strict equality.
    const basePath = req.url.split("?")[0];

    if (basePath !== "/__wtc/open" || req.method !== "POST") {
      return next();
    }

    let body = "";
    req.on("data", (chunk: any) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        const { file, line, col } = JSON.parse(body);
        const editorBin = EDITOR_BINARIES[options.editor] ?? options.editor;
        launchEditor(`${file}:${line}:${col}`, editorBin);
        focusEditor(options.editor);
        res.statusCode = 200;
        res.end("ok");
      } catch (err) {
        res.statusCode = 500;
        res.end(String(err));
      }
    });
  };
}

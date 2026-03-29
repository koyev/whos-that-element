import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createMiddleware } from "../src/core/server.ts";

// ─── Test helpers ────────────────────────────────────────────────────────────

function makeReq(body: object, url = "/__wtc/open", method = "POST") {
  const bodyStr = JSON.stringify(body);
  return {
    url,
    method,
    headers: { "content-length": String(bodyStr.length) },
    on(event: string, cb: (chunk?: any) => void) {
      if (event === "data") cb(bodyStr);
      if (event === "end") cb();
      return this;
    },
  } as any;
}

function makeRes() {
  return {
    statusCode: 200,
    ended: false,
    body: "" as string | undefined,
    end(msg?: string) {
      this.ended = true;
      this.body = msg;
    },
  } as any;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("createMiddleware", () => {
  it("calls next() for non-matching routes", (_ctx, done) => {
    const mw = createMiddleware({ editor: "vscode" });
    const req = { url: "/other", method: "GET" } as any;
    const res = makeRes();
    mw(req, res, done);
  });

  it("calls next() for GET requests to the WTC path", (_ctx, done) => {
    const mw = createMiddleware({ editor: "vscode" });
    const req = { url: "/__wtc/open", method: "GET" } as any;
    const res = makeRes();
    mw(req, res, done);
  });

  it("handles POST /__wtc/open and ends the response", async () => {
    const mw = createMiddleware({ editor: "vscode" });
    const req = makeReq({ file: "/src/App.tsx", line: "5", col: "2" });
    const res = makeRes();
    const next = () => {
      throw new Error("next() must not be called for a matched route");
    };
    await new Promise<void>((resolve) => {
      mw(req, res, next);
      setImmediate(() => {
        assert.ok(res.ended, "response should be ended after handling");
        resolve();
      });
    });
  });

  it("strips query params before route matching (cache-busting safety)", async () => {
    const mw = createMiddleware({ editor: "vscode" });
    // Dev servers often append ?t=<timestamp> — the middleware must still match.
    const req = makeReq(
      { file: "/src/App.tsx", line: "3", col: "0" },
      "/__wtc/open?t=1234567890",
    );
    const res = makeRes();
    const next = () => {
      throw new Error("next() must not be called — query string should be stripped");
    };
    await new Promise<void>((resolve) => {
      mw(req, res, next);
      setImmediate(() => {
        assert.ok(res.ended, "response should be ended even with query params");
        resolve();
      });
    });
  });

  it("responds with status 200 on success", async () => {
    const mw = createMiddleware({ editor: "vscode" });
    const req = makeReq({ file: "/src/App.tsx", line: "1", col: "0" });
    const res = makeRes();
    await new Promise<void>((resolve) => {
      mw(req, res, () => {});
      setImmediate(() => {
        assert.equal(res.statusCode, 200);
        resolve();
      });
    });
  });
});

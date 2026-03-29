import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getClientModule } from "../src/core/client.ts";

describe("getClientModule", () => {
  it("returns a non-empty string", () => {
    const script = getClientModule({ triggerKey: "Alt", endpoint: "http://localhost:5173/__wtc/open" });
    assert.ok(script.length > 0);
  });

  it("bakes in the triggerKey", () => {
    const script = getClientModule({ triggerKey: "Meta", endpoint: "http://localhost:5173/__wtc/open" });
    assert.match(script, /Meta/);
  });

  it("bakes in the endpoint", () => {
    const script = getClientModule({ triggerKey: "Alt", endpoint: "http://localhost:5173/__wtc/open" });
    assert.match(script, /http:\/\/localhost:5173\/__wtc\/open/);
  });

  it("different endpoints produce different scripts", () => {
    const a = getClientModule({ triggerKey: "Alt", endpoint: "http://localhost:5173/__wtc/open" });
    const b = getClientModule({ triggerKey: "Alt", endpoint: "http://localhost:3000/__wtc/open" });
    assert.notEqual(a, b);
  });

  it("references mouseover and click events", () => {
    const script = getClientModule({ triggerKey: "Alt", endpoint: "http://localhost:5173/__wtc/open" });
    assert.match(script, /mouseover/);
    assert.match(script, /click/);
  });
});

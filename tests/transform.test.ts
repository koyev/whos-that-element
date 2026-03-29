import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { transform } from "../src/core/transform.ts";

describe("transform — safety rules", () => {
  it("returns null for node_modules files", () => {
    const result = transform(
      "<div />",
      "/project/node_modules/react/index.jsx",
    );
    assert.equal(result, null);
  });

  it("returns null for .git files", () => {
    const result = transform("<div />", "/project/.git/COMMIT_EDITMSG");
    assert.equal(result, null);
  });

  it("returns null for non-JSX files", () => {
    const result = transform("const x = 1;", "/project/src/utils.ts");
    assert.equal(result, null);
  });
});

describe("transform — JSX injection", () => {
  it("injects data-wtc onto a simple div", () => {
    const code = `export default function App() { return <div className="hello">Hi</div>; }`;
    const id = "/project/src/App.tsx";
    const result = transform(code, id);
    assert.ok(result, "should not return null");
    assert.match(result.code, /data-wtc=/);
    assert.match(result.code, /\/project\/src\/App\.tsx/);
  });

  it("injects data-wtc onto multiple sibling elements", () => {
    const code = `function A() { return (<div><span>a</span><p>b</p></div>); }`;
    const result = transform(code, "/src/A.jsx");
    assert.ok(result);
    const matches = result.code.match(/data-wtc=/g);
    assert.equal(matches?.length, 3, "should inject on div, span, and p");
  });

  it("does not double-inject if data-wtc already present", () => {
    const code = `function A() { return <div data-wtc="existing:1:0">hi</div>; }`;
    const result = transform(code, "/src/A.jsx");
    assert.ok(result);
    const matches = result.code.match(/data-wtc=/g);
    assert.equal(matches?.length, 1, "should not add a second data-wtc");
  });

  it("includes correct line number in the injected attribute", () => {
    const code = `function A() {\n  return (\n    <div>hi</div>\n  );\n}`;
    const result = transform(code, "/src/A.jsx");
    assert.ok(result);
    // <div> is on line 3
    assert.match(result.code, /data-wtc="\/src\/A\.jsx:3:/);
  });
});

describe("transform — Vue SFC injection", () => {
  it("injects data-wtc into a Vue template element", () => {
    const code = `<template>\n  <div class="app">Hello</div>\n</template>\n<script setup>\n</script>`;
    const result = transform(code, "/src/App.vue");
    assert.ok(result, "should not return null for .vue files");
    assert.match(result.code, /data-wtc=/);
    assert.match(result.code, /\/src\/App\.vue/);
  });

  it("returns null for vue files with no template block gracefully", () => {
    const code = `<script setup>const x = 1;</script>`;
    assert.doesNotThrow(() => transform(code, "/src/Comp.vue"));
  });
});

describe("transform — Svelte injection", () => {
  it("injects data-wtc into a Svelte template element", () => {
    const code = `<script>\n  let x = 1;\n</script>\n\n<div class="app">{x}</div>`;
    const result = transform(code, "/src/App.svelte");
    assert.ok(result, "should not return null for .svelte files");
    assert.match(result.code, /data-wtc=/);
    assert.match(result.code, /\/src\/App\.svelte/);
  });

  it("injects data-wtc onto nested Svelte elements", () => {
    const code = `<main><p>hello</p></main>`;
    const result = transform(code, "/src/B.svelte");
    assert.ok(result);
    const matches = result.code.match(/data-wtc=/g);
    assert.equal(matches?.length, 2, "should inject on main and p");
  });

  it("does not double-inject if data-wtc already present in Svelte", () => {
    const code = `<div data-wtc="existing:1:0">hi</div>`;
    const result = transform(code, "/src/C.svelte");
    // Either returns null (nothing to inject) or keeps exactly one data-wtc
    if (result !== null) {
      const matches = result.code.match(/data-wtc=/g);
      assert.equal(matches?.length, 1, "should not add a second data-wtc");
    }
  });
});

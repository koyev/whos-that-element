import { createRequire } from "node:module";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
import MagicString from "magic-string";
import type { NodePath } from "@babel/traverse";
import type { JSXOpeningElement, JSXIdentifier } from "@babel/types";

// @babel/traverse ships as CJS; in an ESM context the default import is the
// module wrapper object, so we need to unwrap the real function.
const traverse =
  typeof _traverse === "function"
    ? _traverse
    : ((_traverse as any).default as typeof _traverse);

// createRequire lets us use require() for optional peer deps in an ESM file.
const _require = createRequire(import.meta.url);

// ─── Optional peer dependency loaders ───────────────────────────────────────

function tryLoadVueCompiler(): typeof import("@vue/compiler-sfc") | null {
  try {
    return _require("@vue/compiler-sfc");
  } catch {
    return null;
  }
}

function tryLoadSvelteCompiler(): typeof import("svelte/compiler") | null {
  try {
    return _require("svelte/compiler");
  } catch {
    return null;
  }
}

// ─── Guards ─────────────────────────────────────────────────────────────────

const JSX_EXTENSIONS = /\.(jsx?|tsx?)$/;

function isSkipped(id: string): boolean {
  return id.includes("node_modules") || id.includes(".git");
}

// ─── Public entry point ─────────────────────────────────────────────────────

export function transform(
  code: string,
  id: string,
): { code: string; map: any } | null {
  if (isSkipped(id)) return null;

  if (id.endsWith(".vue")) return transformVue(code, id);
  if (id.endsWith(".svelte")) return transformSvelte(code, id);
  if (!JSX_EXTENSIONS.test(id)) return null;

  return transformJsx(code, id);
}

// ─── JSX / TSX ──────────────────────────────────────────────────────────────

function transformJsx(
  code: string,
  id: string,
): { code: string; map: any } | null {
  let hasJSX = false;
  const s = new MagicString(code);

  let ast;
  try {
    ast = parse(code, {
      sourceType: "module",
      plugins: [
        "jsx",
        id.endsWith(".tsx") || id.endsWith(".ts") ? "typescript" : null,
      ].filter(Boolean) as any[],
    });
  } catch {
    // Non-JSX TS file — skip silently
    return null;
  }

  traverse(ast, {
    JSXOpeningElement(path: NodePath<JSXOpeningElement>) {
      const node = path.node;

      // 1. SKIP NAMED FRAGMENTS (<Fragment> or <React.Fragment>)
      // Note: Shorthand <></> is already skipped because it's a JSXOpeningFragment,
      // not a JSXOpeningElement — Babel uses a distinct node type for it.
      const isFragment =
        (node.name.type === "JSXIdentifier" &&
          node.name.name === "Fragment") ||
        (node.name.type === "JSXMemberExpression" &&
          (node.name.object as JSXIdentifier).name === "React" &&
          (node.name.property as JSXIdentifier).name === "Fragment");

      if (isFragment) return;

      // We found a valid DOM-rendering JSX element — flag it AFTER the fragment guard.
      hasJSX = true;

      // 2. Skip if data-wtc already exists (idempotency)
      const alreadyInjected = node.attributes.some(
        (attr) =>
          attr.type === "JSXAttribute" && attr.name.name === "data-wtc",
      );
      if (alreadyInjected) return;

      const loc = node.loc?.start;
      if (!loc) return;

      const attr = ` data-wtc="${id}:${loc.line}:${loc.column}"`;

      // 3. Insert after the opening tag name using magic-string (preserves source maps)
      const nameEnd = node.name.end;
      if (nameEnd == null) return;
      s.prependLeft(nameEnd, attr);
    },
  });

  if (!hasJSX) return null;

  return {
    code: s.toString(),
    map: s.generateMap({ hires: true }),
  };
}

// ─── Vue SFC ─────────────────────────────────────────────────────────────────

function transformVue(
  code: string,
  id: string,
): { code: string; map: any } | null {
  const vue = tryLoadVueCompiler();
  if (!vue) return null;

  const { descriptor } = vue.parse(code, { filename: id });
  if (!descriptor.template) return null;

  const templateContent = descriptor.template.content;

  // Find the absolute character offset where the template content begins in the
  // full source file. We search starting from the block's own start offset so
  // we don't accidentally match identical content appearing earlier in the file.
  const templateContentStart = code.indexOf(
    templateContent,
    descriptor.template.loc.start.offset,
  );
  if (templateContentStart === -1) return null;

  const { ast } = vue.compileTemplate({
    source: templateContent,
    filename: id,
    id: "wtc",
  });

  if (!ast) return null;

  const s = new MagicString(code);

  function walkNode(node: any): void {
    if (node.type === 1 /* NodeTypes.ELEMENT */) {
      const alreadyInjected = node.props?.some(
        (p: any) => p.name === "data-wtc",
      );
      if (!alreadyInjected && node.loc) {
        // node.loc.start.offset is relative to templateContent; add the
        // absolute content start to get the position in the full source.
        // Then +1 to skip '<' and +node.tag.length to land after the tag name.
        const absOffset =
          templateContentStart +
          node.loc.start.offset +
          1 +
          node.tag.length;
        s.prependLeft(
          absOffset,
          ` data-wtc="${id}:${node.loc.start.line}:${node.loc.start.column}"`,
        );
      }
      node.children?.forEach(walkNode);
    }
  }

  ast.children?.forEach(walkNode);

  return { code: s.toString(), map: s.generateMap({ hires: true }) };
}

// ─── Svelte ──────────────────────────────────────────────────────────────────

function transformSvelte(
  code: string,
  id: string,
): { code: string; map: any } | null {
  const svelte = tryLoadSvelteCompiler();
  if (!svelte) return null;

  let ast: any;
  try {
    ast = svelte.parse(code, { filename: id });
  } catch {
    return null;
  }

  const s = new MagicString(code);
  let injected = false;

  function walkNode(node: any): void {
    // Svelte 4: type === "Element" | Svelte 5: type === "RegularElement"
    if (node.type === "Element" || node.type === "RegularElement") {
      const attrs: any[] = node.attributes ?? node.attrs ?? [];
      const alreadyInjected = attrs.some((a: any) => a.name === "data-wtc");
      if (!alreadyInjected) {
        // node.start is the offset of '<'; +1+name.length lands after the tag name.
        const name: string = node.name ?? node.tag ?? "";
        const insertPos = node.start + 1 + name.length;
        const before = code.slice(0, node.start);
        const line = before.split("\n").length;
        const col = node.start - before.lastIndexOf("\n") - 1;
        s.prependLeft(insertPos, ` data-wtc="${id}:${line}:${col}"`);
        injected = true;
      }
      const children: any[] = node.children ?? node.fragment?.nodes ?? [];
      children.forEach(walkNode);
    }
  }

  // Svelte 4: ast.html.children | Svelte 5: ast.fragment.nodes
  const roots: any[] =
    ast.html?.children ?? ast.fragment?.nodes ?? [];
  roots.forEach(walkNode);

  if (!injected) return null;

  return { code: s.toString(), map: s.generateMap({ hires: true }) };
}

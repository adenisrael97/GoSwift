#!/usr/bin/env node
/**
 * One-shot codemod: wrap every Next.js API route handler with withLogger().
 *
 * Walks app/api/, finds `export async function METHOD(...)` patterns, and
 * rewrites them as `export const METHOD = withLogger(name, async (...))`.
 * Adds the withLogger import if missing. Logical route name is derived
 * from the file path so the logs read like `orders.create` rather than
 * cryptic numeric route IDs.
 *
 * Idempotent — running twice does nothing because the patterns it looks
 * for no longer match after the first pass. Safe to commit and re-run.
 */
import fs   from 'node:fs/promises';
import path from 'node:path';

const API_ROOT = path.join(process.cwd(), 'app', 'api');
const METHODS  = ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'];

const METHOD_VERBS = {
  GET:    'get',
  POST:   'create',
  PATCH:  'update',
  PUT:    'replace',
  DELETE: 'delete',
};

async function walk(dir) {
  /** @type {string[]} */
  const out = [];
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (e.isFile() && e.name === 'route.js') out.push(p);
  }
  return out;
}

function routeNameFor(filePath, method) {
  const rel = path.relative(API_ROOT, filePath).replace(/\/route\.js$/, '');
  const segments = rel
    .split('/')
    .filter(Boolean)
    // strip dynamic segments like [orderId] and route groups like (auth)
    .filter((s) => !s.startsWith('[') && !s.startsWith('('));
  const base = segments.join('.');
  return `${base}.${METHOD_VERBS[method] ?? method.toLowerCase()}`;
}

function rewriteHandlers(src, filePath) {
  let out = src;
  let changed = false;

  for (const method of METHODS) {
    // Match the export and capture the args block. We require it to be
    // on a single line so we don't accidentally rewrite multi-line
    // signatures (none currently exist in this project).
    const exportRe = new RegExp(
      `export\\s+async\\s+function\\s+${method}\\s*\\(([^)]*)\\)\\s*\\{`,
      'g',
    );
    const matches = [...out.matchAll(exportRe)];
    if (matches.length === 0) continue;

    for (const m of matches) {
      const args = m[1].trim();
      const name = routeNameFor(filePath, method);
      const replacement =
        `export const ${method} = withLogger('${name}', async (${args}) => {`;
      out = out.replace(m[0], replacement);
      changed = true;
    }

    // The handler's closing `}` is now at the top level. We can't
    // reliably find it via regex alone, so we walk braces from the
    // location of each transformed export and append `);` at the
    // matching close. Done by re-scanning the file.
    out = closeWrappedHandlers(out, method);
  }

  // Add the import if anything changed and we haven't already.
  if (changed && !/from\s+['"]@\/lib\/api\/withLogger['"]/.test(out)) {
    out = injectImport(out);
  }

  return { content: out, changed };
}

/**
 * Convert each `export const METHOD = withLogger(..., async (...) => {`
 * block's top-level closing `}` to `});`. We walk the source from the
 * `{` after the arrow and match braces until we reach 0.
 */
function closeWrappedHandlers(src, method) {
  const startRe = new RegExp(
    `export\\s+const\\s+${method}\\s*=\\s*withLogger\\([^,]+,\\s*async\\s*\\([^)]*\\)\\s*=>\\s*\\{`,
    'g',
  );

  /** @type {Array<{ start: number, end: number }>} */
  const replacements = [];
  let m;
  while ((m = startRe.exec(src))) {
    const openIdx = src.indexOf('{', m.index + m[0].length - 1);
    const closeIdx = findMatchingClose(src, openIdx);
    if (closeIdx === -1) continue;
    // Only rewrite if the next non-whitespace char after `}` isn't
    // already `)` — protects idempotency.
    const after = src.slice(closeIdx + 1).match(/^\s*\)/);
    if (after) continue;
    replacements.push({ start: closeIdx, end: closeIdx + 1 });
  }

  // Apply in reverse so indices stay valid.
  let out = src;
  for (let i = replacements.length - 1; i >= 0; i--) {
    const r = replacements[i];
    out = out.slice(0, r.start) + '});' + out.slice(r.end);
  }
  return out;
}

function findMatchingClose(src, openIdx) {
  if (src[openIdx] !== '{') return -1;
  let depth = 0;
  let inString = false;
  let stringChar = '';
  let inLineComment = false;
  let inBlockComment = false;
  let inTemplate = false;
  let inRegex = false;

  for (let i = openIdx; i < src.length; i++) {
    const c = src[i];
    const next = src[i + 1];
    const prev = src[i - 1];

    if (inLineComment) {
      if (c === '\n') inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      if (c === '*' && next === '/') { inBlockComment = false; i++; }
      continue;
    }
    if (inString) {
      if (c === '\\') { i++; continue; }
      if (c === stringChar) inString = false;
      continue;
    }
    if (inTemplate) {
      if (c === '\\') { i++; continue; }
      if (c === '`') inTemplate = false;
      // Template expressions ${ ... } can contain braces; treat them as
      // depth changes inside the template too. The simple counter works
      // here because we only care about matching the outer { we started
      // with.
      else if (c === '{' && prev === '$') depth++;
      else if (c === '}') depth--;
      continue;
    }
    if (inRegex) {
      if (c === '\\') { i++; continue; }
      if (c === '/') inRegex = false;
      continue;
    }

    if (c === '/' && next === '/') { inLineComment = true; i++; continue; }
    if (c === '/' && next === '*') { inBlockComment = true; i++; continue; }
    if (c === '"' || c === "'") { inString = true; stringChar = c; continue; }
    if (c === '`') { inTemplate = true; continue; }
    // Crude regex literal detection — not foolproof but good enough for
    // our route files. We skip / following an alnum/closer because that's
    // typically a division, not a regex.
    if (c === '/' && !/[\w)\]]/.test(prev || '')) {
      inRegex = true;
      continue;
    }

    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function injectImport(src) {
  const importLine = `import { withLogger } from '@/lib/api/withLogger';\n`;
  // Insert after the last top-level import statement.
  const importBlockEnd = (() => {
    const re = /^import[^\n]*\n/gm;
    let last = -1;
    let m;
    while ((m = re.exec(src))) last = m.index + m[0].length;
    return last;
  })();
  if (importBlockEnd === -1) return importLine + src;
  return src.slice(0, importBlockEnd) + importLine + src.slice(importBlockEnd);
}

async function main() {
  const files = await walk(API_ROOT);
  let touched = 0;
  for (const f of files) {
    const src = await fs.readFile(f, 'utf8');
    const { content, changed } = rewriteHandlers(src, f);
    if (changed) {
      await fs.writeFile(f, content);
      touched++;
      console.log(`✓ ${path.relative(process.cwd(), f)}`);
    }
  }
  console.log(`\nWrapped handlers in ${touched} of ${files.length} files.`);
}

main().catch((e) => { console.error(e); process.exit(1); });

/**
 * Turbopack bundles lightningcss via a static require() and cannot resolve the
 * dynamic `require(\`lightningcss-${platform}-${arch}\`)` call inside
 * lightningcss/node/index.js. It falls through to the relative-path fallback:
 *   require('../lightningcss.<platform>-<arch>.node')
 * which expects the binary at the root of the lightningcss package.
 *
 * This script creates that symlink after every `npm install`.
 *
 * Uses require.resolve() rather than __dirname-relative paths so it works in
 * both a standalone project and an npm workspace where packages may be hoisted
 * to the monorepo root node_modules/.
 */

const { symlinkSync, existsSync, unlinkSync } = require('fs');
const path = require('path');

const platform   = process.platform;
const arch       = process.arch;
const binaryName = `lightningcss-${platform}-${arch}`;
const binaryFile = `lightningcss.${platform}-${arch}.node`;

let src, dest;
try {
  const binaryPkgDir       = path.dirname(require.resolve(`${binaryName}/package.json`));
  const lightningcssPkgDir = path.dirname(require.resolve('lightningcss/package.json'));
  src  = path.join(binaryPkgDir,       binaryFile);
  dest = path.join(lightningcssPkgDir, binaryFile);
} catch {
  // Platform binary or lightningcss not installed for this platform — nothing to do.
  process.exit(0);
}

if (!existsSync(src)) {
  process.exit(0);
}

if (existsSync(dest)) {
  unlinkSync(dest);
}

symlinkSync(src, dest);
console.log(`[postinstall] Linked ${binaryFile} into lightningcss/`);

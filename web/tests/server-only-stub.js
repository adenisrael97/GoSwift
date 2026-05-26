// Vitest stub for `server-only`.
//
// The real package throws on import outside a React Server Component
// context — which is the whole point in production but blocks unit
// tests that need to exercise server-only logic. We alias the package
// to this empty module so the import is a no-op under test.
export {};

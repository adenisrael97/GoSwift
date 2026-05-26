// Ambient module declarations for type-checking JS source via checkJs.
// Next.js handles CSS/SVG imports through its bundler; the TS type-checker
// needs these stubs so `import './globals.css'` and similar don't trip a
// "Cannot find module" error during `tsc --noEmit`.

declare module '*.css';
declare module '*.scss';
declare module '*.svg' {
  const src: string;
  export default src;
}
declare module '*.png' {
  const src: string;
  export default src;
}
declare module '*.jpg' {
  const src: string;
  export default src;
}

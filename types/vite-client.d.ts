// Local fallback so tsc succeeds without npm registry
declare module 'vite/client' {
  interface ImportMetaEnv {
    readonly [key: string]: string | undefined;
  }
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
  const _x: unknown;
  export {};
}

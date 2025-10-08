// Local fallback so tsc can resolve vite/client when real types are unavailable.
declare module 'vite/client' {
  interface ImportMetaEnv {
    readonly [key: string]: string | undefined;
  }
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

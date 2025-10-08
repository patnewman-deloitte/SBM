declare module 'vite' {
  export interface UserConfigExport {
    [key: string]: unknown;
  }
  export function defineConfig(config: UserConfigExport): UserConfigExport;
}

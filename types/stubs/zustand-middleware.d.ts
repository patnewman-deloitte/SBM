declare module 'zustand/middleware' {
  import type { StateCreator } from 'zustand';
  export function devtools<T>(config: StateCreator<T>): StateCreator<T>;
  export function persist<T>(config: StateCreator<T>, options: { name: string }): StateCreator<T>;
}

declare module 'zustand' {
  export type StateCreator<T> = (
    set: (partial: Partial<T> | ((state: T) => Partial<T>), replace?: boolean) => void,
    get: () => T,
    api: StoreApi<T>
  ) => T;

  export interface StoreApi<T> {
    getState: () => T;
    setState: (
      partial: Partial<T> | T | ((state: T) => Partial<T> | T),
      replace?: boolean
    ) => void;
    subscribe: (listener: (state: T, prevState: T) => void) => () => void;
  }

  export interface UseBoundStore<T> {
    (): T;
    <U>(selector: (state: T) => U): U;
    getState: () => T;
    setState: StoreApi<T>['setState'];
    subscribe: StoreApi<T>['subscribe'];
  }

  export function create<T>(creator: StateCreator<T>): UseBoundStore<T> & StoreApi<T>;
}

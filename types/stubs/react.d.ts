declare namespace React {
  type ReactNode = any;
  interface FC<P = {}> {
    (props: P & { children?: ReactNode }): ReactNode;
  }
  type ComponentType<P = {}> = FC<P>;
  type Dispatch<A> = (value: A) => void;
  type SetStateAction<S> = S | ((prevState: S) => S);
  interface MutableRefObject<T> {
    current: T;
  }
  type ChangeEvent<T = any> = {
    target: T;
    currentTarget: T;
  } & { [key: string]: any };
  type MouseEvent<T = any> = {
    target: T;
    currentTarget: T;
    preventDefault: () => void;
    stopPropagation: () => void;
  } & { [key: string]: any };
  interface Context<T> {
    Provider: FC<{ value: T; children?: ReactNode }>;
    Consumer: any;
    _currentValue?: T;
  }
  function createElement(type: any, props: any, ...children: any[]): any;
  function useState<S>(initialState: S | (() => S)): [S, Dispatch<SetStateAction<S>>];
  function useEffect(effect: () => void | (() => void), deps?: readonly any[]): void;
  function useMemo<T>(factory: () => T, deps: readonly any[]): T;
  function useCallback<T extends (...args: any[]) => any>(callback: T, deps: readonly any[]): T;
  function useRef<T>(initialValue: T | null): MutableRefObject<T | null>;
  function useContext<T>(context: Context<T>): T;
  function createContext<T>(defaultValue: T): Context<T>;
  function useReducer<R extends (...args: any) => any, I>(
    reducer: R,
    initialArg: I,
    init?: (arg: I) => any
  ): [any, Dispatch<any>];
  function useLayoutEffect(effect: () => void | (() => void), deps?: readonly any[]): void;
  function useTransition(): [boolean, (callback: () => void) => void];
  function useId(): string;
  function useDeferredValue<T>(value: T): T;
  function memo<P>(component: ComponentType<P>, propsAreEqual?: (prev: P, next: P) => boolean): ComponentType<P>;
  const Fragment: FC<{ children?: ReactNode }>;
  const StrictMode: FC<{ children?: ReactNode }>;
  const Suspense: FC<{ children?: ReactNode; fallback?: ReactNode }>;
}

declare module 'react' {
  export = React;
  export as namespace React;
  export type ReactNode = React.ReactNode;
  export type FC<P = {}> = React.FC<P>;
  export type ComponentType<P = {}> = React.ComponentType<P>;
  export type Dispatch<A> = React.Dispatch<A>;
  export type SetStateAction<S> = React.SetStateAction<S>;
  export type MutableRefObject<T> = React.MutableRefObject<T>;
  export type ChangeEvent<T = any> = React.ChangeEvent<T>;
  export type MouseEvent<T = any> = React.MouseEvent<T>;
  export type Context<T> = React.Context<T>;
  export const createElement: typeof React.createElement;
  export const useState: typeof React.useState;
  export const useEffect: typeof React.useEffect;
  export const useMemo: typeof React.useMemo;
  export const useCallback: typeof React.useCallback;
  export const useRef: typeof React.useRef;
  export const useContext: typeof React.useContext;
  export const createContext: typeof React.createContext;
  export const useReducer: typeof React.useReducer;
  export const useLayoutEffect: typeof React.useLayoutEffect;
  export const useTransition: typeof React.useTransition;
  export const useId: typeof React.useId;
  export const useDeferredValue: typeof React.useDeferredValue;
  export const memo: typeof React.memo;
  export const Fragment: typeof React.Fragment;
  export const StrictMode: typeof React.StrictMode;
  export const Suspense: typeof React.Suspense;
}

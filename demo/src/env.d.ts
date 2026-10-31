declare module '*.scss'
declare module '*.png'
declare module '*.jpg'
declare module '*.svg'

declare function defineAppConfig(config: Record<string, any>): Record<string, any>
declare function definePageConfig(config: Record<string, any>): Record<string, any>

declare module 'react' {
  export type ReactNode = any
  export type FC<P = {}> = (props: P) => any
  export interface MutableRefObject<T> {
    current: T
  }
  export function useState<T>(initialState: T | (() => T)): [T, (value: T | ((prev: T) => T)) => void]
  export function useEffect(effect: () => void | (() => void), deps?: ReadonlyArray<any>): void
  export function useMemo<T>(factory: () => T, deps: ReadonlyArray<any>): T
  export function useRef<T>(initialValue: T): MutableRefObject<T>
  export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: ReadonlyArray<any>): T
  const React: any
  export default React
}

declare module 'react/jsx-runtime' {
  export function jsx(type: any, props: any, key?: any): any
  export function jsxs(type: any, props: any, key?: any): any
  export const Fragment: any
}

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any
  }
}

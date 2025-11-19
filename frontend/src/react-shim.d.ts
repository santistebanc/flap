// Declare React module when it's not available locally (e.g., in Docker-only setup)
declare module 'react' {
  export function useState<T>(initialState: T | (() => T)): [T, (value: T | ((prev: T) => T)) => void];
  export function useEffect(effect: () => void | (() => void), deps?: any[]): void;
  export function useRef<T>(initialValue: T): { current: T };
  export function useContext<T>(context: any): T;
  export function useMemo<T>(factory: () => T, deps?: any[]): T;
  export function useCallback<T extends (...args: any[]) => any>(callback: T, deps?: any[]): T;
  export function createContext<T>(defaultValue: T): any;
  export function createElement(type: any, props?: any, ...children: any[]): any;
  export function forwardRef<T, P = {}>(
    render: (props: P, ref: React.Ref<T>) => React.ReactElement | null
  ): React.ForwardRefExoticComponent<React.PropsWithoutRef<P> & React.RefAttributes<T>>;
  export const Fragment: { new (): any };
  export const StrictMode: { new (): any };
  export type ReactNode = any;
  export type ReactElement = any;
  export type ComponentType<P = {}> = any;
  export type FC<P = {}> = (props: P & { children?: any }) => ReactElement;
  export type Ref<T> = any;
  export type RefObject<T> = { current: T | null };
  export type ForwardRefExoticComponent<P> = any;
  export type PropsWithoutRef<P> = P;
  export type RefAttributes<T> = { ref?: Ref<T> };
  export type ElementRef<T extends keyof JSX.IntrinsicElements | React.ComponentType<any>> = T extends React.ComponentType<infer P> ? P extends { ref?: infer R } ? R : any : any;
  export type ComponentPropsWithoutRef<T extends keyof JSX.IntrinsicElements | React.ComponentType<any>> = T extends React.ComponentType<infer P> ? P : any;
  
  export namespace React {
    export interface HTMLAttributes<T = HTMLElement> {
      className?: string;
      [key: string]: any;
    }
    
    export interface ButtonHTMLAttributes<T = HTMLButtonElement> extends HTMLAttributes<T> {
      disabled?: boolean;
      form?: string;
      formAction?: string;
      formEncType?: string;
      formMethod?: string;
      formNoValidate?: boolean;
      formTarget?: string;
      name?: string;
      type?: 'button' | 'submit' | 'reset';
      value?: string | string[] | number;
    }
  }
  
  // Also export at top level for convenience
  export interface HTMLAttributes<T = HTMLElement> extends React.HTMLAttributes<T> {}
  export interface ButtonHTMLAttributes<T = HTMLButtonElement> extends React.ButtonHTMLAttributes<T> {}
  
  export default {
    useState,
    useEffect,
    useRef,
    useContext,
    useMemo,
    useCallback,
    createContext,
    createElement,
    forwardRef,
    Fragment,
    StrictMode,
  };
}

// Declare react-dom module when it's not available locally
declare module 'react-dom' {
  export function render(element: any, container: any): void;
  export function hydrate(element: any, container: any): void;
  export function createRoot(container: any): {
    render(element: any): void;
    unmount(): void;
  };
}

// Declare react-dom/client module (React 18+)
declare module 'react-dom/client' {
  export function createRoot(container: Element | DocumentFragment): {
    render(element: any): void;
    unmount(): void;
  };
}

// Declare JSX namespace globally to ensure all HTML elements are recognized
// This provides a fallback when React types aren't immediately available
declare global {
  namespace JSX {
    interface Element {
      type: any;
      props: any;
      key: any;
    }
    interface ElementClass {
      render(): Element;
    }
    interface ElementAttributesProperty {
      props: {};
    }
    interface ElementChildrenAttribute {
      children: {};
    }
    interface IntrinsicElements {
      // Allow any HTML element name with standard HTML attributes
      a: any;
      abbr: any;
      address: any;
      area: any;
      article: any;
      aside: any;
      audio: any;
      b: any;
      base: any;
      bdi: any;
      bdo: any;
      big: any;
      blockquote: any;
      body: any;
      br: any;
      button: any;
      canvas: any;
      caption: any;
      cite: any;
      code: any;
      col: any;
      colgroup: any;
      data: any;
      datalist: any;
      dd: any;
      del: any;
      details: any;
      dfn: any;
      dialog: any;
      div: any;
      dl: any;
      dt: any;
      em: any;
      embed: any;
      fieldset: any;
      figcaption: any;
      figure: any;
      footer: any;
      form: any;
      h1: any;
      h2: any;
      h3: any;
      h4: any;
      h5: any;
      h6: any;
      head: any;
      header: any;
      hgroup: any;
      hr: any;
      html: any;
      i: any;
      iframe: any;
      img: any;
      input: any;
      ins: any;
      kbd: any;
      keygen: any;
      label: any;
      legend: any;
      li: any;
      link: any;
      main: any;
      map: any;
      mark: any;
      menu: any;
      menuitem: any;
      meta: any;
      meter: any;
      nav: any;
      noscript: any;
      object: any;
      ol: any;
      optgroup: any;
      option: any;
      output: any;
      p: any;
      param: any;
      picture: any;
      pre: any;
      progress: any;
      q: any;
      rp: any;
      rt: any;
      ruby: any;
      s: any;
      samp: any;
      script: any;
      section: any;
      select: any;
      small: any;
      source: any;
      span: any;
      strong: any;
      style: any;
      sub: any;
      summary: any;
      sup: any;
      table: any;
      tbody: any;
      td: any;
      textarea: any;
      tfoot: any;
      th: any;
      thead: any;
      time: any;
      title: any;
      tr: any;
      track: any;
      u: any;
      ul: any;
      var: any;
      video: any;
      wbr: any;
      // Also allow any other element name
      [elemName: string]: any;
    }
  }
}

declare module 'react/jsx-runtime' {
  import * as React from 'react';
  
  export function jsx(
    type: React.ElementType,
    props: Record<string, unknown>,
    key?: React.Key
  ): React.ReactElement;
  
  export function jsxs(
    type: React.ElementType,
    props: Record<string, unknown>,
    key?: React.Key
  ): React.ReactElement;
  
  export const Fragment: typeof React.Fragment;
}

declare module 'react/jsx-dev-runtime' {
  import * as React from 'react';
  
  export function jsxDEV(
    type: React.ElementType,
    props: Record<string, unknown>,
    key?: React.Key,
    isStaticChildren?: boolean,
    source?: { fileName: string; lineNumber: number; columnNumber: number },
    self?: unknown
  ): React.ReactElement;
  
  export const Fragment: typeof React.Fragment;
}

// Declare lucide-react module when it's not available locally
declare module 'lucide-react' {
  import * as React from 'react';
  
  export interface IconProps {
    className?: string;
    size?: string | number;
    strokeWidth?: string | number;
    color?: string;
    [key: string]: any; // Allow any other props
  }
  
  export const Plane: React.FC<IconProps>;
  export const Clock: React.FC<IconProps>;
  export const DollarSign: React.FC<IconProps>;
  export const MapPin: React.FC<IconProps>;
  export const Search: React.FC<IconProps>;
  export const Calendar: React.FC<IconProps>;
  export const ArrowRight: React.FC<IconProps>;
  export const ArrowLeft: React.FC<IconProps>;
  export const X: React.FC<IconProps>;
  export const Check: React.FC<IconProps>;
  export const ChevronDown: React.FC<IconProps>;
  export const ChevronUp: React.FC<IconProps>;
  export const Loader2: React.FC<IconProps>;
  // Add more icons as needed - lucide-react has many icons
}

// Declare class-variance-authority module when it's not available locally
declare module 'class-variance-authority' {
  export function cva(
    base: string,
    config?: {
      variants?: Record<string, Record<string, string>>;
      defaultVariants?: Record<string, string>;
      compoundVariants?: Array<{
        [key: string]: any;
        class?: string;
        className?: string;
      }>;
    }
  ): (props?: Record<string, any>) => string;
  
  export type VariantProps<T> = T extends (...args: any[]) => any
    ? Parameters<T>[0] extends Record<string, any>
      ? Parameters<T>[0]
      : {}
    : {};
}

// Declare @radix-ui/react-slot module when it's not available locally
declare module '@radix-ui/react-slot' {
  import * as React from 'react';
  
  export interface SlotProps extends React.HTMLAttributes<HTMLElement> {
    children?: React.ReactNode;
    asChild?: boolean;
  }
  
  export const Slot: React.ForwardRefExoticComponent<
    SlotProps & React.RefAttributes<HTMLElement>
  >;
}

// Declare @radix-ui/react-label module when it's not available locally
declare module '@radix-ui/react-label' {
  import * as React from 'react';
  
  export interface LabelProps extends React.HTMLAttributes<HTMLLabelElement> {
    htmlFor?: string;
    asChild?: boolean;
  }
  
  export const Root: React.ForwardRefExoticComponent<
    LabelProps & React.RefAttributes<HTMLLabelElement>
  >;
  
  // Export as namespace for LabelPrimitive usage
  export const Label: React.ForwardRefExoticComponent<
    LabelProps & React.RefAttributes<HTMLLabelElement>
  >;
}

// Declare clsx module when it's not available locally
declare module 'clsx' {
  export type ClassValue = string | number | boolean | undefined | null | { [key: string]: any } | ClassValue[];
  export function clsx(...inputs: ClassValue[]): string;
}

// Declare tailwind-merge module when it's not available locally
declare module 'tailwind-merge' {
  export function twMerge(...inputs: (string | undefined | null | false)[]): string;
}


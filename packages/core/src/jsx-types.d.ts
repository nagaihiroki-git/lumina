import type { LuminaNode, IntrinsicElements as TypedElements } from "./types";

export interface FragmentType {
  (props: { children?: LuminaNode[] }): LuminaNode[];
}

declare global {
  namespace JSX {
    // Use typed IntrinsicElements from types.ts
    interface IntrinsicElements extends TypedElements {}

    type Element = LuminaNode;

    interface ElementClass {
      render(): LuminaNode;
    }

    interface ElementAttributesProperty {
      props: {};
    }

    interface ElementChildrenAttribute {
      children: {};
    }

    interface IntrinsicAttributes {
      key?: string | number;
    }
  }
}

export {};

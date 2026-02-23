import type { LuminaElement, LuminaNode } from "./types";

const FragmentSymbol = Symbol("Fragment");
export const Fragment = FragmentSymbol as unknown as (props: { children?: LuminaNode[] }) => LuminaNode[];

export function createElement(
  type: string | typeof Fragment | ((props: any) => LuminaNode),
  props: Record<string, any> | null,
  ...children: any[]
): LuminaElement | LuminaNode[] {
  const flatChildren = (children.flat(Infinity) as any[]).filter(
    (c) => c !== null && c !== undefined && c !== true && c !== false
  ) as LuminaNode[];

  if ((type as unknown) === FragmentSymbol) {
    return flatChildren;
  }

  return {
    type,
    props: props ?? {},
    children: flatChildren,
  };
}

export function jsx(type: any, props: any, _key?: string): LuminaElement | LuminaNode[] {
  const { children, ...rest } = props;
  return createElement(type, rest, ...(Array.isArray(children) ? children : [children]));
}

export const jsxs = jsx;
export const jsxDEV = jsx;

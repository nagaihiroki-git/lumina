import { createElement } from "@lumina/core";
import { css } from "./css";

type MaybeSignal<T> = T | (() => T);
type Interpolation<P> = string | number | ((props: P) => string | number | false | null | undefined);

type StyledComponent<BaseProps, ExtraProps = {}> = {
  (props: BaseProps & ExtraProps & { className?: MaybeSignal<string>; children?: any }): any;
};

let idCounter = 0;
function generateId(): string {
  return `sc-${(++idCounter).toString(36)}`;
}

function resolveProps<P extends object>(props: P): P {
  const resolved: any = {};
  for (const [key, value] of Object.entries(props)) {
    resolved[key] = typeof value === "function" && key.startsWith("$") ? value() : value;
  }
  return resolved;
}

function processTemplate<P>(
  strings: TemplateStringsArray,
  interpolations: Interpolation<P>[],
  props: P
): string {
  let result = strings[0];

  for (let i = 0; i < interpolations.length; i++) {
    const interp = interpolations[i];
    let value: string | number | false | null | undefined;

    if (typeof interp === "function") {
      value = interp(props);
    } else {
      value = interp;
    }

    if (value === false || value === null || value === undefined) {
      value = "";
    }

    result += String(value) + strings[i + 1];
  }

  return result;
}

function hasDynamicInterpolation<P>(interpolations: Interpolation<P>[]): boolean {
  return interpolations.some((i) => typeof i === "function");
}

function filterTransientProps<P extends object>(props: P): Partial<P> {
  const filtered: any = {};
  for (const [key, value] of Object.entries(props)) {
    if (!key.startsWith("$")) {
      filtered[key] = value;
    }
  }
  return filtered;
}

const MAX_STYLE_CACHE_SIZE = 500;
const styleCache = new Map<string, string>();

function evictOldestStyleIfNeeded(): void {
  if (styleCache.size >= MAX_STYLE_CACHE_SIZE) {
    const firstKey = styleCache.keys().next().value;
    if (firstKey) styleCache.delete(firstKey);
  }
}

function createStyled<Tag extends string, BaseProps = any>(tag: Tag) {
  return function <ExtraProps extends object = {}>(
    strings: TemplateStringsArray,
    ...interpolations: Interpolation<BaseProps & ExtraProps>[]
  ): StyledComponent<BaseProps, ExtraProps> {
    const isDynamic = hasDynamicInterpolation(interpolations);

    if (!isDynamic) {
      const cssText = processTemplate(strings, interpolations, {} as any);
      const className = css`${cssText}`;

      return function StyledComponent(props: any) {
        const { className: extraClass, children, ...rest } = props;
        const filteredProps = filterTransientProps(rest);

        const reactiveClassName = typeof extraClass === "function"
          ? () => `${className} ${extraClass()}`
          : extraClass
            ? `${className} ${extraClass}`
            : className;

        return createElement(tag, { ...filteredProps, className: reactiveClassName }, ...(Array.isArray(children) ? children : [children].filter(Boolean)));
      };
    }

    const componentId = generateId();

    return function StyledComponent(props: any) {
      const { className: extraClass, children, ...rest } = props;
      const filteredProps = filterTransientProps(rest);

      const reactiveClassName = () => {
        const resolvedProps = resolveProps(props);
        const cssText = processTemplate(strings, interpolations, resolvedProps);

        const cacheKey = `${componentId}:${cssText}`;
        let className = styleCache.get(cacheKey);

        if (!className) {
          evictOldestStyleIfNeeded();
          className = css`${cssText}`;
          styleCache.set(cacheKey, className);
        }

        const extra = typeof extraClass === "function" ? extraClass() : extraClass;
        return extra ? `${className} ${extra}` : className;
      };

      return createElement(tag, { ...filteredProps, className: reactiveClassName }, ...(Array.isArray(children) ? children : [children].filter(Boolean)));
    };
  };
}

type StyledFactory = {
  [K in string]: <P extends object = {}>(
    strings: TemplateStringsArray,
    ...values: Interpolation<P>[]
  ) => StyledComponent<any, P>;
};

export const styled = new Proxy({} as StyledFactory, {
  get(_, tag: string) {
    return createStyled(tag);
  },
});

export { css };

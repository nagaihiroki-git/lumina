type ClassValue = string | boolean | null | undefined | ClassValue[] | Record<string, boolean>;

// classnames-like utility
export function cx(...args: ClassValue[]): string {
  const classes: string[] = [];

  for (const arg of args) {
    if (!arg) continue;

    if (typeof arg === "string") {
      classes.push(arg);
    } else if (Array.isArray(arg)) {
      classes.push(cx(...arg));
    } else if (typeof arg === "object") {
      for (const [key, value] of Object.entries(arg)) {
        if (value) classes.push(key);
      }
    }
  }

  return classes.join(" ");
}

// CVA (Class Variance Authority) - like utility
type VariantConfig<V extends Record<string, Record<string, string>>> = {
  base?: string;
  variants?: V;
  defaultVariants?: { [K in keyof V]?: keyof V[K] };
  compoundVariants?: Array<
    { [K in keyof V]?: keyof V[K] } & { className: string }
  >;
};

type VariantProps<V extends Record<string, Record<string, string>>> = {
  [K in keyof V]?: keyof V[K];
};

export function cva<V extends Record<string, Record<string, string>>>(
  config: VariantConfig<V>
) {
  return (props?: VariantProps<V> & { className?: string }): string => {
    const classes: string[] = [];

    // Base
    if (config.base) {
      classes.push(config.base);
    }

    // Variants
    if (config.variants && props) {
      for (const [variantKey, variantValue] of Object.entries(config.variants)) {
        const value =
          props[variantKey as keyof V] ??
          config.defaultVariants?.[variantKey as keyof V];

        if (value && variantValue[value as string]) {
          classes.push(variantValue[value as string]);
        }
      }
    }

    // Compound variants
    if (config.compoundVariants && props) {
      for (const compound of config.compoundVariants) {
        const { className, ...conditions } = compound;
        const matches = Object.entries(conditions).every(
          ([key, value]) => props[key as keyof V] === value
        );
        if (matches) {
          classes.push(className);
        }
      }
    }

    // Additional className
    if (props?.className) {
      classes.push(props.className);
    }

    return classes.join(" ");
  };
}

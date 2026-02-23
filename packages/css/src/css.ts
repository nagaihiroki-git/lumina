import { getCssEngine, applyCss } from "@lumina/core";

let styleCounter = 0;

const MAX_CACHE_SIZE = 1000;
const injectedStyles = new Map<string, string>();

function evictOldestIfNeeded(): void {
  if (injectedStyles.size >= MAX_CACHE_SIZE) {
    const firstKey = injectedStyles.keys().next().value;
    if (firstKey) injectedStyles.delete(firstKey);
  }
}

function generateClassName(): string {
  return `lm-${(styleCounter++).toString(36)}`;
}

function hash(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return h.toString(36);
}

function injectCss(cssText: string): void {
  const engine = getCssEngine();
  if (engine) {
    engine.injectCss(cssText);
  } else {
    try {
      applyCss(cssText, false);
    } catch (e) {
      console.error("Failed to inject CSS:", e);
    }
  }
}

export function css(
  strings: TemplateStringsArray,
  ...values: (string | number)[]
): string {
  const rawCss = strings.reduce(
    (acc, str, i) => acc + str + (values[i] ?? ""),
    ""
  );

  const cacheKey = hash(rawCss);

  if (injectedStyles.has(cacheKey)) {
    return injectedStyles.get(cacheKey)!;
  }

  evictOldestIfNeeded();

  const className = generateClassName();
  const fullCss = `.${className} { ${rawCss} }`;

  injectCss(fullCss);
  injectedStyles.set(cacheKey, className);

  return className;
}

export function injectGlobal(
  strings: TemplateStringsArray,
  ...values: (string | number)[]
): void {
  const rawCss = strings.reduce(
    (acc, str, i) => acc + str + (values[i] ?? ""),
    ""
  );
  injectCss(rawCss);
}

export function keyframes(
  strings: TemplateStringsArray,
  ...values: (string | number)[]
): string {
  const rawCss = strings.reduce(
    (acc, str, i) => acc + str + (values[i] ?? ""),
    ""
  );

  const name = `lm-kf-${generateClassName()}`;
  const fullCss = `@keyframes ${name} { ${rawCss} }`;

  injectCss(fullCss);
  return name;
}

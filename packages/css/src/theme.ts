import { createSignal } from "@lumina/bridge";
import { getCssEngine } from "@lumina/core";
import { injectGlobal } from "./css";

type ThemeTokens = {
  colors?: Record<string, string>;
  spacing?: Record<string, string>;
  radii?: Record<string, string>;
  fonts?: Record<string, string>;
  shadows?: Record<string, string>;
};

type Theme = {
  name: string;
  tokens: ThemeTokens;
};

const [currentTheme, setCurrentTheme] = createSignal<Theme | null>(null);

export function createTheme(name: string, tokens: ThemeTokens): Theme {
  return { name, tokens };
}

function applyTheme(theme: Theme): void {
  const engine = getCssEngine();

  if (!engine) {
    const defs: string[] = [];
    if (theme.tokens.colors) {
      for (const [key, value] of Object.entries(theme.tokens.colors)) {
        defs.push(`@define-color ${key} ${value};`);
      }
    }
    if (defs.length > 0) {
      injectGlobal`${defs.join("\n")}`;
    }
    return;
  }

  if (theme.tokens.colors) {
    for (const [key, value] of Object.entries(theme.tokens.colors)) {
      engine.defineVariable(key, value);
    }
  }
}

export function ThemeProvider(theme: Theme): void {
  setCurrentTheme(theme);
  applyTheme(theme);
}

export function useTheme(): () => Theme | null {
  return currentTheme;
}

export function switchTheme(theme: Theme): void {
  setCurrentTheme(theme);
  applyTheme(theme);
}

export function cssVar(name: string): string {
  const engine = getCssEngine();
  if (engine) {
    return engine.getVariableReference(name);
  }
  return `@${name}`;
}

export const catppuccinMocha = createTheme("catppuccin-mocha", {
  colors: {
    base: "#1e1e2e",
    mantle: "#181825",
    crust: "#11111b",
    surface0: "#313244",
    surface1: "#45475a",
    surface2: "#585b70",
    overlay0: "#6c7086",
    overlay1: "#7f849c",
    overlay2: "#9399b2",
    text: "#cdd6f4",
    subtext0: "#a6adc8",
    subtext1: "#bac2de",
    blue: "#89b4fa",
    lavender: "#b4befe",
    sapphire: "#74c7ec",
    sky: "#89dceb",
    teal: "#94e2d5",
    green: "#a6e3a1",
    yellow: "#f9e2af",
    peach: "#fab387",
    maroon: "#eba0ac",
    red: "#f38ba8",
    mauve: "#cba6f7",
    pink: "#f5c2e7",
  },
  spacing: {
    xs: "4px",
    sm: "8px",
    md: "16px",
    lg: "24px",
    xl: "32px",
  },
  radii: {
    sm: "4px",
    md: "8px",
    lg: "12px",
    full: "9999px",
  },
});

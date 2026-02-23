// Platform-independent CSS engine abstraction

export type VariableSyntax = "gtk" | "css-custom-properties";

/**
 * CSS engine interface.
 * Implemented by platform hosts to handle CSS injection.
 */
export interface CssEngine {
  /**
   * Inject CSS into the application.
   */
  injectCss(css: string): void;

  /**
   * Define a color/theme variable.
   * Returns the syntax to reference it in CSS.
   *
   * For GTK: @define-color name value; → @name
   * For Web: --name: value; → var(--name)
   */
  defineVariable(name: string, value: string): string;

  /**
   * Get the reference syntax for a defined variable.
   *
   * For GTK: @name
   * For Web: var(--name)
   */
  getVariableReference(name: string): string;

  /**
   * The variable syntax this engine uses.
   */
  readonly syntax: VariableSyntax;
}

let currentEngine: CssEngine | null = null;

/**
 * Register a CSS engine (called by platform host or css package).
 */
export function setCssEngine(engine: CssEngine): void {
  currentEngine = engine;
}

/**
 * Get the current CSS engine.
 */
export function getCssEngine(): CssEngine | null {
  return currentEngine;
}

/**
 * GTK3 CSS engine implementation.
 * Uses @define-color for theme variables.
 */
export function createGtk3CssEngine(applyCss: (css: string) => void): CssEngine {
  return {
    syntax: "gtk",

    injectCss(css: string): void {
      applyCss(css);
    },

    defineVariable(name: string, value: string): string {
      this.injectCss(`@define-color ${name} ${value};`);
      return `@${name}`;
    },

    getVariableReference(name: string): string {
      return `@${name}`;
    },
  };
}

/**
 * Standard CSS custom properties engine.
 * Uses --var: value for theme variables.
 */
export function createCssPropertiesEngine(applyCss: (css: string) => void): CssEngine {
  return {
    syntax: "css-custom-properties",

    injectCss(css: string): void {
      applyCss(css);
    },

    defineVariable(name: string, value: string): string {
      this.injectCss(`:root { --${name}: ${value}; }`);
      return `var(--${name})`;
    },

    getVariableReference(name: string): string {
      return `var(--${name})`;
    },
  };
}

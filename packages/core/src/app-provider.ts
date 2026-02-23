// Platform-independent application lifecycle abstraction

export interface AppOptions {
  instanceName?: string;
  gtkTheme?: string;
  iconTheme?: string;
  cursorTheme?: string;
  css?: string;
  main: () => void;
}

/**
 * Application provider interface.
 * Implemented by platform hosts to handle app lifecycle.
 */
export interface AppProvider {
  /**
   * Start the application with given options.
   */
  start(options: AppOptions): void;

  /**
   * Get the native application instance.
   * Returns platform-specific app object.
   */
  getApp(): unknown | null;

  /**
   * Apply CSS styles globally.
   * @param css - CSS string to apply
   * @param reset - If true, replace all CSS; if false, append
   */
  applyCss(css: string, reset?: boolean): void;

  /**
   * Quit the application.
   */
  quit(): void;
}

let currentProvider: AppProvider | null = null;

/**
 * Register an app provider (called by platform host).
 */
export function setAppProvider(provider: AppProvider): void {
  currentProvider = provider;
}

/**
 * Get the current app provider.
 */
export function getAppProvider(): AppProvider | null {
  return currentProvider;
}

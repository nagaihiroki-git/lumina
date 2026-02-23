// Platform-independent application entry point

import { getAppProvider } from "./app-provider";
import type { AppOptions } from "./app-provider";

export type { AppOptions } from "./app-provider";

/**
 * Start the Lumina application.
 * Requires a platform host to be imported first (e.g., @lumina/core/hosts/gtk3).
 */
export function startApp(options: AppOptions): void {
  const provider = getAppProvider();
  if (!provider) {
    throw new Error(
      "No AppProvider registered. Import a platform host first (e.g., import '@lumina/core' which auto-registers GTK3)."
    );
  }
  provider.start(options);
}

/**
 * Get the native application instance.
 * Returns platform-specific app object.
 */
export function getApp(): unknown | null {
  return getAppProvider()?.getApp() ?? null;
}

/**
 * Apply CSS styles globally.
 * @param css - CSS string to apply
 * @param reset - If true, replace all CSS; if false, append
 */
export function applyCss(css: string, reset: boolean = false): void {
  const provider = getAppProvider();
  if (!provider) {
    console.warn("applyCss called before AppProvider registered. CSS will be queued.");
    return;
  }
  provider.applyCss(css, reset);
}

/**
 * Quit the application.
 */
export function quit(): void {
  getAppProvider()?.quit();
}

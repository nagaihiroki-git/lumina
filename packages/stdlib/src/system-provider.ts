// Platform-independent system primitives abstraction

/**
 * Command execution result.
 */
export interface ExecResult {
  stdout: string;
  stderr: string;
  success: boolean;
}

/**
 * System provider interface.
 * Provides platform-independent access to OS features.
 */
export interface SystemProvider {
  /**
   * Execute a command synchronously.
   */
  exec(cmd: string | string[]): string;

  /**
   * Execute a command asynchronously.
   */
  execAsync(cmd: string | string[]): Promise<string>;

  /**
   * Read a file's contents.
   */
  readFile(path: string): string | null;

  /**
   * Read a file's contents asynchronously.
   */
  readFileAsync(path: string): Promise<string | null>;

  /**
   * Check if a file exists.
   */
  fileExists(path: string): boolean;

  /**
   * Set up a repeating timer.
   * Returns a cleanup function.
   */
  setInterval(callback: () => void, intervalMs: number): () => void;

  /**
   * Set up a one-shot timer.
   * Returns a cleanup function.
   */
  setTimeout(callback: () => void, delayMs: number): () => void;

  /**
   * Get an environment variable.
   */
  getEnv(name: string): string | null;

  /**
   * Get the user's home directory path.
   */
  getHomeDir(): string;

  /**
   * Write content to a file.
   */
  writeFile(path: string, content: string): boolean;

  /**
   * Create a directory (including parent directories).
   */
  mkdir(path: string): boolean;

  /**
   * Watch a file for changes.
   * Returns a cleanup function.
   */
  watchFile(path: string, callback: () => void): () => void;
}

/**
 * D-Bus provider interface (Linux-specific extension).
 */
export interface DbusProvider {
  /**
   * Create a D-Bus proxy for a service.
   */
  createProxy(
    busType: "system" | "session",
    busName: string,
    objectPath: string,
    interfaceName: string
  ): DbusProxy | null;
}

export interface DbusProxy {
  call(method: string, args?: any): any;
  callAsync(method: string, args?: any): Promise<any>;
  onSignal(callback: (signal: string, args: any) => void): () => void;
}

let currentProvider: SystemProvider | null = null;
let currentDbusProvider: DbusProvider | null = null;

/**
 * Register the system provider.
 */
export function setSystemProvider(provider: SystemProvider): void {
  currentProvider = provider;
}

/**
 * Get the current system provider.
 */
export function getSystemProvider(): SystemProvider | null {
  return currentProvider;
}

/**
 * Register the D-Bus provider (Linux only).
 */
export function setDbusProvider(provider: DbusProvider): void {
  currentDbusProvider = provider;
}

/**
 * Get the current D-Bus provider.
 */
export function getDbusProvider(): DbusProvider | null {
  return currentDbusProvider;
}

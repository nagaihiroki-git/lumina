import { getSystemProvider } from "../system-provider";

/**
 * Execute a command asynchronously.
 */
export function execAsync(cmd: string | string[]): Promise<string> {
  const provider = getSystemProvider();
  if (!provider) {
    return Promise.reject(new Error("No SystemProvider registered"));
  }
  return provider.execAsync(cmd);
}

/**
 * Execute a command synchronously.
 */
export function exec(cmd: string | string[]): string {
  const provider = getSystemProvider();
  if (!provider) {
    console.error("[exec] No SystemProvider registered");
    return "";
  }
  return provider.exec(cmd);
}

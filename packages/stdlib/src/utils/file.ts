import { getSystemProvider } from "../system-provider";

export function readFile(path: string): string | null {
  return getSystemProvider()?.readFile(path) ?? null;
}

export function writeFile(path: string, content: string): boolean {
  return getSystemProvider()?.writeFile(path, content) ?? false;
}

export function monitorFile(
  path: string,
  callback: () => void
): { cancel: () => void } | null {
  const cancel = getSystemProvider()?.watchFile(path, callback);
  return cancel ? { cancel } : null;
}

export function fileExists(path: string): boolean {
  return getSystemProvider()?.fileExists(path) ?? false;
}

export function mkdir(path: string): boolean {
  return getSystemProvider()?.mkdir(path) ?? false;
}

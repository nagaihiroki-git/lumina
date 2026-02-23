// Platform-independent monitor abstractions

/**
 * Public monitor information interface.
 * Contains no platform-specific types.
 */
export interface MonitorInfo {
  index: number;
  name: string;
  model: string;
  manufacturer: string;
  x: number;
  y: number;
  width: number;
  height: number;
  refreshRate: number;
  scaleFactor: number;
  primary: boolean;
}

/**
 * Internal monitor info with native handle.
 * Used by platform hosts to access underlying monitor object.
 */
export interface NativeMonitorInfo extends MonitorInfo {
  _native: unknown;
}

/**
 * Monitor provider interface.
 * Implemented by platform hosts to provide monitor information.
 */
export interface MonitorProvider {
  getMonitors(): MonitorInfo[];
  onMonitorChange(callback: () => void): () => void;
}

let currentProvider: MonitorProvider | null = null;

/**
 * Register a monitor provider (called by platform host).
 */
export function setMonitorProvider(provider: MonitorProvider): void {
  currentProvider = provider;
}

/**
 * Get the current monitor provider.
 */
export function getMonitorProvider(): MonitorProvider | null {
  return currentProvider;
}

/**
 * Get native monitor handle from MonitorInfo.
 * Returns the platform-specific monitor object, or undefined if not available.
 * Internal use only - not part of public API.
 */
export function getNativeMonitor(info: MonitorInfo): unknown | undefined {
  return hasNativeMonitor(info) ? info._native : undefined;
}

/**
 * Check if MonitorInfo has a native handle.
 */
export function hasNativeMonitor(info: MonitorInfo): info is NativeMonitorInfo {
  return "_native" in info && (info as NativeMonitorInfo)._native !== undefined;
}

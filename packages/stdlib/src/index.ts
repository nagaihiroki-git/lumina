// Factory for creating system hooks
export { createSystemHook } from "./factory";
export type { SignalConfig, SystemHookConfig, SystemHook } from "./factory";

// System Provider abstraction
export type { SystemProvider, DbusProvider, DbusProxy } from "./system-provider";
export { setSystemProvider, getSystemProvider, setDbusProvider, getDbusProvider } from "./system-provider";

// Platform-specific providers (auto-registers on import)
export { linuxSystemProvider, linuxDbusProvider } from "./providers/linux";

// System services
export { useHyprland } from "./useHyprland";
export { useBattery } from "./useBattery";
export { useAudio } from "./useAudio";
export { useNetwork } from "./useNetwork";
export { useTray } from "./useTray";
export { useMemory, useCpu } from "./useSystem";
export { useMonitors, usePrimaryMonitor, useMonitorCount, useMonitorByName, useMonitorByIndex, type MonitorInfo } from "./useMonitors";

// Utilities
export { useClock } from "./useClock";
export { useGObject, useGObjectProps } from "./useGObject";

// Auth & Settings
export { useAuth } from "./useAuth";
export { useSettings, defineSettings } from "./useSettings";
export { useDbus, useDbusProperty } from "./useDbus";

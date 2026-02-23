// Host Configuration
export { setHostConfig, getHostConfig } from "./host-config";
export type { HostConfig } from "./host-config";

// Platform Hosts
export { gtk3HostConfig, gtk3MonitorProvider, getGdkMonitor, gtk3AppProvider } from "./hosts/gtk3";

// App Provider (platform-independent)
export type { AppProvider } from "./app-provider";
export { setAppProvider, getAppProvider } from "./app-provider";

// CSS Engine (platform-independent)
export type { CssEngine, VariableSyntax } from "./css-engine";
export { setCssEngine, getCssEngine, createGtk3CssEngine, createCssPropertiesEngine } from "./css-engine";

// Renderer
export { render, createRoot, renderChild } from "./reconciler";
export type { Fiber } from "./reconciler";

// App
export { startApp, getApp, applyCss, quit } from "./app";

// JSX
export { createElement, Fragment, jsx, jsxs } from "./jsx";

// Types
export type { LuminaElement, LuminaNode, MaybeSignal, FC, Align, ScrollPolicy, StackTransition, RevealerTransition } from "./types";
import "./types"; // Side-effect: register JSX types

// Monitor (platform-independent)
export type { MonitorInfo, MonitorProvider } from "./monitor";
export { getMonitorProvider, setMonitorProvider, getNativeMonitor, hasNativeMonitor } from "./monitor";

// Components
export {
  Monitor, Monitors, Portal,
  Transition, AnimatePresence,
  ErrorBoundary, ErrorFallback,
  Show, For, Switch, Match,
  Window, BarWindow,
} from "./components";
export type { Anchor, Exclusivity, Layer, WindowRole } from "./components";

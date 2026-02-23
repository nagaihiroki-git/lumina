import { createElement, Fragment } from "./jsx";
import { createSignal, createEffect, onCleanup, createMemo } from "@lumina/bridge";
import { getApp } from "./app";
import { renderChild } from "./reconciler";
import type { LuminaNode } from "./types";
import type { MonitorInfo } from "./monitor";
import { getMonitorProvider, getNativeMonitor } from "./monitor";

export type { MonitorInfo } from "./monitor";

function useReactiveMonitors() {
  const provider = getMonitorProvider();
  if (!provider) return { monitors: () => [] as MonitorInfo[], cleanup: () => {} };

  const [monitors, setMonitors] = createSignal<MonitorInfo[]>(provider.getMonitors());

  const refresh = () => {
    const p = getMonitorProvider();
    if (p) setMonitors(p.getMonitors());
  };
  const cleanup = provider.onMonitorChange(refresh);

  return { monitors, cleanup };
}

interface MonitorProps {
  id?: number;
  name?: string;
  primary?: boolean;
  children: (monitor: MonitorInfo) => LuminaNode;
}

export function Monitor({ id, name, primary, children }: MonitorProps): LuminaNode {
  const { monitors, cleanup } = useReactiveMonitors();

  createEffect(() => {
    onCleanup(cleanup);
  });

  const target = createMemo(() => {
    const mons = monitors();
    if (id !== undefined) return mons[id] ?? null;
    if (name !== undefined) return mons.find((m) => m.name === name) ?? null;
    if (primary) return mons.find((m) => m.primary) ?? mons[0] ?? null;
    return mons[0] ?? null;
  });

  return createElement(Show, {
    when: target,
    children: (mon: MonitorInfo) => children(mon),
  });
}

interface MonitorsProps {
  children: (monitor: MonitorInfo, index: number) => LuminaNode;
}

export function Monitors({ children }: MonitorsProps): LuminaNode {
  const { monitors, cleanup } = useReactiveMonitors();

  createEffect(() => {
    onCleanup(cleanup);
  });

  return createElement(For, {
    each: monitors,
    children: (mon: MonitorInfo, i: number) => children(mon, i),
  });
}

interface PortalProps {
  children: LuminaNode;
  container?: any;
}

export function Portal({ children }: PortalProps): LuminaNode {
  // Portal rendering not yet implemented - returns children directly for now
  return children;
}

type TransitionType = "crossfade" | "slide-up" | "slide-down" | "slide-left" | "slide-right" | "none";

interface TransitionProps {
  show: boolean | (() => boolean);
  type?: TransitionType;
  duration?: number;
  onExited?: () => void;
  children: LuminaNode;
}

export function Transition({ show, type = "crossfade", duration = 200, onExited, children }: TransitionProps): LuminaNode {
  const getShow = typeof show === "function" ? show : () => show;
  const [rendered, setRendered] = createSignal(getShow());

  createEffect(() => {
    const isShowing = getShow();
    if (isShowing) {
      setRendered(true);
    } else if (!isShowing && rendered()) {
      const timer = setTimeout(() => {
        setRendered(false);
        onExited?.();
      }, duration);
      onCleanup(() => clearTimeout(timer));
    }
  });

  return createElement("revealer", {
    revealChild: getShow,
    transitionType: type,
    transitionDuration: duration,
    visible: rendered,
  }, children);
}

interface AnimatePresenceProps {
  children: LuminaNode | (() => LuminaNode);
  type?: TransitionType;
  duration?: number;
  onExitComplete?: () => void;
}

export function AnimatePresence({ children, type = "crossfade", duration = 200, onExitComplete }: AnimatePresenceProps): LuminaNode {
  const getChildren = typeof children === "function" ? children : () => children;

  const hasChildren = () => {
    const c = getChildren();
    return c !== null && c !== undefined && c !== false;
  };

  const [lastChildren, setLastChildren] = createSignal<LuminaNode>(
    hasChildren() ? getChildren() : createElement("box", {})
  );

  createEffect(() => {
    if (hasChildren()) {
      setLastChildren(getChildren());
    }
  });

  return createElement(Transition, {
    show: hasChildren,
    type,
    duration,
    onExited: onExitComplete,
  }, lastChildren());
}

interface ErrorBoundaryProps {
  fallback: LuminaNode | ((error: Error) => LuminaNode);
  onError?: (error: Error) => void;
  children: LuminaNode;
}

const errorHandlerStack: ((error: Error) => void)[] = [];

export function setErrorHandler(handler: ((error: Error) => void) | null): void {
  if (handler) {
    errorHandlerStack.push(handler);
  }
}

export function getErrorHandler(): ((error: Error) => void) | null {
  return errorHandlerStack.length > 0 ? errorHandlerStack[errorHandlerStack.length - 1] : null;
}

export function ErrorBoundary({ fallback, onError, children }: ErrorBoundaryProps): LuminaNode {
  const [error, setError] = createSignal<Error | null>(null);

  const handler = (err: Error) => {
    setError(err);
    onError?.(err);
    console.error("[ErrorBoundary] Caught error:", err);
  };

  errorHandlerStack.push(handler);

  onCleanup(() => {
    const index = errorHandlerStack.indexOf(handler);
    if (index !== -1) {
      errorHandlerStack.splice(index, 1);
    }
  });

  return createElement(Show, {
    when: () => error() !== null,
    fallback: children,
    children: () => {
      const err = error();
      if (!err) return children;
      return typeof fallback === "function" ? fallback(err) : fallback;
    },
  });
}

interface ErrorFallbackProps {
  error: Error;
  reset?: () => void;
}

export function ErrorFallback({ error, reset }: ErrorFallbackProps): LuminaNode {
  return createElement("box", {
    className: "error-fallback",
    css: "background: #f38ba8; padding: 8px; border-radius: 4px;",
  },
    createElement("label", {
      label: `Error: ${error.message}`,
      css: "color: #1e1e2e;",
    }),
    reset && createElement("button", {
      label: "Retry",
      onClicked: reset,
      css: "margin-left: 8px;",
    })
  );
}

interface ShowProps<T> {
  when: T | (() => T) | undefined | null | false;
  fallback?: LuminaNode;
  children: LuminaNode | ((item: T) => LuminaNode);
}

export function Show<T>({ when, fallback, children }: ShowProps<T>): LuminaNode {
  const getWhen = typeof when === "function" ? (when as () => T) : () => when;

  const initialValue = getWhen();
  const renderedChildren =
    typeof children === "function"
      ? (children as (item: T) => LuminaNode)(initialValue as T)
      : children;

  return createElement(
    Fragment,
    {},
    createElement("box", { visible: () => !!getWhen() }, renderedChildren),
    fallback
      ? createElement("box", { visible: () => !getWhen() }, fallback)
      : null
  );
}

interface ForProps<T> {
  each: T[] | (() => T[]);
  fallback?: LuminaNode;
  children: (item: T, index: number) => LuminaNode;
}

export function For<T>({ each, fallback, children }: ForProps<T>): LuminaNode {
  const getItems = typeof each === "function" ? each : () => each;

  return createElement("box", {
    ref: (container: any) => {
      if (!container) return;

      let cleanups: (() => void)[] = [];
      let fallbackCleanup: (() => void) | null = null;

      const disposeEffect = createEffect(() => {
        const items = getItems();

        for (const cleanup of cleanups) {
          cleanup();
        }
        cleanups = [];

        if (fallbackCleanup) {
          fallbackCleanup();
          fallbackCleanup = null;
        }

        if (!items || items.length === 0) {
          if (fallback) {
            fallbackCleanup = renderChild(fallback, container);
          }
          return;
        }

        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const node = children(item, i);

          let element = node;
          if (
            element &&
            typeof element === "object" &&
            "props" in element &&
            !(element as any).props?.key
          ) {
            element = createElement(
              (element as any).type,
              { ...(element as any).props, key: i },
              ...((element as any).children || [])
            );
          }

          const cleanup = renderChild(element, container);
          cleanups.push(cleanup);
        }
      });

      // Cleanup when container is destroyed
      onCleanup(() => {
        disposeEffect();
        for (const cleanup of cleanups) {
          cleanup();
        }
        cleanups = [];
        if (fallbackCleanup) {
          fallbackCleanup();
          fallbackCleanup = null;
        }
      });
    },
  });
}

interface MatchProps<T> {
  when: T | (() => T) | boolean | (() => boolean);
  children: LuminaNode;
}

interface SwitchProps {
  fallback?: LuminaNode;
  children: LuminaNode[];
}

export function Switch({ fallback, children }: SwitchProps): LuminaNode {
  const cases = children.filter(
    (child): child is LuminaNode & { props: MatchProps<any> } =>
      child !== null && typeof child === "object" && "props" in child
  );

  const getActiveIndex = () => {
    for (let i = 0; i < cases.length; i++) {
      const { when } = cases[i].props;
      const value = typeof when === "function" ? when() : when;
      if (value) return i;
    }
    return -1;
  };

  return createElement(
    Fragment,
    {},
    ...cases.map((child, index) =>
      createElement(
        "box",
        { visible: () => getActiveIndex() === index, key: index },
        child.props.children
      )
    ),
    fallback
      ? createElement("box", { visible: () => getActiveIndex() === -1 }, fallback)
      : null
  );
}

export function Match<T>({ when, children }: MatchProps<T>): LuminaNode {
  return createElement("box", { when, children });
}

export type Anchor = "top" | "bottom" | "left" | "right" | "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center";
export type Exclusivity = "normal" | "exclusive" | "ignore";
export type Layer = "background" | "bottom" | "top" | "overlay";
export type WindowRole = "panel" | "dock" | "notification" | "popup" | "dialog" | "desktop";

interface RoleDefaults {
  anchor: Anchor[];
  exclusivity: Exclusivity;
  layer: Layer;
}

const ROLE_DEFAULTS: Record<WindowRole, RoleDefaults> = {
  panel: { anchor: ["top", "left", "right"], exclusivity: "exclusive", layer: "top" },
  dock: { anchor: ["bottom", "left", "right"], exclusivity: "exclusive", layer: "top" },
  notification: { anchor: ["top-right"], exclusivity: "normal", layer: "overlay" },
  popup: { anchor: ["center"], exclusivity: "normal", layer: "top" },
  dialog: { anchor: ["center"], exclusivity: "normal", layer: "overlay" },
  desktop: { anchor: ["top", "bottom", "left", "right"], exclusivity: "ignore", layer: "background" },
};

interface WindowProps {
  name: string;
  monitor?: MonitorInfo | number | string;
  role?: WindowRole;
  anchor?: Anchor | Anchor[];
  exclusivity?: Exclusivity;
  layer?: Layer;
  margins?: [number, number, number, number] | number;
  visible?: boolean;
  className?: string;
  css?: string;
  children: LuminaNode;
}

export function Window(props: WindowProps): LuminaNode {
  const {
    name,
    monitor,
    role,
    margins = 0,
    visible = true,
    className,
    css,
    children,
  } = props;

  const roleDefaults = role ? ROLE_DEFAULTS[role] : undefined;
  const anchor = props.anchor ?? roleDefaults?.anchor ?? "center";
  const exclusivity = props.exclusivity ?? roleDefaults?.exclusivity ?? "normal";
  const layer = props.layer ?? roleDefaults?.layer ?? "top";

  let nativeMonitor: unknown | undefined;

  if (monitor !== undefined) {
    const provider = getMonitorProvider();
    if (provider) {
      if (typeof monitor === "number") {
        const monitors = provider.getMonitors();
        const mon = monitors[monitor];
        if (mon) nativeMonitor = getNativeMonitor(mon);
      } else if (typeof monitor === "string") {
        const monitors = provider.getMonitors();
        const mon = monitors.find((m) => m.name === monitor);
        if (mon) nativeMonitor = getNativeMonitor(mon);
      } else {
        nativeMonitor = getNativeMonitor(monitor);
      }
    }
  }

  const anchors = Array.isArray(anchor) ? anchor : [anchor];
  const anchorFlags = anchors.reduce((acc, a) => {
    const flags: Record<Anchor, number> = {
      top: 2,
      right: 4,
      left: 8,
      bottom: 16,
      "top-left": 2 | 8,
      "top-right": 2 | 4,
      "bottom-left": 16 | 8,
      "bottom-right": 16 | 4,
      center: 1,
    };
    return acc | (flags[a] ?? 0);
  }, 0);

  const [marginTop, marginRight, marginBottom, marginLeft] =
    typeof margins === "number"
      ? [margins, margins, margins, margins]
      : margins;

  const windowProps: Record<string, any> = {
    name,
    anchor: anchorFlags,
    exclusivity: exclusivity === "exclusive" ? 1 : exclusivity === "ignore" ? -1 : 0,
    layer: { background: 0, bottom: 1, top: 2, overlay: 3 }[layer] ?? 2,
    marginTop,
    marginRight,
    marginBottom,
    marginLeft,
    visible,
    application: getApp(),
  };

  if (nativeMonitor) {
    windowProps.gdkmonitor = nativeMonitor;
  }

  if (className) {
    windowProps.className = className;
  }

  if (css) {
    windowProps.css = css;
  }

  return createElement("window", windowProps, children);
}

interface BarWindowProps {
  name?: string;
  monitor?: MonitorInfo | number | string;
  position?: "top" | "bottom";
  height?: number;
  className?: string;
  css?: string;
  children: LuminaNode;
}

export function BarWindow(props: BarWindowProps): LuminaNode {
  const {
    name = "bar",
    monitor,
    position = "top",
    height,
    className,
    css,
    children,
  } = props;

  const monitorId = typeof monitor === "object" ? monitor.index : monitor;
  const windowName = `${name}-${monitorId ?? "primary"}`;

  return createElement(Window, {
    name: windowName,
    monitor,
    anchor: position === "top" ? ["top", "left", "right"] : ["bottom", "left", "right"],
    exclusivity: "exclusive",
    layer: "top",
    className,
    css: css ?? (height ? `min-height: ${height}px;` : undefined),
  }, children);
}

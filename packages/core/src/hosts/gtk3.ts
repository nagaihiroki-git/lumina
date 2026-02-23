import Gtk from "gi://Gtk?version=3.0";
import Gdk from "gi://Gdk?version=3.0";
import GObject from "gi://GObject";
import GtkLayerShell from "gi://GtkLayerShell?version=0.1";
import type { HostConfig } from "../host-config";
import { setHostConfig } from "../host-config";
import { createEffect } from "@lumina/bridge";
import type { Align, ScrollPolicy, StackTransition, RevealerTransition } from "../types";
import type { MonitorInfo, NativeMonitorInfo, MonitorProvider } from "../monitor";
import { setMonitorProvider } from "../monitor";

const ALIGN_MAP: Record<Align, number> = {
  fill: 0,
  start: 1,
  end: 2,
  center: 3,
};

const SCROLL_POLICY_MAP: Record<ScrollPolicy, number> = {
  always: 0,
  auto: 1,
  never: 2,
};

const STACK_TRANSITION_MAP: Record<StackTransition, number> = {
  none: 0,
  crossfade: 1,
  "slide-right": 2,
  "slide-left": 3,
  "slide-up": 4,
  "slide-down": 5,
};

const REVEALER_TRANSITION_MAP: Record<RevealerTransition, number> = {
  none: 0,
  crossfade: 1,
  "slide-right": 2,
  "slide-left": 3,
  "slide-up": 4,
  "slide-down": 5,
};

// GTK3 doesn't have native CenterBox, so we implement it with Gtk.Box
const LuminaCenterBox = GObject.registerClass(
  {
    GTypeName: "LuminaCenterBox",
  },
  class LuminaCenterBox extends Gtk.Box {
    private _start: Gtk.Widget | null = null;
    private _center: Gtk.Widget | null = null;
    private _end: Gtk.Widget | null = null;
    private _listeners: Map<string, number> = new Map();

    constructor(props?: any) {
      super({ ...props, homogeneous: false });
      this.set_orientation(Gtk.Orientation.HORIZONTAL);
    }

    get listeners(): Map<string, number> {
      return this._listeners;
    }

    set startWidget(widget: Gtk.Widget | null) {
      if (this._start) this.remove(this._start);
      this._start = widget;
      if (widget) {
        this.pack_start(widget, true, true, 0);
        this.reorder_child(widget, 0);
      }
    }

    set centerWidget(widget: Gtk.Widget | null) {
      if (this._center) this.remove(this._center);
      this._center = widget;
      if (widget) {
        this.set_center_widget(widget);
      }
    }

    set endWidget(widget: Gtk.Widget | null) {
      if (this._end) this.remove(this._end);
      this._end = widget;
      if (widget) {
        this.pack_end(widget, true, true, 0);
      }
    }

    get_children_count(): number {
      return (this._start ? 1 : 0) + (this._center ? 1 : 0) + (this._end ? 1 : 0);
    }
  }
);

const LuminaWindow = GObject.registerClass(
  {
    GTypeName: "LuminaWindow",
  },
  class LuminaWindow extends Gtk.Window {
    private _listeners: Map<string, number> = new Map();

    constructor(props?: any) {
      const {
        anchor,
        exclusivity,
        layer,
        marginTop,
        marginBottom,
        marginLeft,
        marginRight,
        gdkmonitor,
        application,
        visible,
        ...rest
      } = props || {};

      super({ ...rest, visible: false });

      GtkLayerShell.init_for_window(this);

      if (layer !== undefined) {
        GtkLayerShell.set_layer(this, layer);
      }

      if (anchor !== undefined) {
        GtkLayerShell.set_anchor(this, GtkLayerShell.Edge.TOP, !!(anchor & 2));
        GtkLayerShell.set_anchor(this, GtkLayerShell.Edge.RIGHT, !!(anchor & 4));
        GtkLayerShell.set_anchor(this, GtkLayerShell.Edge.LEFT, !!(anchor & 8));
        GtkLayerShell.set_anchor(this, GtkLayerShell.Edge.BOTTOM, !!(anchor & 16));
      }

      if (marginTop !== undefined) {
        GtkLayerShell.set_margin(this, GtkLayerShell.Edge.TOP, marginTop);
      }
      if (marginBottom !== undefined) {
        GtkLayerShell.set_margin(this, GtkLayerShell.Edge.BOTTOM, marginBottom);
      }
      if (marginLeft !== undefined) {
        GtkLayerShell.set_margin(this, GtkLayerShell.Edge.LEFT, marginLeft);
      }
      if (marginRight !== undefined) {
        GtkLayerShell.set_margin(this, GtkLayerShell.Edge.RIGHT, marginRight);
      }

      if (exclusivity === 1) {
        GtkLayerShell.auto_exclusive_zone_enable(this);
      } else if (typeof exclusivity === "number") {
        GtkLayerShell.set_exclusive_zone(this, exclusivity);
      }

      if (gdkmonitor) {
        GtkLayerShell.set_monitor(this, gdkmonitor);
      }

      if (application) {
        this.set_application(application);
      }
    }

    get listeners(): Map<string, number> {
      return this._listeners;
    }
  }
);

interface GtkWidgetExtensions {
  listeners?: Map<string, number>;
  _reactiveCleanups?: Map<string, () => void>;
  // Common GTK methods that may or may not exist on specific widgets
  set_label?(text: string): void;
  set_text?(text: string): void;
  get_style_context?(): Gtk.StyleContext;
  add?(child: Gtk.Widget): void;
  remove?(child: Gtk.Widget): void;
  set_child?(child: Gtk.Widget): void;
  reorder_child?(child: Gtk.Widget, position: number): void;
  show_all?(): void;
  destroy?(): void;
  run_dispose?(): void;
}

type GtkWidget = Gtk.Widget & GtkWidgetExtensions;

const WIDGET_MAP: Record<string, new (props?: any) => any> = {
  box: Gtk.Box,
  centerbox: LuminaCenterBox,
  label: Gtk.Label,
  button: Gtk.Button,
  icon: Gtk.Image,
  entry: Gtk.Entry,
  slider: Gtk.Scale,
  switch: Gtk.Switch,
  revealer: Gtk.Revealer,
  stack: Gtk.Stack,
  scrollable: Gtk.ScrolledWindow,
  menubutton: Gtk.MenuButton,
  window: LuminaWindow,
  image: Gtk.Image,
  overlay: Gtk.Overlay,
  eventbox: Gtk.EventBox,
  separator: Gtk.Separator,
  progressbar: Gtk.ProgressBar,
  levelbar: Gtk.LevelBar,
};

const SPECIAL_PROPS = new Set([
  "key",
  "ref",
  "children",
  "className",
  "css",
  "vertical",
  "onClicked",
  "onChanged",
  "onActivate",
  "onDragged",
  "onKeyPressEvent",
  "onDestroy",
  "onScroll",
  "onEnter",
  "onLeave",
  "anchor",
  "exclusivity",
  "layer",
  "marginTop",
  "marginBottom",
  "marginLeft",
  "marginRight",
  "gdkmonitor",
  "application",
]);

const SIGNAL_MAP: Record<string, string> = {
  onClicked: "clicked",
  onChanged: "changed",
  onActivate: "activate",
  onDragged: "value-changed",
  onKeyPressEvent: "key-press-event",
  onDestroy: "destroy",
  onScroll: "scroll-event",
  onEnter: "enter-notify-event",
  onLeave: "leave-notify-event",
};

const cssProvider = new Gtk.CssProvider();
let cssInitialized = false;
const inlineCssCache = new Map<string, { className: string; css: string }>();
const MAX_INLINE_CSS_CACHE = 200;
let classCounter = 0;

function hashCss(css: string): string {
  let h = 0;
  for (let i = 0; i < css.length; i++) {
    h = ((h << 5) - h + css.charCodeAt(i)) | 0;
  }
  return h.toString(36);
}

function rebuildCssContent(): string {
  let content = "";
  for (const { className, css } of inlineCssCache.values()) {
    content += `.${className} { ${css} }\n`;
  }
  return content;
}

function injectInlineCss(widgetName: string, css: string): string {
  const cacheKey = `${widgetName}:${hashCss(css)}`;
  const cached = inlineCssCache.get(cacheKey);
  if (cached) return cached.className;

  // Evict oldest entry if cache is full and rebuild CSS
  if (inlineCssCache.size >= MAX_INLINE_CSS_CACHE) {
    const firstKey = inlineCssCache.keys().next().value;
    if (firstKey) inlineCssCache.delete(firstKey);
  }

  const className = `inline-${widgetName}-${classCounter++}`;
  inlineCssCache.set(cacheKey, { className, css });

  const cssContent = rebuildCssContent();
  try {
    cssProvider.load_from_data(cssContent);
  } catch (e) {
    console.warn("Failed to load CSS:", e);
  }
  return className;
}

function ensureCssInitialized(): void {
  if (cssInitialized) return;
  const screen = Gdk.Screen.get_default();
  if (screen) {
    Gtk.StyleContext.add_provider_for_screen(
      screen,
      cssProvider,
      Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION
    );
    cssInitialized = true;
  }
}

function getListeners(widget: GtkWidget): Map<string, number> {
  if (!widget.listeners) {
    widget.listeners = new Map<string, number>();
  }
  return widget.listeners;
}

function getReactiveCleanups(widget: GtkWidget): Map<string, () => void> {
  if (!widget._reactiveCleanups) {
    widget._reactiveCleanups = new Map();
  }
  return widget._reactiveCleanups;
}

function setWidgetProp(widget: GtkWidget, key: string, value: unknown): void {
  try {
    if (key === "label") {
      if (widget.set_label) {
        widget.set_label(String(value));
      } else if (widget.set_text) {
        widget.set_text(String(value));
      }
    } else {
      (widget as Record<string, unknown>)[key] = value;
    }
  } catch (e) {
    console.warn(`Failed to set ${key} on widget:`, e);
  }
}

function bindReactiveProp(
  widget: GtkWidget,
  widgetType: string,
  key: string,
  getter: () => any
): void {
  const cleanups = getReactiveCleanups(widget);
  cleanups.get(key)?.();

  const stop = createEffect(() => {
    const rawValue = getter();
    const value = mapPropValue(widgetType, key, rawValue);
    setWidgetProp(widget, key, value);
  });

  cleanups.set(key, stop);
}

function applyClassName(widget: GtkWidget, className: string): void {
  const ctx = widget.get_style_context?.();
  if (!ctx || !className) return;

  for (const cls of className.split(" ")) {
    if (cls) ctx.add_class(cls);
  }
}

function bindReactiveClassName(widget: GtkWidget, getter: () => string): void {
  const cleanups = getReactiveCleanups(widget);
  cleanups.get("className")?.();

  const ctx = widget.get_style_context?.();
  if (!ctx) return;

  let lastClasses: string[] = [];
  const stop = createEffect(() => {
    const newClassName = getter() || "";
    const newClasses = newClassName.split(" ").filter(Boolean);

    for (const cls of lastClasses) {
      ctx.remove_class(cls);
    }
    for (const cls of newClasses) {
      ctx.add_class(cls);
    }
    lastClasses = newClasses;
  });

  cleanups.set("className", stop);
}

function applyProps(widget: GtkWidget, widgetType: string, props: Record<string, any>): void {
  ensureCssInitialized();
  const listeners = getListeners(widget);

  for (const key of Object.keys(props)) {
    if (SPECIAL_PROPS.has(key) || key.startsWith("on")) continue;

    const value = props[key];
    if (typeof value === "function") {
      bindReactiveProp(widget, widgetType, key, value);
    } else {
      const mappedValue = mapPropValue(widgetType, key, value);
      setWidgetProp(widget, key, mappedValue);
    }
  }

  const className = props.className;
  if (className !== undefined) {
    if (typeof className === "function") {
      bindReactiveClassName(widget, className);
    } else {
      applyClassName(widget, className);
    }
  }

  if (props.css) {
    if (typeof props.css === "function") {
      const cleanups = getReactiveCleanups(widget);
      let lastCssClass = "";
      const stop = createEffect(() => {
        const cssValue = props.css();
        if (cssValue) {
          const ctx = widget.get_style_context?.();
          if (ctx) {
            if (lastCssClass) ctx.remove_class(lastCssClass);
            lastCssClass = injectInlineCss(widget.constructor.name, cssValue);
            ctx.add_class(lastCssClass);
          }
        }
      });
      cleanups.set("css", stop);
    } else {
      const cssClass = injectInlineCss(widget.constructor.name, props.css);
      const ctx = widget.get_style_context?.();
      if (ctx) ctx.add_class(cssClass);
    }
  }

  for (const [propKey, signalName] of Object.entries(SIGNAL_MAP)) {
    const handler = props[propKey];
    if (handler) {
      const id = widget.connect(signalName, handler);
      listeners.set(signalName, id);
    }
  }
}

function cleanupReactiveBindings(widget: GtkWidget): void {
  const cleanups = widget._reactiveCleanups;
  if (cleanups) {
    for (const cleanup of cleanups.values()) {
      cleanup();
    }
    cleanups.clear();
  }
}

function mapPropValue(type: string, key: string, value: any): any {
  if (typeof value !== "string") return value;

  if ((key === "halign" || key === "valign") && value in ALIGN_MAP) {
    return ALIGN_MAP[value as Align];
  }

  if ((key === "hscroll" || key === "vscroll") && value in SCROLL_POLICY_MAP) {
    return SCROLL_POLICY_MAP[value as ScrollPolicy];
  }

  if (type === "stack" && key === "transitionType" && value in STACK_TRANSITION_MAP) {
    return STACK_TRANSITION_MAP[value as StackTransition];
  }

  if (type === "revealer" && key === "transitionType" && value in REVEALER_TRANSITION_MAP) {
    return REVEALER_TRANSITION_MAP[value as RevealerTransition];
  }

  return value;
}

export const gtk3HostConfig: HostConfig<GtkWidget, GtkWidget> = {
  createInstance(type: string, props: Record<string, any>): GtkWidget {
    const WidgetClass = WIDGET_MAP[type];
    if (!WidgetClass) {
      throw new Error(`Unknown widget type: ${type}`);
    }

    const constructProps: Record<string, any> = {};

    const WINDOW_PROPS = new Set([
      "anchor",
      "exclusivity",
      "layer",
      "marginTop",
      "marginBottom",
      "marginLeft",
      "marginRight",
      "gdkmonitor",
      "application",
    ]);

    for (const [key, value] of Object.entries(props)) {
      if (type === "window" && WINDOW_PROPS.has(key)) {
        constructProps[key] = value;
      } else if (!SPECIAL_PROPS.has(key) && !key.startsWith("on")) {
        if (typeof value !== "function") {
          constructProps[key] = mapPropValue(type, key, value);
        }
      }
    }

    if (type === "box" && props.vertical !== undefined) {
      constructProps.orientation = props.vertical
        ? Gtk.Orientation.VERTICAL
        : Gtk.Orientation.HORIZONTAL;
    }

    if (type === "icon" && props.icon) {
      constructProps.icon_name = props.icon;
      constructProps.icon_size = props.pixelSize ?? Gtk.IconSize.BUTTON;
    }

    const widget = new WidgetClass(constructProps) as GtkWidget;
    applyProps(widget, type, props);

    if (typeof props.ref === "function") {
      props.ref(widget);
    }

    return widget;
  },

  createTextInstance(text: string): GtkWidget {
    return new Gtk.Label({ label: text }) as GtkWidget;
  },

  appendChild(parent: GtkWidget, child: GtkWidget): void {
    if (!parent || !child) return;

    if (parent instanceof LuminaCenterBox) {
      const count = parent.get_children_count();
      if (count === 0) {
        parent.startWidget = child;
      } else if (count === 1) {
        parent.centerWidget = child;
      } else {
        parent.endWidget = child;
      }
      return;
    }

    if (parent.add) {
      parent.add(child);
    } else if (parent.set_child) {
      parent.set_child(child);
    }
  },

  insertBefore(parent: GtkWidget, child: GtkWidget, index: number): void {
    if (!parent || !child) return;

    if (parent instanceof LuminaCenterBox) {
      if (index === 0) parent.startWidget = child;
      else if (index === 1) parent.centerWidget = child;
      else parent.endWidget = child;
      return;
    }

    if (parent.add) {
      parent.add(child);
      if (parent.reorder_child) {
        parent.reorder_child(child, index);
      }
    } else if (parent.set_child) {
      parent.set_child(child);
    }
  },

  removeChild(parent: GtkWidget, child: GtkWidget): void {
    if (!parent || !child) return;

    try {
      if (parent.remove) {
        parent.remove(child);
      }
    } catch {
      // Widget may already be removed
    }

    cleanupReactiveBindings(child);

    try {
      if (child.destroy) {
        child.destroy();
      }
    } catch {
      // Widget may already be destroyed
    }
  },

  connectSignal(instance: GtkWidget, signal: string, handler: Function): number {
    return instance.connect(signal, handler as any);
  },

  disconnectSignal(instance: GtkWidget, handlerId: number): void {
    try {
      instance.disconnect(handlerId);
    } catch {
      // Signal may already be disconnected or widget destroyed - safe to ignore
    }
  },

  showInstance(instance: GtkWidget): void {
    if (instance.show_all) {
      instance.show_all();
    }
  },

  destroyInstance(instance: GtkWidget): void {
    cleanupReactiveBindings(instance);
    if (instance.destroy) {
      instance.destroy();
    }
  },

  disposeInstance(instance: GtkWidget): void {
    try {
      if (instance.run_dispose) {
        instance.run_dispose();
      }
    } catch {
      // Widget may already be disposed - safe to ignore
    }
  },
};

function getGdk3MonitorInfo(display: Gdk.Display, index: number): NativeMonitorInfo | null {
  const mon = display.get_monitor(index);
  if (!mon) return null;

  const geometry = mon.get_geometry();
  const primary = display.get_primary_monitor() === mon;

  return {
    index,
    name: mon.get_model() ?? `Monitor-${index}`,
    model: mon.get_model() ?? "Unknown",
    manufacturer: mon.get_manufacturer() ?? "Unknown",
    x: geometry.x,
    y: geometry.y,
    width: geometry.width,
    height: geometry.height,
    refreshRate: mon.get_refresh_rate() / 1000,
    scaleFactor: mon.get_scale_factor(),
    primary,
    _native: mon,
  };
}

export const gtk3MonitorProvider: MonitorProvider = {
  getMonitors(): MonitorInfo[] {
    const display = Gdk.Display.get_default();
    if (!display) return [];

    const count = display.get_n_monitors();
    const monitors: MonitorInfo[] = [];

    for (let i = 0; i < count; i++) {
      const info = getGdk3MonitorInfo(display, i);
      if (info) monitors.push(info);
    }

    return monitors;
  },

  onMonitorChange(callback: () => void): () => void {
    const display = Gdk.Display.get_default();
    if (!display) return () => {};

    const addedId = display.connect("monitor-added", callback);
    const removedId = display.connect("monitor-removed", callback);

    return () => {
      display.disconnect(addedId);
      display.disconnect(removedId);
    };
  },
};

export function getGdkMonitor(info: MonitorInfo): Gdk.Monitor | null {
  const native = (info as NativeMonitorInfo)._native;
  return native instanceof Gdk.Monitor ? native : null;
}

setHostConfig(gtk3HostConfig);
setMonitorProvider(gtk3MonitorProvider);

export { gtk3AppProvider } from "./gtk3-app";

export { LuminaCenterBox, LuminaWindow };

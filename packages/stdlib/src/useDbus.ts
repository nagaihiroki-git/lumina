// Linux-only: requires D-Bus
import { createSignal, createEffect, onCleanup } from "@lumina/bridge";
import Gio from "gi://Gio";
import GLib from "gi://GLib";

interface DbusOptions {
  bus?: "session" | "system";
  name: string;
  path: string;
  interface: string;
}

interface DbusProxy {
  call: <T = any>(method: string, args?: GLib.Variant | null) => Promise<T>;
  get: <T = any>(property: string) => T;
  set: (property: string, value: GLib.Variant) => void;
  subscribe: (signal: string, callback: (...args: any[]) => void) => () => void;
}

export function useDbus(options: DbusOptions): DbusProxy | null {
  const { bus = "session", name, path, interface: iface } = options;

  const [proxy, setProxy] = createSignal<Gio.DBusProxy | null>(null);
  const subscriptions = new Map<number, string>();

  createEffect(() => {
    const busType = bus === "session" ? Gio.BusType.SESSION : Gio.BusType.SYSTEM;

    let createdProxy: Gio.DBusProxy | null = null;
    try {
      createdProxy = Gio.DBusProxy.new_for_bus_sync(
        busType,
        Gio.DBusProxyFlags.NONE,
        null,
        name,
        path,
        iface,
        null
      );
      setProxy(createdProxy);
    } catch (e) {
      console.error(`Failed to create DBus proxy for ${name}:`, e);
    }

    // Capture proxy reference for cleanup to avoid stale closure
    const proxyToCleanup = createdProxy;
    onCleanup(() => {
      if (proxyToCleanup) {
        for (const [id] of subscriptions) {
          try {
            proxyToCleanup.disconnect(id);
          } catch {
            // Signal may already be disconnected
          }
        }
        subscriptions.clear();
      }
    });
  });

  // Lazy proxy - defers access to avoid synchronous null race
  return {
    call: async <T = any>(method: string, args: GLib.Variant | null = null): Promise<T> => {
      const p = proxy();
      if (!p) {
        throw new Error(`DBus proxy for ${name} not ready`);
      }
      return new Promise((resolve, reject) => {
        p.call(
          method,
          args,
          Gio.DBusCallFlags.NONE,
          -1,
          null,
          (proxyObj, result) => {
            try {
              const res = proxyObj!.call_finish(result);
              resolve(res?.deep_unpack() as T);
            } catch (e) {
              reject(e);
            }
          }
        );
      });
    },

    get: <T = any>(property: string): T => {
      const p = proxy();
      if (!p) return undefined as T;
      const variant = p.get_cached_property(property);
      return variant?.deep_unpack() as T;
    },

    set: (property: string, value: GLib.Variant): void => {
      const p = proxy();
      if (!p) return;
      p.set_cached_property(property, value);
    },

    subscribe: (signal: string, callback: (...args: any[]) => void): (() => void) => {
      const p = proxy();
      if (!p) return () => {};

      const id = p.connect(`g-signal::${signal}`, (_, __, ___, params: GLib.Variant) => {
        const unpacked = params.deep_unpack() as any[];
        callback(...(Array.isArray(unpacked) ? unpacked : [unpacked]));
      });
      subscriptions.set(id, signal);

      return () => {
        const currentProxy = proxy();
        if (currentProxy) {
          currentProxy.disconnect(id);
        }
        subscriptions.delete(id);
      };
    },
  };
}

export function useDbusProperty<T>(
  options: DbusOptions,
  property: string,
  defaultValue: T
): () => T {
  const [value, setValue] = createSignal<T>(defaultValue);
  const proxy = useDbus(options);

  createEffect(() => {
    if (!proxy) return;

    try {
      const initial = proxy.get<T>(property);
      if (initial !== undefined) setValue(() => initial);
    } catch {
      // Property may not exist yet - will be set via PropertiesChanged signal
    }

    const unsub = proxy.subscribe("PropertiesChanged", (_iface: string, changed: Record<string, any>) => {
      if (property in changed) {
        setValue(() => changed[property]);
      }
    });

    onCleanup(unsub);
  });

  return value;
}

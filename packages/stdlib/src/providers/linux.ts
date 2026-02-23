// Linux system provider using GLib/Gio

import Gio from "gi://Gio";
import GLib from "gi://GLib";
import type { SystemProvider, DbusProvider, DbusProxy } from "../system-provider";
import { setSystemProvider, setDbusProvider } from "../system-provider";

export const linuxSystemProvider: SystemProvider = {
  exec(cmd: string | string[]): string {
    const cmdArray = typeof cmd === "string" ? ["bash", "-c", cmd] : cmd;
    try {
      const proc = Gio.Subprocess.new(
        cmdArray,
        Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
      );
      const [, stdout] = proc.communicate_utf8(null, null);
      return stdout ?? "";
    } catch (e) {
      console.error("[SystemProvider] exec failed:", e);
      return "";
    }
  },

  execAsync(cmd: string | string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const cmdArray = typeof cmd === "string" ? ["bash", "-c", cmd] : cmd;

      try {
        const proc = Gio.Subprocess.new(
          cmdArray,
          Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
        );

        proc.communicate_utf8_async(null, null, (_, result) => {
          try {
            const [, stdout, stderr] = proc.communicate_utf8_finish(result);
            if (proc.get_successful()) {
              resolve(stdout ?? "");
            } else {
              reject(new Error(stderr ?? "Command failed"));
            }
          } catch (e) {
            reject(e);
          }
        });
      } catch (e) {
        reject(e);
      }
    });
  },

  readFile(path: string): string | null {
    try {
      const file = Gio.File.new_for_path(path);
      const [success, contents] = file.load_contents(null);
      if (success && contents) {
        return new TextDecoder().decode(contents);
      }
    } catch (e) {
      // File doesn't exist or can't be read
    }
    return null;
  },

  readFileAsync(path: string): Promise<string | null> {
    return new Promise((resolve) => {
      const file = Gio.File.new_for_path(path);
      file.load_contents_async(null, (_, result) => {
        try {
          const [success, contents] = file.load_contents_finish(result);
          if (success && contents) {
            resolve(new TextDecoder().decode(contents));
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      });
    });
  },

  fileExists(path: string): boolean {
    const file = Gio.File.new_for_path(path);
    return file.query_exists(null);
  },

  setInterval(callback: () => void, intervalMs: number): () => void {
    const sourceId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, intervalMs, () => {
      callback();
      return GLib.SOURCE_CONTINUE;
    });
    return () => GLib.source_remove(sourceId);
  },

  setTimeout(callback: () => void, delayMs: number): () => void {
    const sourceId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, delayMs, () => {
      callback();
      return GLib.SOURCE_REMOVE;
    });
    return () => GLib.source_remove(sourceId);
  },

  getEnv(name: string): string | null {
    return GLib.getenv(name);
  },

  getHomeDir(): string {
    return GLib.get_home_dir();
  },

  writeFile(path: string, content: string): boolean {
    try {
      const file = Gio.File.new_for_path(path);
      const bytes = new TextEncoder().encode(content);
      file.replace_contents(
        bytes,
        null,
        false,
        Gio.FileCreateFlags.REPLACE_DESTINATION,
        null
      );
      return true;
    } catch {
      return false;
    }
  },

  mkdir(path: string): boolean {
    try {
      GLib.mkdir_with_parents(path, 0o755);
      return true;
    } catch {
      return false;
    }
  },

  watchFile(path: string, callback: () => void): () => void {
    try {
      const file = Gio.File.new_for_path(path);
      const monitor = file.monitor_file(Gio.FileMonitorFlags.NONE, null);
      const id = monitor.connect("changed", callback);
      return () => {
        monitor.disconnect(id);
      };
    } catch {
      return () => {};
    }
  },
};

export const linuxDbusProvider: DbusProvider = {
  createProxy(
    busType: "system" | "session",
    busName: string,
    objectPath: string,
    interfaceName: string
  ): DbusProxy | null {
    try {
      const gBusType = busType === "system" ? Gio.BusType.SYSTEM : Gio.BusType.SESSION;
      const proxy = Gio.DBusProxy.new_for_bus_sync(
        gBusType,
        Gio.DBusProxyFlags.NONE,
        null,
        busName,
        objectPath,
        interfaceName,
        null
      );

      if (!proxy) return null;

      return {
        call(method: string, args?: any): any {
          const variant = args ? new GLib.Variant("(s)", [args]) : null;
          const result = proxy.call_sync(
            method,
            variant,
            Gio.DBusCallFlags.NONE,
            -1,
            null
          );
          return result?.recursiveUnpack();
        },

        callAsync(method: string, args?: any): Promise<any> {
          return new Promise((resolve, reject) => {
            const variant = args ? new GLib.Variant("(s)", [args]) : null;
            proxy.call(
              method,
              variant,
              Gio.DBusCallFlags.NONE,
              -1,
              null,
              (_, result) => {
                try {
                  const res = proxy.call_finish(result);
                  resolve(res?.recursiveUnpack());
                } catch (e) {
                  reject(e);
                }
              }
            );
          });
        },

        onSignal(callback: (signal: string, args: any) => void): () => void {
          const id = proxy.connect("g-signal", (_: any, __: string, signal: string, params: any) => {
            callback(signal, params?.recursiveUnpack());
          });
          return () => proxy.disconnect(id);
        },
      };
    } catch (e) {
      console.error("[DbusProvider] Failed to create proxy:", e);
      return null;
    }
  },
};

// Auto-register on import
setSystemProvider(linuxSystemProvider);
setDbusProvider(linuxDbusProvider);

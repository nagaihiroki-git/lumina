import { createSignal, createEffect, onCleanup } from "@lumina/bridge";
import { readFile, writeFile, monitorFile, mkdir } from "./utils/file";
import { getSystemProvider } from "./system-provider";

interface SettingsOptions<T> {
  path: string;
  defaults: T;
  autosave?: boolean;
}

export function useSettings<T extends object>({ path, defaults, autosave = true }: SettingsOptions<T>) {
  const provider = getSystemProvider();
  const homeDir = provider?.getHomeDir() ?? "";

  // Expand ~ to home
  const fullPath = path.startsWith("~")
    ? homeDir + path.slice(1)
    : path;

  const [settings, setSettings] = createSignal<T>(defaults);
  const [loaded, setLoaded] = createSignal(false);

  // Load from file
  async function load(): Promise<void> {
    try {
      const content = readFile(fullPath);
      if (content) {
        const parsed = JSON.parse(content);
        setSettings({ ...defaults, ...parsed });
      }
    } catch {
      // File doesn't exist or invalid, use defaults
      setSettings(defaults);
    }
    setLoaded(true);
  }

  // Save to file
  async function save(): Promise<void> {
    try {
      const dir = fullPath.substring(0, fullPath.lastIndexOf("/"));
      mkdir(dir);
      writeFile(fullPath, JSON.stringify(settings(), null, 2));
    } catch (e) {
      console.error("Failed to save settings:", e);
    }
  }

  // Update setting
  function update<K extends keyof T>(key: K, value: T[K]): void {
    setSettings((prev) => ({ ...prev, [key]: value }));
    if (autosave) save();
  }

  // Batch update
  function updateMany(partial: Partial<T>): void {
    setSettings((prev) => ({ ...prev, ...partial }));
    if (autosave) save();
  }

  // Reset to defaults
  function reset(): void {
    setSettings(defaults);
    if (autosave) save();
  }

  // Watch file for external changes
  createEffect(() => {
    const monitor = monitorFile(fullPath, () => {
      load();
    });
    onCleanup(() => {
      if (monitor && typeof monitor.cancel === "function") {
        monitor.cancel();
      }
    });
  });

  // Initial load
  load();

  return {
    settings,
    loaded,
    update,
    updateMany,
    reset,
    save,
    reload: load,
  };
}

// Typed settings helper
export function defineSettings<T extends object>(defaults: T) {
  return (path: string, options?: Omit<SettingsOptions<T>, "path" | "defaults">) =>
    useSettings({ path, defaults, ...options });
}

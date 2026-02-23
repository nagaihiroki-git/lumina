import { createSignal, createEffect, onCleanup } from "@lumina/bridge";
import { getMonitorProvider } from "@lumina/core";
import type { MonitorInfo } from "@lumina/core";

export type { MonitorInfo } from "@lumina/core";

export function useMonitors(): () => MonitorInfo[] {
  const provider = getMonitorProvider();
  if (!provider) {
    const [empty] = createSignal<MonitorInfo[]>([]);
    return empty;
  }

  const [monitors, setMonitors] = createSignal<MonitorInfo[]>(
    provider.getMonitors()
  );

  createEffect(() => {
    const refresh = () => {
      const provider = getMonitorProvider();
      if (provider) {
        setMonitors(provider.getMonitors());
      }
    };
    const cleanup = provider.onMonitorChange(refresh);
    onCleanup(cleanup);
  });

  return monitors;
}

export function usePrimaryMonitor(): () => MonitorInfo | null {
  const monitors = useMonitors();
  return () => monitors().find((m) => m.primary) ?? monitors()[0] ?? null;
}

export function useMonitorCount(): () => number {
  const monitors = useMonitors();
  return () => monitors().length;
}

export function useMonitorByName(name: string): () => MonitorInfo | null {
  const monitors = useMonitors();
  return () => monitors().find((m) => m.name === name) ?? null;
}

export function useMonitorByIndex(index: number): () => MonitorInfo | null {
  const monitors = useMonitors();
  return () => monitors()[index] ?? null;
}

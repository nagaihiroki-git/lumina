import { createSystemHook } from "./factory";
import { getSystemProvider } from "./system-provider";

export interface MemoryState {
  used: number;
  total: number;
  percent: number;
  icon: string;
}

export interface CpuState {
  percent: number;
  icon: string;
}

function parseMeminfo(): { used: number; total: number } {
  const provider = getSystemProvider();
  if (!provider) return { used: 0, total: 0 };

  try {
    const content = provider.readFile("/proc/meminfo");
    const lines = content.split("\n");

    let total = 0;
    let available = 0;

    for (const line of lines) {
      if (line.startsWith("MemTotal:")) {
        total = parseInt(line.split(/\s+/)[1]) * 1024;
      } else if (line.startsWith("MemAvailable:")) {
        available = parseInt(line.split(/\s+/)[1]) * 1024;
      }
    }

    return { used: total - available, total };
  } catch {
    return { used: 0, total: 0 };
  }
}

function parseCpuStat(): number[] {
  const provider = getSystemProvider();
  if (!provider) return [0, 0, 0, 0];

  try {
    const content = provider.readFile("/proc/stat");
    const cpuLine = content.split("\n")[0];
    const parts = cpuLine.split(/\s+/).slice(1).map(Number);
    return parts;
  } catch {
    return [0, 0, 0, 0];
  }
}

let lastCpuStats: number[] = [];

function calculateCpuPercent(): number {
  const current = parseCpuStat();
  if (lastCpuStats.length === 0) {
    lastCpuStats = current;
    return 0;
  }

  const prevIdle = lastCpuStats[3] + (lastCpuStats[4] || 0);
  const currIdle = current[3] + (current[4] || 0);

  const prevTotal = lastCpuStats.reduce((a, b) => a + b, 0);
  const currTotal = current.reduce((a, b) => a + b, 0);

  const totalDiff = currTotal - prevTotal;
  const idleDiff = currIdle - prevIdle;

  lastCpuStats = current;

  if (totalDiff === 0) return 0;
  return Math.round(((totalDiff - idleDiff) / totalDiff) * 100);
}

function getMemoryIcon(percent: number): string {
  if (percent >= 90) return "memory-high-symbolic";
  if (percent >= 70) return "memory-medium-symbolic";
  return "memory-low-symbolic";
}

function getCpuIcon(percent: number): string {
  if (percent >= 80) return "cpu-high-symbolic";
  if (percent >= 50) return "cpu-medium-symbolic";
  return "cpu-low-symbolic";
}

export const useMemory = createSystemHook({
  signals: [
    { key: "used", initial: 0 },
    { key: "total", initial: 0 },
    { key: "percent", initial: 0 },
    { key: "icon", initial: "memory-low-symbolic" },
  ] as const,

  refresh(getters, setters) {
    const { used, total } = parseMeminfo();
    const percent = total > 0 ? Math.round((used / total) * 100) : 0;

    if (getters.used() !== used) setters.used(used);
    if (getters.total() !== total) setters.total(total);
    if (getters.percent() !== percent) setters.percent(percent);

    const icon = getMemoryIcon(percent);
    if (getters.icon() !== icon) setters.icon(icon);
  },

  setup(_signals, refresh) {
    const provider = getSystemProvider();
    if (!provider) return;

    refresh();
    return provider.setInterval(refresh, 2000);
  },
});

export const useCpu = createSystemHook({
  signals: [
    { key: "percent", initial: 0 },
    { key: "icon", initial: "cpu-low-symbolic" },
  ] as const,

  refresh(getters, setters) {
    const percent = calculateCpuPercent();

    if (getters.percent() !== percent) setters.percent(percent);

    const icon = getCpuIcon(percent);
    if (getters.icon() !== icon) setters.icon(icon);
  },

  setup(_signals, refresh) {
    const provider = getSystemProvider();
    if (!provider) return;

    refresh();
    return provider.setInterval(refresh, 1000);
  },
});

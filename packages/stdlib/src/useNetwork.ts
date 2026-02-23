import { createSystemHook } from "./factory";
import { getSystemProvider } from "./system-provider";

export interface WifiState {
  ssid: string;
  strength: number;
  icon: string;
  enabled: boolean;
  scanning: boolean;
  setEnabled: (v: boolean) => void;
  scan: () => void;
}

export interface WiredState {
  icon: string;
  speed: number;
  connected: boolean;
}

export interface NetworkState {
  primary: "wifi" | "wired" | "none";
  connectivity: "full" | "limited" | "none";
  wifi: WifiState | null;
  wired: WiredState | null;
}

function runCommand(cmd: string): string {
  const provider = getSystemProvider();
  if (!provider) {
    console.error("[Network] No SystemProvider registered");
    return "";
  }
  return provider.exec(cmd);
}

function runCommandAsync(cmd: string): void {
  const provider = getSystemProvider();
  if (!provider) {
    console.error("[Network] No SystemProvider registered");
    return;
  }
  provider.execAsync(cmd).catch((e) => {
    console.error("[Network] Async command failed:", cmd, e);
  });
}

function parseNetworkStatus(): {
  wifiEnabled: boolean;
  wifiConnected: boolean;
  ssid: string;
  strength: number;
  wiredConnected: boolean;
  connectivity: "full" | "limited" | "none";
} {
  const wifiStatus = runCommand("nmcli -t -f WIFI general");
  const wifiEnabled = wifiStatus === "enabled";

  const activeWifi = runCommand(
    "nmcli -t -f active,ssid,signal dev wifi | grep '^yes'"
  );
  let ssid = "";
  let strength = 0;
  let wifiConnected = false;

  if (activeWifi) {
    const parts = activeWifi.split(":");
    if (parts.length >= 3) {
      wifiConnected = true;
      ssid = parts[1] || "";
      strength = parseInt(parts[2]) || 0;
    }
  }

  const wiredStatus = runCommand("nmcli -t -f type,state dev | grep ethernet");
  const wiredConnected = wiredStatus.includes("connected");

  const connectivityStatus = runCommand("nmcli -t -f CONNECTIVITY general");
  const connectivity =
    connectivityStatus === "full"
      ? "full"
      : connectivityStatus === "limited"
        ? "limited"
        : "none";

  return {
    wifiEnabled,
    wifiConnected,
    ssid,
    strength,
    wiredConnected,
    connectivity,
  };
}

function getWifiIcon(
  strength: number,
  connected: boolean,
  enabled: boolean
): string {
  if (!enabled) return "network-wireless-disabled-symbolic";
  if (!connected) return "network-wireless-offline-symbolic";
  if (strength >= 80) return "network-wireless-signal-excellent-symbolic";
  if (strength >= 55) return "network-wireless-signal-good-symbolic";
  if (strength >= 30) return "network-wireless-signal-ok-symbolic";
  return "network-wireless-signal-weak-symbolic";
}

const useNetworkInternal = createSystemHook({
  signals: [
    { key: "ssid", initial: "" },
    { key: "strength", initial: 0 },
    { key: "wifiIcon", initial: "network-wireless-offline-symbolic" },
    { key: "wifiEnabled", initial: false },
    { key: "wifiConnected", initial: false },
    { key: "wiredConnected", initial: false },
    { key: "connectivity", initial: "none" as "full" | "limited" | "none" },
    { key: "scanning", initial: false },
  ] as const,

  refresh(getters, setters) {
    const status = parseNetworkStatus();

    if (getters.ssid() !== status.ssid) setters.ssid(status.ssid);
    if (getters.strength() !== status.strength) setters.strength(status.strength);
    if (getters.wifiEnabled() !== status.wifiEnabled)
      setters.wifiEnabled(status.wifiEnabled);
    if (getters.wifiConnected() !== status.wifiConnected)
      setters.wifiConnected(status.wifiConnected);
    if (getters.wiredConnected() !== status.wiredConnected)
      setters.wiredConnected(status.wiredConnected);
    if (getters.connectivity() !== status.connectivity)
      setters.connectivity(status.connectivity);

    const newIcon = getWifiIcon(
      status.strength,
      status.wifiConnected,
      status.wifiEnabled
    );
    if (getters.wifiIcon() !== newIcon) setters.wifiIcon(newIcon);
  },

  setup(_signals, refresh) {
    const provider = getSystemProvider();
    if (!provider) {
      console.error("[Network] No SystemProvider registered");
      return;
    }

    refresh();

    const cleanup = provider.setInterval(refresh, 5000);
    return cleanup;
  },

  actions(_getters, setters, registerCleanup) {
    const provider = getSystemProvider();
    let cancelScanTimeout: (() => void) | null = null;

    // Register cleanup for pending scan timeout
    registerCleanup(() => {
      if (cancelScanTimeout) {
        cancelScanTimeout();
        cancelScanTimeout = null;
      }
    });

    return {
      setWifiEnabled: (v: boolean) => {
        runCommandAsync(`nmcli radio wifi ${v ? "on" : "off"}`);
      },
      scan: () => {
        if (!provider) return;

        // Cancel any pending scan timeout
        if (cancelScanTimeout) {
          cancelScanTimeout();
        }

        setters.scanning(true);
        runCommandAsync("nmcli dev wifi rescan");
        cancelScanTimeout = provider.setTimeout(() => {
          cancelScanTimeout = null;
          setters.scanning(false);
        }, 3000);
      },
    };
  },
});

export function useNetwork(): NetworkState {
  const state = useNetworkInternal();

  return {
    get primary() {
      return state.wifiConnected()
        ? "wifi"
        : state.wiredConnected()
          ? "wired"
          : "none";
    },
    get connectivity() {
      return state.connectivity();
    },
    wifi: {
      get ssid() {
        return state.ssid();
      },
      get strength() {
        return state.strength();
      },
      get icon() {
        return state.wifiIcon();
      },
      get enabled() {
        return state.wifiEnabled();
      },
      get scanning() {
        return state.scanning();
      },
      setEnabled: state.setWifiEnabled,
      scan: state.scan,
    },
    wired: state.wiredConnected()
      ? {
          icon: "network-wired-symbolic",
          speed: 1000,
          connected: true,
        }
      : null,
  };
}

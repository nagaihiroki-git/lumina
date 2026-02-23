import { createSystemHook } from "./factory";
import { getSystemProvider, getDbusProvider, type DbusProxy } from "./system-provider";

export interface BatteryState {
  percentage: number;
  isCharging: boolean;
  isPresent: boolean;
  icon: string;
  state: number;
  timeToEmpty: number;
  timeToFull: number;
}

const UPOWER_BUS = "org.freedesktop.UPower";
const UPOWER_DEVICE_PATH = "/org/freedesktop/UPower/devices/DisplayDevice";
const UPOWER_DEVICE_IFACE = "org.freedesktop.UPower.Device";
const DBUS_PROPS_IFACE = "org.freedesktop.DBus.Properties";

const BATTERY_STATE = {
  UNKNOWN: 0,
  CHARGING: 1,
  DISCHARGING: 2,
  EMPTY: 3,
  FULLY_CHARGED: 4,
  PENDING_CHARGE: 5,
  PENDING_DISCHARGE: 6,
} as const;

function getIconName(percentage: number, state: number): string {
  const level =
    percentage >= 90
      ? "full"
      : percentage >= 60
        ? "good"
        : percentage >= 30
          ? "low"
          : percentage >= 10
            ? "caution"
            : "empty";

  const charging = state === BATTERY_STATE.CHARGING ? "-charging" : "";
  return `battery-${level}${charging}-symbolic`;
}

let sharedProxy: DbusProxy | null = null;

function getProxy(): DbusProxy | null {
  if (sharedProxy) return sharedProxy;

  const dbusProvider = getDbusProvider();
  if (!dbusProvider) {
    console.error("[Battery] No DbusProvider registered");
    return null;
  }

  sharedProxy = dbusProvider.createProxy(
    "system",
    UPOWER_BUS,
    UPOWER_DEVICE_PATH,
    DBUS_PROPS_IFACE
  );

  return sharedProxy;
}

export const useBattery = createSystemHook({
  signals: [
    { key: "percentage", initial: 0 },
    { key: "isCharging", initial: false },
    { key: "isPresent", initial: false },
    { key: "icon", initial: "battery-missing-symbolic" },
    { key: "state", initial: BATTERY_STATE.UNKNOWN },
    { key: "timeToEmpty", initial: 0 },
    { key: "timeToFull", initial: 0 },
  ] as const,

  refresh(getters, setters) {
    const proxy = getProxy();
    if (!proxy) return;

    try {
      const result = proxy.call("GetAll", UPOWER_DEVICE_IFACE);

      if (result) {
        const [props] = result as [Record<string, any>];

        const pct = props.Percentage ?? 0;
        const st = props.State ?? BATTERY_STATE.UNKNOWN;
        const present = props.IsPresent ?? false;
        const tte = props.TimeToEmpty ?? 0;
        const ttf = props.TimeToFull ?? 0;

        if (getters.percentage() !== pct) setters.percentage(pct);
        if (getters.state() !== st) {
          setters.state(st);
          setters.isCharging(st === BATTERY_STATE.CHARGING);
        }
        if (getters.isPresent() !== present) setters.isPresent(present);
        if (getters.timeToEmpty() !== tte) setters.timeToEmpty(tte);
        if (getters.timeToFull() !== ttf) setters.timeToFull(ttf);

        const newIcon = props.IconName ?? getIconName(pct, st);
        if (getters.icon() !== newIcon) setters.icon(newIcon);
      }
    } catch (e) {
      console.error("[Battery] Refresh failed:", e);
    }
  },

  setup(_signals, refresh) {
    const systemProvider = getSystemProvider();
    const proxy = getProxy();

    if (!systemProvider || !proxy) {
      console.error("[Battery] Missing providers");
      return;
    }

    refresh();

    const cleanupSignal = proxy.onSignal((signal) => {
      if (signal === "PropertiesChanged") {
        refresh();
      }
    });

    const cleanupInterval = systemProvider.setInterval(refresh, 30000);

    return () => {
      cleanupSignal();
      cleanupInterval();
      if (sharedProxy) {
        sharedProxy = null;
      }
    };
  },
});

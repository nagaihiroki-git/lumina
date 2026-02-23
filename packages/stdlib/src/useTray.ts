import { createSignal } from "@lumina/bridge";

// StatusNotifierItem D-Bus protocol not yet implemented.
// Requires org.kde.StatusNotifierWatcher and StatusNotifierItem interfaces.

export interface TrayItem {
  id: string;
  title: string;
  icon: string;
  tooltipTitle: string;
  tooltipDescription: string;
  menu: any;
  activate: () => void;
  secondaryActivate: () => void;
  scroll: (delta: number, direction: "horizontal" | "vertical") => void;
}

export interface TrayState {
  items: TrayItem[];
}

let trayState: {
  items: ReturnType<typeof createSignal<TrayItem[]>>;
  initialized: boolean;
} | null = null;

function initTrayState() {
  if (trayState?.initialized) return trayState;

  const [items, setItems] = createSignal<TrayItem[]>([]);

  trayState = {
    items: [items, setItems],
    initialized: true,
  };

  return trayState;
}

export function useTray(): TrayState {
  const state = initTrayState();

  return {
    get items() { return state.items[0](); },
  };
}

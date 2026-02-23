// Linux-only: requires Hyprland compositor
import Gio from "gi://Gio";
import GLib from "gi://GLib";
import { createSystemHook } from "./factory";

export interface HyprlandWorkspace {
  id: number;
  name: string;
  monitor: string;
  windows: number;
  hasfullscreen: boolean;
  lastwindow: string;
  lastwindowtitle: string;
}

export interface HyprlandClient {
  address: string;
  mapped: boolean;
  hidden: boolean;
  at: [number, number];
  size: [number, number];
  workspace: { id: number; name: string };
  floating: boolean;
  monitor: number;
  class: string;
  title: string;
  initialClass: string;
  initialTitle: string;
  pid: number;
  xwayland: boolean;
  pinned: boolean;
  fullscreen: boolean;
  fullscreenMode: number;
  fakeFullscreen: boolean;
  grouped: string[];
  swallowing: string;
  focusHistoryID: number;
}

export interface HyprlandMonitor {
  id: number;
  name: string;
  description: string;
  make: string;
  model: string;
  serial: string;
  width: number;
  height: number;
  refreshRate: number;
  x: number;
  y: number;
  activeWorkspace: { id: number; name: string };
  specialWorkspace: { id: number; name: string };
  reserved: [number, number, number, number];
  scale: number;
  transform: number;
  focused: boolean;
  dpmsStatus: boolean;
  vrr: boolean;
}

export interface HyprlandState {
  workspaces: HyprlandWorkspace[];
  focusedWorkspace: HyprlandWorkspace | null;
  focusedClient: HyprlandClient | null;
  monitors: HyprlandMonitor[];
  focusWorkspace: (id: number) => void;
  dispatch: (cmd: string, args?: string) => void;
}

function getRuntimeDir(): string {
  return GLib.getenv("XDG_RUNTIME_DIR") ?? GLib.get_user_runtime_dir();
}

function getSocketPath(): string {
  const his = GLib.getenv("HYPRLAND_INSTANCE_SIGNATURE");
  if (!his) {
    const runtimeDir = getRuntimeDir();
    try {
      const hyprDir = Gio.File.new_for_path(`${runtimeDir}/hypr`);
      const enumerator = hyprDir.enumerate_children("standard::name", Gio.FileQueryInfoFlags.NONE, null);
      let info;
      while ((info = enumerator.next_file(null)) !== null) {
        const name = info.get_name();
        const socketPath = `${runtimeDir}/hypr/${name}/.socket.sock`;
        const socketFile = Gio.File.new_for_path(socketPath);
        if (socketFile.query_exists(null)) {
          return socketPath;
        }
      }
    } catch {
      // Fallback to original path
    }
  }
  return `${getRuntimeDir()}/hypr/${his}/.socket.sock`;
}

function getEventSocketPath(): string {
  const his = GLib.getenv("HYPRLAND_INSTANCE_SIGNATURE");
  if (!his) {
    const runtimeDir = getRuntimeDir();
    try {
      const hyprDir = Gio.File.new_for_path(`${runtimeDir}/hypr`);
      const enumerator = hyprDir.enumerate_children("standard::name", Gio.FileQueryInfoFlags.NONE, null);
      let info;
      while ((info = enumerator.next_file(null)) !== null) {
        const name = info.get_name();
        const socketPath = `${runtimeDir}/hypr/${name}/.socket2.sock`;
        const socketFile = Gio.File.new_for_path(socketPath);
        if (socketFile.query_exists(null)) {
          return socketPath;
        }
      }
    } catch {
      // Fallback to original path
    }
  }
  return `${getRuntimeDir()}/hypr/${his}/.socket2.sock`;
}

function sendCommand(cmd: string): string {
  const socketPath = getSocketPath();

  try {
    const socketAddress = Gio.UnixSocketAddress.new(socketPath);
    const client = new Gio.SocketClient();
    const connection = client.connect(socketAddress, null);

    const output = connection.get_output_stream();
    const input = connection.get_input_stream();

    output.write_all(cmd, null);
    output.flush(null);

    const dataInput = new Gio.DataInputStream({ base_stream: input });
    let response = "";

    try {
      while (true) {
        const [line, _length] = dataInput.read_line_utf8(null);
        if (line === null) break;
        response += line;
      }
    } catch {
      // EOF or socket closed - expected when reading is complete
    }

    connection.close(null);
    return response;
  } catch (e) {
    console.error("[Hyprland] Command failed:", e);
    return "";
  }
}

function queryJSON<T>(cmd: string): T | null {
  const response = sendCommand(`j/${cmd}`);
  if (!response) return null;

  try {
    return JSON.parse(response) as T;
  } catch (e) {
    console.error("[Hyprland] JSON parse failed:", e);
    return null;
  }
}

export const useHyprland = createSystemHook({
  signals: [
    { key: "workspaces", initial: [] as HyprlandWorkspace[] },
    { key: "focusedWorkspace", initial: null as HyprlandWorkspace | null },
    { key: "focusedClient", initial: null as HyprlandClient | null },
    { key: "monitors", initial: [] as HyprlandMonitor[] },
  ] as const,

  refresh(getters, setters) {
    const ws = queryJSON<HyprlandWorkspace[]>("workspaces");
    if (ws) {
      const current = getters.workspaces();
      const changed =
        ws.length !== current.length ||
        ws.some((w, i) => w.id !== current[i]?.id || w.name !== current[i]?.name);
      if (changed) {
        setters.workspaces(ws);
      }
    }

    const mons = queryJSON<HyprlandMonitor[]>("monitors");
    if (mons) {
      const focused = mons.find((m) => m.focused);
      if (focused) {
        const currentFocused = getters.focusedWorkspace();
        if (currentFocused?.id !== focused.activeWorkspace.id) {
          const workspaces = getters.workspaces();
          const focusedWs = workspaces.find((w) => w.id === focused.activeWorkspace.id);
          setters.focusedWorkspace(focusedWs ?? null);
        }
      }

      const current = getters.monitors();
      const changed =
        mons.length !== current.length ||
        mons.some((m, i) => m.id !== current[i]?.id);
      if (changed) {
        setters.monitors(mons);
      }
    }

    const client = queryJSON<HyprlandClient>("activewindow");
    setters.focusedClient(client);
  },

  setup(_signals, refresh) {
    refresh();

    let eventConnection: Gio.SocketConnection | null = null;

    const cleanup = () => {
      if (eventConnection) {
        try {
          eventConnection.close(null);
        } catch {
          // Connection may already be closed
        }
        eventConnection = null;
      }
    };

    try {
      const eventSocketPath = getEventSocketPath();
      const socketAddress = Gio.UnixSocketAddress.new(eventSocketPath);
      const client = new Gio.SocketClient();
      eventConnection = client.connect(socketAddress, null);

      const input = eventConnection.get_input_stream();
      const dataInput = new Gio.DataInputStream({ base_stream: input });

      const handleEvent = (event: string) => {
        const [eventName] = event.split(">>");

        switch (eventName) {
          case "workspace":
          case "createworkspace":
          case "destroyworkspace":
          case "moveworkspace":
          case "focusedmon":
          case "monitoradded":
          case "monitorremoved":
          case "activewindow":
          case "activewindowv2":
          case "openwindow":
          case "closewindow":
          case "movewindow":
            refresh();
            break;
        }
      };

      const readLine = () => {
        dataInput.read_line_async(GLib.PRIORITY_DEFAULT, null, (_source, result) => {
          try {
            const [line] = dataInput.read_line_finish_utf8(result);
            if (line) {
              handleEvent(line);
            }
            readLine();
          } catch {
            // Socket closed or Hyprland disconnected - stop reading silently
          }
        });
      };

      readLine();
    } catch (e) {
      console.error("[Hyprland] Event socket connection failed:", e);
      cleanup();
    }

    return cleanup;
  },

  actions() {
    const dispatch = (cmd: string, args?: string) => {
      const fullCmd = args ? `dispatch ${cmd} ${args}` : `dispatch ${cmd}`;
      sendCommand(fullCmd);
    };

    const focusWorkspace = (id: number) => {
      dispatch("workspace", String(id));
    };

    return { dispatch, focusWorkspace };
  },
});

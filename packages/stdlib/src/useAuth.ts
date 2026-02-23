import { createSignal } from "@lumina/bridge";
import { execAsync } from "./utils/exec";
import { getSystemProvider } from "./system-provider";

interface AuthState {
  username: () => string;
  error: () => string | null;
  loading: () => boolean;
  sessions: () => string[];
}

interface AuthActions {
  setUsername: (name: string) => void;
  login: (password: string, session?: string) => Promise<boolean>;
  listUsers: () => Promise<string[]>;
}

interface GreetdResponse {
  type: "success" | "error" | "auth_message";
  error_type?: string;
  description?: string;
  auth_message_type?: string;
  auth_message?: string;
}

async function greetdCommand(command: object): Promise<GreetdResponse> {
  const provider = getSystemProvider();
  const socket = provider?.getEnv("GREETD_SOCK");
  if (!socket) {
    throw new Error("GREETD_SOCK not set - not running under greetd");
  }

  // Use printf %s to safely pass JSON without shell interpretation
  const json = JSON.stringify(command);
  const result = await execAsync(["bash", "-c", `printf '%s' "$1" | nc -U "$2"`, "_", json, socket]);
  return JSON.parse(result);
}

export function useAuth(): AuthState & AuthActions {
  const [username, setUsername] = createSignal("");
  const [error, setError] = createSignal<string | null>(null);
  const [loading, setLoading] = createSignal(false);
  const [sessions, setSessions] = createSignal<string[]>(["Hyprland", "sway", "bash"]);

  async function login(password: string, session = "Hyprland"): Promise<boolean> {
    if (loading()) return false;

    setLoading(true);
    setError(null);

    try {
      // Create session
      const sessionRes = await greetdCommand({
        type: "create_session",
        username: username(),
      });

      if (sessionRes.type === "error") {
        setError(sessionRes.description || "Failed to create session");
        setLoading(false);
        return false;
      }

      // Auth with password
      if (sessionRes.type === "auth_message") {
        const authRes = await greetdCommand({
          type: "post_auth_message_response",
          response: password,
        });

        if (authRes.type === "error") {
          setError(authRes.description || "Authentication failed");
          setLoading(false);
          return false;
        }

        if (authRes.type === "success") {
          // Start session
          await greetdCommand({
            type: "start_session",
            cmd: [session],
          });
          return true;
        }
      }

      setLoading(false);
      return false;
    } catch (e) {
      setError(String(e));
      setLoading(false);
      return false;
    }
  }

  async function listUsers(): Promise<string[]> {
    try {
      const result = await execAsync(["bash", "-c", "getent passwd | cut -d: -f1,6 | grep /home | cut -d: -f1"]);
      return result.trim().split("\n").filter(Boolean);
    } catch {
      return [];
    }
  }

  return {
    username,
    error,
    loading,
    sessions,
    setUsername,
    login,
    listUsers,
  };
}

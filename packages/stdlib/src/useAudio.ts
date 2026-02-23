import { createSystemHook } from "./factory";
import { getSystemProvider } from "./system-provider";

export interface AudioDevice {
  volume: number;
  muted: boolean;
  icon: string;
  setVolume: (v: number) => void;
  toggleMute: () => void;
}

export interface AudioState {
  speaker: AudioDevice | null;
  mic: AudioDevice | null;
}

function runCommand(cmd: string): string {
  const provider = getSystemProvider();
  if (!provider) {
    console.error("[Audio] No SystemProvider registered");
    return "";
  }
  return provider.exec(cmd);
}

function parseWpctlStatus(): {
  sinkVolume: number;
  sinkMuted: boolean;
  sourceVolume: number;
  sourceMuted: boolean;
} {
  const output = runCommand("wpctl get-volume @DEFAULT_AUDIO_SINK@");
  const sourceOutput = runCommand("wpctl get-volume @DEFAULT_AUDIO_SOURCE@");

  let sinkVolume = 0;
  let sinkMuted = false;
  let sourceVolume = 0;
  let sourceMuted = false;

  const sinkMatch = output.match(/Volume:\s*([\d.]+)(\s*\[MUTED\])?/);
  if (sinkMatch) {
    sinkVolume = parseFloat(sinkMatch[1]);
    sinkMuted = !!sinkMatch[2];
  }

  const sourceMatch = sourceOutput.match(/Volume:\s*([\d.]+)(\s*\[MUTED\])?/);
  if (sourceMatch) {
    sourceVolume = parseFloat(sourceMatch[1]);
    sourceMuted = !!sourceMatch[2];
  }

  return { sinkVolume, sinkMuted, sourceVolume, sourceMuted };
}

function getVolumeIcon(volume: number, muted: boolean): string {
  if (muted || volume === 0) return "audio-volume-muted-symbolic";
  if (volume < 0.33) return "audio-volume-low-symbolic";
  if (volume < 0.66) return "audio-volume-medium-symbolic";
  return "audio-volume-high-symbolic";
}

const useAudioInternal = createSystemHook({
  signals: [
    { key: "speakerVolume", initial: 0 },
    { key: "speakerMuted", initial: false },
    { key: "speakerIcon", initial: "audio-volume-muted-symbolic" },
    { key: "micVolume", initial: 0 },
    { key: "micMuted", initial: false },
  ] as const,

  refresh(getters, setters) {
    const status = parseWpctlStatus();

    if (getters.speakerVolume() !== status.sinkVolume)
      setters.speakerVolume(status.sinkVolume);
    if (getters.speakerMuted() !== status.sinkMuted)
      setters.speakerMuted(status.sinkMuted);
    if (getters.micVolume() !== status.sourceVolume)
      setters.micVolume(status.sourceVolume);
    if (getters.micMuted() !== status.sourceMuted)
      setters.micMuted(status.sourceMuted);

    const newIcon = getVolumeIcon(status.sinkVolume, status.sinkMuted);
    if (getters.speakerIcon() !== newIcon) setters.speakerIcon(newIcon);
  },

  setup(_signals, refresh) {
    const provider = getSystemProvider();
    if (!provider) {
      console.error("[Audio] No SystemProvider registered");
      return;
    }

    refresh();

    const cleanup = provider.setInterval(refresh, 1000);
    return cleanup;
  },

  actions() {
    const setVolume = (target: string, volume: number) => {
      const clamped = Math.max(0, Math.min(1.5, volume));
      runCommand(`wpctl set-volume ${target} ${clamped}`);
    };

    const toggleMute = (target: string) => {
      runCommand(`wpctl set-mute ${target} toggle`);
    };

    return {
      setSpeakerVolume: (v: number) => setVolume("@DEFAULT_AUDIO_SINK@", v),
      toggleSpeakerMute: () => toggleMute("@DEFAULT_AUDIO_SINK@"),
      setMicVolume: (v: number) => setVolume("@DEFAULT_AUDIO_SOURCE@", v),
      toggleMicMute: () => toggleMute("@DEFAULT_AUDIO_SOURCE@"),
    };
  },
});

export function useAudio(): AudioState {
  const state = useAudioInternal();

  return {
    speaker: {
      get volume() {
        return state.speakerVolume();
      },
      get muted() {
        return state.speakerMuted();
      },
      get icon() {
        return state.speakerIcon();
      },
      setVolume: state.setSpeakerVolume,
      toggleMute: state.toggleSpeakerMute,
    },
    mic: {
      get volume() {
        return state.micVolume();
      },
      get muted() {
        return state.micMuted();
      },
      get icon() {
        return "audio-input-microphone-symbolic";
      },
      setVolume: state.setMicVolume,
      toggleMute: state.toggleMicMute,
    },
  };
}

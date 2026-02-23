# 🚧 [WIP] Work In Progress

> **This is a prototype. Expect breaking changes.**

---

# Lumina

**React-style FRP framework for GTK desktop widgets**

Lumina brings React's declarative component model and fine-grained reactivity to GTK/Wayland desktop widgets. Build status bars, launchers, and desktop overlays with JSX and reactive signals.

## Quick Start

### Prerequisites

- **NixOS/Nix**: Use the provided flake (recommended)
- **Other distros**: Install `gjs`, `gtk3`, `gtk-layer-shell`

### Installation

```bash
git clone https://github.com/user/lumina.git
cd lumina

# Enter development shell (NixOS)
nix develop

# Install dependencies
npm install

# Build and run
npm run build
npm run start
```

## Usage

### Basic Example

```tsx
import { render, startApp, Window } from "@lumina/core";
import { useClock } from "@lumina/stdlib";
import { styled, ThemeProvider, catppuccinMocha } from "@lumina/css";

// Apply theme
ThemeProvider(catppuccinMocha);

// Styled components with GTK theme variables
const Clock = styled.label`
  color: @text;
  font-size: 14px;
  font-weight: 600;
`;

function App() {
  // Reactive signal - auto-updates every second
  const time = useClock();

  return (
    <Window
      name="clock-widget"
      anchor={["top", "right"]}
      layer="top"
      exclusivity="normal"
    >
      <Clock label={time} />
    </Window>
  );
}

startApp({
  instanceName: "my-widget",
  main: () => render(<App />, null),
});
```

### Window Positioning (Wayland Layer Shell)

```tsx
// Status bar - spans top edge, reserves space
<Window
  anchor={["top", "left", "right"]}
  exclusivity="exclusive"
  layer="top"
>

// Notification popup - top-right corner, overlays content
<Window
  anchor={["top", "right"]}
  exclusivity="normal"
  layer="overlay"
  margin={{ top: 10, right: 10 }}
>

// Desktop widget - bottom-right, below windows
<Window
  anchor={["bottom", "right"]}
  layer="background"
>
```

### Reactive Hooks

```tsx
import { useHyprland, useBattery, useAudio, useNetwork } from "@lumina/stdlib";

function SystemInfo() {
  const hyprland = useHyprland();
  const battery = useBattery();
  const audio = useAudio();
  const network = useNetwork();

  return (
    <box>
      {/* All values are reactive signals */}
      <label label={() => `WS: ${hyprland.focusedWorkspace()?.id}`} />
      <label label={() => `BAT: ${battery.percent()}%`} />
      <label label={() => `VOL: ${Math.round(audio.speaker.volume() * 100)}%`} />
      <label label={() => network.wifi.ssid() ?? "Disconnected"} />
    </box>
  );
}
```

### Styled Components

```tsx
import { styled, css, cva } from "@lumina/css";

// Basic styled component
const Button = styled.button`
  padding: 8px 16px;
  border-radius: 4px;
  background-color: @blue;
  color: @base;

  &:hover {
    background-color: @sapphire;
  }
`;

// Dynamic styles with props
const Badge = styled.label<{ $variant?: "info" | "warning" | "error" }>`
  padding: 2px 6px;
  border-radius: 4px;
  ${(p) => {
    switch (p.$variant) {
      case "warning": return `background-color: @yellow; color: @base;`;
      case "error": return `background-color: @red; color: @base;`;
      default: return `background-color: @blue; color: @base;`;
    }
  }}
`;

// Class Variance Authority (CVA) for variants
const button = cva("btn", {
  variants: {
    size: { sm: "btn-sm", lg: "btn-lg" },
    intent: { primary: "btn-primary", danger: "btn-danger" },
  },
  defaultVariants: { size: "sm", intent: "primary" },
});
```

### Reactive Lists with `<For>`

```tsx
import { For } from "@lumina/core";

function Workspaces() {
  const hyprland = useHyprland();

  // Derived signal
  const workspaces = () =>
    [...hyprland.workspaces()].sort((a, b) => a.id - b.id);

  return (
    <For
      each={workspaces}
      children={(ws) => (
        <button
          key={ws.id}
          label={String(ws.id)}
          onClicked={() => hyprland.focusWorkspace(ws.id)}
        />
      )}
    />
  );
}
```

### Conditional Rendering

```tsx
import { Show, Switch, Match } from "@lumina/core";

function BatteryIcon() {
  const battery = useBattery();

  return (
    <Show when={battery.available} fallback={<label label="No battery" />}>
      <Switch>
        <Match when={() => battery.charging()}>
          <icon icon="battery-charging" />
        </Match>
        <Match when={() => battery.percent() > 80}>
          <icon icon="battery-full" />
        </Match>
        <Match when={() => battery.percent() > 20}>
          <icon icon="battery-half" />
        </Match>
        <Match when={true}>
          <icon icon="battery-low" />
        </Match>
      </Switch>
    </Show>
  );
}
```

## Packages

| Package | Description |
|---------|-------------|
| `@lumina/core` | JSX renderer, reactive system, GTK widget bindings |
| `@lumina/css` | Styled components, themes, CSS utilities |
| `@lumina/stdlib` | System hooks (Hyprland, Battery, Audio, Network, etc.) |

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Your App (TSX)                     │
├─────────────────────────────────────────────────────────┤
│  @lumina/css          │  @lumina/stdlib                 │
│  - styled()           │  - useHyprland()                │
│  - ThemeProvider()    │  - useBattery()                 │
│  - cva()              │  - useAudio()                   │
├───────────────────────┴─────────────────────────────────┤
│                      @lumina/core                       │
│  - JSX Runtime        │  - Reactive Signals             │
│  - GTK Reconciler     │  - Window/Layer Shell           │
├─────────────────────────────────────────────────────────┤
│                   Platform Hosts                        │
│  - GTK3 Host          │  - CSS Engine                   │
│  - Monitor Provider   │  - System Provider              │
├─────────────────────────────────────────────────────────┤
│              GJS + GTK3 + gtk-layer-shell               │
└─────────────────────────────────────────────────────────┘
```

## Development

```bash
# Watch mode - rebuild on changes
npm run dev

# Build only
npm run build

# Run specific app
bash scripts/run.sh dist/bar.js
```

### Project Structure

```
lumina/
├── apps/
│   └── bar/              # Example status bar
├── packages/
│   ├── core/             # JSX runtime, reconciler, reactive
│   ├── css/              # Styled components, themes
│   └── stdlib/           # System integration hooks
├── types/
│   └── gjs/              # Minimal GJS type definitions
├── specs/
│   └── tlaplus/          # Formal verification (TLA+)
└── scripts/
    └── run.sh            # GJS runner script
```

## Formal Verification

The reactive core is formally verified using TLA+ model checking. See [specs/tlaplus/README.md](specs/tlaplus/README.md) for details.

Verified properties:
- Memory leak absence
- No circular dependencies
- Eventual consistency
- Hierarchical disposal correctness

## License

MIT

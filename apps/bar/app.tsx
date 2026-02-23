import { render, startApp, Window, For } from "@lumina/core";
import { useClock, useHyprland, useNetwork, useMemory, useCpu } from "@lumina/stdlib";
import { styled, ThemeProvider, catppuccinMocha } from "@lumina/css";

ThemeProvider(catppuccinMocha);

const Bar = styled.centerbox`
  background-color: @base;
  padding: 4px 16px;
  min-height: 32px;
`;

const ClockLabel = styled.label`
  color: @text;
  font-weight: 600;
`;

const WorkspaceButton = styled.button<{ $active?: boolean | (() => boolean) }>`
  padding: 4px 8px;
  margin: 0 2px;
  border-radius: 4px;
  ${(p) => {
    const active = typeof p.$active === "function" ? p.$active() : p.$active;
    return active
      ? `background-color: @blue; color: @base;`
      : `background-color: transparent; color: @subtext0;`;
  }}
`;

const StatusBox = styled.box`
  padding: 0 12px;
`;

const StatusItem = styled.box`
  padding: 0 6px;
`;

const StatusIcon = styled.icon`
  color: @text;
`;

const StatusLabel = styled.label`
  color: @subtext0;
  font-size: 12px;
  margin-left: 4px;
`;

function Clock() {
  const time = useClock();
  return <ClockLabel label={time} />;
}

function Workspaces() {
  const hyprland = useHyprland();

  const sortedWorkspaces = () =>
    [...hyprland.workspaces()]
      .filter((ws) => ws.id > 0)
      .sort((a, b) => a.id - b.id);

  return (
    <For
      each={sortedWorkspaces}
      children={(ws) => (
        <WorkspaceButton
          key={ws.id}
          $active={() => hyprland.focusedWorkspace()?.id === ws.id}
          label={String(ws.id)}
          onClicked={() => hyprland.focusWorkspace(ws.id)}
        />
      )}
    />
  );
}

function Network() {
  const network = useNetwork();

  const icon = () => network.wifi?.icon ?? "network-offline-symbolic";
  const label = () => {
    if (network.primary === "wifi" && network.wifi) {
      return network.wifi.ssid || "WiFi";
    }
    if (network.primary === "wired") {
      return "Wired";
    }
    return "Offline";
  };

  return (
    <StatusItem>
      <StatusIcon icon_name={icon} />
      <StatusLabel label={label} />
    </StatusItem>
  );
}

function Memory() {
  const memory = useMemory();

  const label = () => `${memory.percent()}%`;

  return (
    <StatusItem>
      <StatusIcon icon_name="drive-harddisk-symbolic" />
      <StatusLabel label={label} />
    </StatusItem>
  );
}

function Cpu() {
  const cpu = useCpu();

  const label = () => `${cpu.percent()}%`;

  return (
    <StatusItem>
      <StatusIcon icon_name="utilities-system-monitor-symbolic" />
      <StatusLabel label={label} />
    </StatusItem>
  );
}

function App() {
  return (
    <Window
      name="bar"
      anchor={["top", "left", "right"]}
      exclusivity="exclusive"
      layer="top"
    >
      <Bar>
        <Workspaces />
        <Clock />
        <StatusBox>
          <Cpu />
          <Memory />
          <Network />
        </StatusBox>
      </Bar>
    </Window>
  );
}

startApp({
  instanceName: "lumina-bar",
  main() {
    render(<App />, null);
  },
});

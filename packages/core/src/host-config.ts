// FRP HostConfig: No commitUpdate/commitTextUpdate needed (widgets update via Signal bindings)
export interface HostConfig<Instance, Container, TextInstance = Instance> {
  createInstance(type: string, props: Record<string, any>): Instance;
  createTextInstance(text: string): TextInstance;
  appendChild(parent: Instance | Container, child: Instance | TextInstance): void;
  insertBefore(
    parent: Instance | Container,
    child: Instance | TextInstance,
    index: number
  ): void;
  removeChild(parent: Instance | Container, child: Instance | TextInstance): void;
  connectSignal(instance: Instance, signal: string, handler: Function): number;
  disconnectSignal(instance: Instance, handlerId: number): void;
  showInstance(instance: Instance): void;
  destroyInstance(instance: Instance): void;
  disposeInstance(instance: Instance): void;
}

let currentHostConfig: HostConfig<any, any, any> | null = null;

export function setHostConfig<I, C, T>(config: HostConfig<I, C, T>): void {
  currentHostConfig = config;
}

export function getHostConfig<I, C, T>(): HostConfig<I, C, T> {
  if (!currentHostConfig) {
    throw new Error("HostConfig not configured. Call setHostConfig() or import a host.");
  }
  return currentHostConfig as HostConfig<I, C, T>;
}

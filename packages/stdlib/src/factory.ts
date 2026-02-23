import { createSignal } from "@lumina/bridge";

type Signal<T> = ReturnType<typeof createSignal<T>>;
type SignalGetter<T> = Signal<T>[0];
type SignalSetter<T> = Signal<T>[1];

// Widen literal types to their base types (0 -> number, false -> boolean, "" -> string)
type Widen<T> = T extends string
  ? string
  : T extends number
    ? number
    : T extends boolean
      ? boolean
      : T;

export interface SignalConfig<K extends string, V> {
  key: K;
  initial: V;
}

type SignalsFromConfig<Config extends readonly SignalConfig<string, any>[]> = {
  [C in Config[number] as C["key"]]: Signal<Widen<C["initial"]>>;
};

type GettersFromConfig<Config extends readonly SignalConfig<string, any>[]> = {
  [C in Config[number] as C["key"]]: SignalGetter<Widen<C["initial"]>>;
};

type SettersFromConfig<Config extends readonly SignalConfig<string, any>[]> = {
  [C in Config[number] as C["key"]]: SignalSetter<Widen<C["initial"]>>;
};

export interface SystemHookConfig<
  Config extends readonly SignalConfig<string, any>[],
  TActions extends Record<string, any> = Record<string, never>,
> {
  signals: Config;
  setup: (
    signals: SignalsFromConfig<Config>,
    refresh: () => void
  ) => (() => void) | void;
  refresh: (
    getters: GettersFromConfig<Config>,
    setters: SettersFromConfig<Config>
  ) => void;
  actions?: (
    getters: GettersFromConfig<Config>,
    setters: SettersFromConfig<Config>,
    registerCleanup: (fn: () => void) => void
  ) => TActions;
}

interface HookState<
  Config extends readonly SignalConfig<string, any>[],
  TActions extends Record<string, any>,
> {
  signals: SignalsFromConfig<Config>;
  getters: GettersFromConfig<Config>;
  setters: SettersFromConfig<Config>;
  actions: TActions;
  initialized: boolean;
  cleanups: (() => void)[];
}

export interface SystemHook<
  Config extends readonly SignalConfig<string, any>[],
  TActions extends Record<string, any>,
> {
  (): GettersFromConfig<Config> & TActions;
  dispose(): void;
}

export function createSystemHook<
  const Config extends readonly SignalConfig<string, any>[],
  TActions extends Record<string, any> = Record<string, never>,
>(
  config: SystemHookConfig<Config, TActions>
): SystemHook<Config, TActions> {
  let state: HookState<Config, TActions> | null = null;

  const init = (): HookState<Config, TActions> => {
    if (state?.initialized) return state;

    const signals = {} as SignalsFromConfig<Config>;
    const getters = {} as GettersFromConfig<Config>;
    const setters = {} as SettersFromConfig<Config>;

    for (const { key, initial } of config.signals) {
      const [getter, setter] = createSignal(initial);
      (signals as any)[key] = [getter, setter];
      (getters as any)[key] = getter;
      (setters as any)[key] = setter;
    }

    const cleanups: (() => void)[] = [];
    const registerCleanup = (fn: () => void) => cleanups.push(fn);

    const refresh = () => config.refresh(getters, setters);
    const setupCleanup = config.setup(signals, refresh);
    if (typeof setupCleanup === "function") {
      cleanups.push(setupCleanup);
    }

    const actions = config.actions?.(getters, setters, registerCleanup) ?? ({} as TActions);

    state = {
      signals,
      getters,
      setters,
      actions,
      initialized: true,
      cleanups,
    };

    return state;
  };

  const hook = (): GettersFromConfig<Config> & TActions => {
    const s = init();

    const result = {} as GettersFromConfig<Config> & TActions;

    for (const { key } of config.signals) {
      (result as any)[key] = (s.getters as any)[key];
    }

    for (const [key, value] of Object.entries(s.actions)) {
      (result as any)[key] = value;
    }

    return result;
  };

  hook.dispose = () => {
    if (state) {
      for (const cleanup of state.cleanups) {
        try {
          cleanup();
        } catch (e) {
          console.error("[SystemHook] Cleanup error:", e);
        }
      }
    }
    state = null;
  };

  return hook;
}

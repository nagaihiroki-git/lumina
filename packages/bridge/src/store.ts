import { createSignal, batch } from "./reactive";

type Store<T> = {
  [K in keyof T]: T[K] extends object ? Store<T[K]> : () => T[K];
};

type SetStore<T> = {
  [K in keyof T]: T[K] extends object ? SetStore<T[K]> : (v: T[K] | ((prev: T[K]) => T[K])) => void;
} & ((partial: Partial<T>) => void);

type StoreResult<T> = [Store<T>, SetStore<T>, () => void];

export function createStore<T extends object>(initial: T): StoreResult<T> {
  const signals = new Map<string, [() => any, (v: any) => void]>();

  const dispose = () => {
    signals.clear();
  };

  function getSignal<V>(path: string, value: V) {
    if (!signals.has(path)) {
      signals.set(path, createSignal(value));
    }
    return signals.get(path)! as [() => V, (v: V | ((prev: V) => V)) => void];
  }

  function createProxy(obj: any, path: string[] = []): any {
    return new Proxy(
      {},
      {
        get(_, key: string) {
          const fullPath = [...path, key].join(".");
          const value = getNestedValue(initial, [...path, key]);

          if (typeof value === "object" && value !== null) {
            return createProxy(value, [...path, key]);
          }

          const [read] = getSignal(fullPath, value);
          return read;
        },
      }
    );
  }

  function createSetProxy(path: string[] = []): any {
    const setter: any = (partial: Partial<T>) => {
      batch(() => {
        for (const [key, value] of Object.entries(partial)) {
          const fullPath = [...path, key].join(".");
          const [, write] = getSignal(fullPath, value);
          write(value);
        }
      });
    };

    return new Proxy(setter, {
      get(_, key: string) {
        const value = getNestedValue(initial, [...path, key]);

        if (typeof value === "object" && value !== null) {
          return createSetProxy([...path, key]);
        }

        return (v: any) => {
          const fullPath = [...path, key].join(".");
          const [, write] = getSignal(fullPath, v);
          write(v);
        };
      },
    });
  }

  return [createProxy(initial) as Store<T>, createSetProxy() as SetStore<T>, dispose];
}

function getNestedValue(obj: any, path: string[]): any {
  return path.reduce((acc, key) => acc?.[key], obj);
}

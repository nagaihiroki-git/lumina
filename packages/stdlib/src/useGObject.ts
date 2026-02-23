import { createSignal, createEffect, onCleanup } from "@lumina/bridge";

export function useGObject<T extends object, K extends keyof T>(
  obj: T,
  property: K
): () => T[K] {
  const [value, setValue] = createSignal<T[K]>((obj as any)[property]);

  createEffect(() => {
    const handler = (obj as any).connect(
      `notify::${String(property)}`,
      () => {
        setValue((obj as any)[property]);
      }
    );

    onCleanup(() => {
      (obj as any).disconnect(handler);
    });
  });

  return value;
}

export function useGObjectProps<T extends object, K extends keyof T>(
  obj: T,
  properties: K[]
): { [P in K]: () => T[P] } {
  const result = {} as { [P in K]: () => T[P] };

  for (const prop of properties) {
    result[prop] = useGObject(obj, prop);
  }

  return result;
}

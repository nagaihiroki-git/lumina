type Cleanup = () => void;

// TLA+ spec: specs/tlaplus/LuminaReactive.tla
interface EffectContext {
  execute: () => void;
  cleanups: Cleanup[];
  dependencies: Set<Set<() => void>>;
  active: boolean;
  parent: EffectContext | null;
  children: Set<EffectContext>;
}

let currentEffect: EffectContext | null = null;
let batchDepth = 0;
let pendingEffects = new Set<EffectContext>();

const executeToContext = new WeakMap<() => void, EffectContext>();

export function createSignal<T>(
  initialValue: T
): [() => T, (v: T | ((prev: T) => T)) => void] {
  let value = initialValue;
  const subscribers = new Set<() => void>();

  const read = () => {
    if (currentEffect && currentEffect.active) {
      subscribers.add(currentEffect.execute);
      currentEffect.dependencies.add(subscribers);
    }
    return value;
  };

  const write = (next: T | ((prev: T) => T)) => {
    const newValue =
      typeof next === "function" ? (next as (prev: T) => T)(value) : next;
    if (newValue !== value) {
      value = newValue;
      for (const sub of subscribers) {
        const ctx = executeToContext.get(sub);
        if (ctx && ctx.active) {
          pendingEffects.add(ctx);
        }
      }
      if (batchDepth === 0) {
        runPendingEffects();
      }
    }
  };

  return [read, write];
}

function runPendingEffects(): void {
  while (pendingEffects.size > 0) {
    const effects = [...pendingEffects];
    pendingEffects.clear();
    for (const ctx of effects) {
      if (ctx.active) {
        ctx.execute();
      }
    }
  }
}

// TLA+ invariant: NoMemoryLeak
function clearDependencies(ctx: EffectContext): void {
  for (const subscriberSet of ctx.dependencies) {
    subscriberSet.delete(ctx.execute);
  }
  ctx.dependencies.clear();
}

// TLA+ invariant: DisposedChildrenInactive
function disposeEffect(ctx: EffectContext): void {
  if (!ctx.active) return;

  for (const child of ctx.children) {
    disposeEffect(child);
  }
  ctx.children.clear();

  for (const cleanup of ctx.cleanups) {
    try {
      cleanup();
    } catch (e) {
      console.error("[Reactive] Cleanup error:", e);
    }
  }
  ctx.cleanups = [];

  clearDependencies(ctx);
  pendingEffects.delete(ctx);

  // TLA+ invariant: ParentChildConsistency
  if (ctx.parent) {
    ctx.parent.children.delete(ctx);
    ctx.parent = null;
  }

  ctx.active = false;
}

export function createEffect(fn: () => void | Cleanup): () => void {
  const ctx: EffectContext = {
    execute: null as any,
    cleanups: [],
    dependencies: new Set(),
    active: true,
    parent: currentEffect,
    children: new Set(),
  };

  if (currentEffect) {
    currentEffect.children.add(ctx);
  }

  const execute = () => {
    if (!ctx.active) return;

    for (const child of ctx.children) {
      disposeEffect(child);
    }
    ctx.children.clear();

    for (const cleanup of ctx.cleanups) {
      try {
        cleanup();
      } catch (e) {
        console.error("[Reactive] Cleanup error:", e);
      }
    }
    ctx.cleanups = [];

    clearDependencies(ctx);
    pendingEffects.delete(ctx);

    const prevEffect = currentEffect;
    currentEffect = ctx;
    try {
      const returnedCleanup = fn();
      if (returnedCleanup) {
        ctx.cleanups.push(returnedCleanup);
      }
    } catch (e) {
      console.error("[Reactive] Effect error:", e);
    } finally {
      currentEffect = prevEffect;
    }
  };

  ctx.execute = execute;
  executeToContext.set(execute, ctx);

  execute();

  return () => disposeEffect(ctx);
}

export function onCleanup(fn: () => void): void {
  if (currentEffect && currentEffect.active) {
    currentEffect.cleanups.push(fn);
  }
}

export function createMemo<T>(fn: () => T): () => T {
  const [value, setValue] = createSignal<T>(fn());
  createEffect(() => setValue(fn()));
  return value;
}

export function onMount(fn: () => void): void {
  // Schedule mount callback to run after current effect completes
  queueMicrotask(fn);
}

export function batch(fn: () => void): void {
  batchDepth++;
  try {
    fn();
  } finally {
    batchDepth--;
    if (batchDepth === 0) {
      runPendingEffects();
    }
  }
}

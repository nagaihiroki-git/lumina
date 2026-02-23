import type { LuminaElement, LuminaNode, ComponentFn } from "./types";
import { getHostConfig } from "./host-config";
import { Fragment } from "./jsx";
import { getErrorHandler } from "./components";

type FiberType = "element" | "fragment" | "text" | "component";

interface Fiber {
  fiberType: FiberType;
  key: string | number | null;
  type: string | typeof Fragment | ComponentFn | null;
  element: LuminaElement | null;
  instance: any | null;
  parent: Fiber | null;
  children: Fiber[];
  index: number;
  componentFn?: ComponentFn;
  props?: Record<string, any>;
}

export function render(element: LuminaNode, _container: any): Fiber | null {
  return reconcile(null, element, null, 0);
}

export function renderChild(element: LuminaNode, container: any): () => void {
  const hostConfig = getHostConfig();
  const fiber = reconcile(null, element, null, 0);

  if (fiber) {
    const widgets = collectWidgets(fiber);
    for (const widget of widgets) {
      hostConfig.appendChild(container, widget);
      // GTK requires show_all() on dynamically added widgets
      if (widget.show_all) widget.show_all();
    }
  }

  return () => {
    if (fiber) {
      const widgets = collectWidgets(fiber);
      for (const widget of widgets) {
        hostConfig.removeChild(container, widget);
      }
      cleanupFiber(fiber);
    }
  };
}

export function createRoot(container: any) {
  let fiber: Fiber | null = null;

  return {
    render(element: LuminaNode) {
      fiber = reconcile(null, element, null, 0);

      if (fiber && container) {
        mountFiberToContainer(fiber, container);
      }
    },
    unmount() {
      if (fiber) {
        destroyFiber(fiber);
        fiber = null;
      }
    },
  };
}

function mountFiberToContainer(fiber: Fiber, container: any): void {
  const hostConfig = getHostConfig();

  if (fiber.instance) {
    hostConfig.appendChild(container, fiber.instance);
  } else {
    for (const child of fiber.children) {
      mountFiberToContainer(child, container);
    }
  }
}

function getKey(node: LuminaNode, index: number): string | number {
  if (node && typeof node === "object" && "props" in node) {
    return node.props?.key ?? index;
  }
  return index;
}

function reconcile(
  _oldFiber: Fiber | null,
  node: LuminaNode,
  parent: Fiber | null,
  index: number
): Fiber | null {
  if (node === null || node === undefined || node === false || node === true) {
    return null;
  }

  if (typeof node === "string" || typeof node === "number") {
    return createTextFiber(String(node), parent, index);
  }

  if (Array.isArray(node)) {
    return createFragmentFiber(node, parent, index);
  }

  const element = node as LuminaElement;

  if (element.type === Fragment || element.type === "fragment") {
    return createFragmentFiber(element.children, parent, index);
  }

  if (typeof element.type === "function") {
    return createComponentFiber(element, parent, index);
  }

  return createElementFiber(element, parent, index);
}

function createComponentFiber(
  element: LuminaElement,
  parent: Fiber | null,
  index: number
): Fiber {
  const componentFn = element.type as ComponentFn;
  // Render prop pattern: unwrap single function child
  const rawChildren = element.children;
  const children = rawChildren.length === 1 && typeof rawChildren[0] === "function"
    ? rawChildren[0]
    : rawChildren;
  const props = { ...element.props, children };
  const key = getKey(element, index);

  const fiber: Fiber = {
    fiberType: "component",
    key,
    type: componentFn,
    element,
    instance: null,
    parent,
    children: [],
    index,
    componentFn,
    props,
  };

  try {
    const rendered = componentFn(props);
    const child = reconcile(null, rendered, fiber, 0);
    fiber.children = child ? [child] : [];
  } catch (error) {
    const handler = getErrorHandler();
    if (handler) {
      handler(error as Error);
      fiber.children = [];
    } else {
      throw error;
    }
  }

  return fiber;
}

function createTextFiber(
  text: string,
  parent: Fiber | null,
  index: number
): Fiber {
  const hostConfig = getHostConfig();
  const instance = hostConfig.createTextInstance(text);

  return {
    fiberType: "text",
    key: index,
    type: "label",
    element: null,
    instance,
    parent,
    children: [],
    index,
  };
}

function createFragmentFiber(
  children: LuminaNode[],
  parent: Fiber | null,
  index: number
): Fiber {
  const flatChildren = flattenChildren(children);

  const fiber: Fiber = {
    fiberType: "fragment",
    key: index,
    type: Fragment,
    element: null,
    instance: null,
    parent,
    children: [],
    index,
  };

  buildChildList(fiber, flatChildren);
  return fiber;
}

function createElementFiber(
  element: LuminaElement,
  parent: Fiber | null,
  index: number
): Fiber {
  const hostConfig = getHostConfig();
  const key = getKey(element, index);
  const elementType = element.type as string;
  const instance = hostConfig.createInstance(elementType, element.props);

  const fiber: Fiber = {
    fiberType: "element",
    key,
    type: elementType,
    element,
    instance,
    parent,
    children: [],
    index,
  };

  buildChildList(fiber, flattenChildren(element.children));

  if (elementType === "window") {
    hostConfig.showInstance(instance);
  }

  return fiber;
}

function flattenChildren(children: LuminaNode[]): LuminaNode[] {
  const result: LuminaNode[] = [];

  for (const child of children) {
    if (
      child === null ||
      child === undefined ||
      child === true ||
      child === false
    ) {
      continue;
    }
    if (Array.isArray(child)) {
      result.push(...flattenChildren(child));
    } else {
      result.push(child);
    }
  }

  return result;
}

function buildChildList(fiber: Fiber, children: LuminaNode[]): void {
  const hostConfig = getHostConfig();

  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const childFiber = reconcile(null, child, fiber, i);

    if (childFiber) {
      fiber.children.push(childFiber);

      if (fiber.instance) {
        const widgets = collectWidgets(childFiber);
        for (const widget of widgets) {
          hostConfig.appendChild(fiber.instance, widget);
        }
      }
    }
  }
}

function collectWidgets(fiber: Fiber): any[] {
  if (fiber.instance) return [fiber.instance];

  const widgets: any[] = [];
  for (const child of fiber.children) {
    widgets.push(...collectWidgets(child));
  }
  return widgets;
}

function destroyFiber(fiber: Fiber): void {
  const hostConfig = getHostConfig();

  for (const child of fiber.children) {
    destroyFiber(child);
  }

  if (fiber.instance) {
    hostConfig.disposeInstance(fiber.instance);
    hostConfig.destroyInstance(fiber.instance);
  }
}

// Cleanup fiber tree without destroying instances (used when removeChild already destroyed them)
function cleanupFiber(fiber: Fiber): void {
  for (const child of fiber.children) {
    cleanupFiber(child);
  }
  fiber.instance = null;
  fiber.children = [];
}

export type { Fiber };

export type LuminaNode =
  | LuminaElement
  | string
  | number
  | boolean
  | null
  | undefined
  | LuminaNode[];

export type ComponentFn = (props: any) => LuminaNode;

export interface LuminaElement {
  type: string | ComponentFn | symbol;
  props: Record<string, any>;
  children: LuminaNode[];
}

export type FC<P = {}> = (props: P & { children?: LuminaNode }) => LuminaNode;

// FRP: Allow Signal getters (functions) as property values
export type MaybeSignal<T> = T | (() => T);

// Platform-independent type definitions
// Union with number for backward compatibility with Gtk.Align numeric values
export type Align = "start" | "center" | "end" | "fill" | number;
export type ScrollPolicy = "always" | "auto" | "never" | number;
export type StackTransition = "none" | "crossfade" | "slide-right" | "slide-left" | "slide-up" | "slide-down" | number;
export type RevealerTransition = "none" | "crossfade" | "slide-right" | "slide-left" | "slide-up" | "slide-down" | number;

// Signal handlers remain as functions (not Signal getters)
type SignalHandlers = {
  onClicked?: () => void;
  onChanged?: (self: any) => void;
  onActivate?: () => void;
  onKeyPressEvent?: (self: any, event: any) => boolean;
  onDestroy?: () => void;
  onScroll?: (self: any, event: any) => boolean;
  onEnter?: (self: any, event: any) => boolean;
  onLeave?: (self: any, event: any) => boolean;
  onDragged?: (self: any) => void;
};

// Common props with MaybeSignal support for reactive values
type CommonProps = {
  key?: string | number;
  ref?: (instance: any) => void;
  className?: MaybeSignal<string>;
  css?: MaybeSignal<string>;
  visible?: MaybeSignal<boolean>;
  sensitive?: MaybeSignal<boolean>;
  tooltipText?: MaybeSignal<string>;
  children?: LuminaNode;
};

export interface IntrinsicElements {
  box: CommonProps &
    SignalHandlers & {
      vertical?: MaybeSignal<boolean>;
      spacing?: MaybeSignal<number>;
      homogeneous?: MaybeSignal<boolean>;
      hexpand?: MaybeSignal<boolean>;
      vexpand?: MaybeSignal<boolean>;
      halign?: MaybeSignal<Align>;
      valign?: MaybeSignal<Align>;
    };
  centerbox: CommonProps &
    SignalHandlers & {
      vertical?: MaybeSignal<boolean>;
    };
  stack: CommonProps &
    SignalHandlers & {
      shown?: MaybeSignal<string>;
      transitionType?: MaybeSignal<StackTransition>;
    };
  scrollable: CommonProps &
    SignalHandlers & {
      hscroll?: MaybeSignal<ScrollPolicy>;
      vscroll?: MaybeSignal<ScrollPolicy>;
    };
  label: CommonProps &
    SignalHandlers & {
      label?: MaybeSignal<string>;
      xalign?: MaybeSignal<number>;
      yalign?: MaybeSignal<number>;
      wrap?: MaybeSignal<boolean>;
      maxWidthChars?: MaybeSignal<number>;
      useMarkup?: MaybeSignal<boolean>;
    };
  button: CommonProps &
    SignalHandlers & {
      label?: MaybeSignal<string>;
    };
  icon: CommonProps &
    SignalHandlers & {
      icon?: MaybeSignal<string>;
      gicon?: any;
      pixelSize?: MaybeSignal<number>;
    };
  image: CommonProps &
    SignalHandlers & {
      file?: MaybeSignal<string>;
      pixbuf?: any;
      pixelSize?: MaybeSignal<number>;
    };
  entry: CommonProps &
    SignalHandlers & {
      text?: MaybeSignal<string>;
      placeholderText?: MaybeSignal<string>;
      visibility?: MaybeSignal<boolean>;
      editable?: MaybeSignal<boolean>;
    };
  slider: CommonProps &
    SignalHandlers & {
      value?: MaybeSignal<number>;
      min?: MaybeSignal<number>;
      max?: MaybeSignal<number>;
      step?: MaybeSignal<number>;
      drawValue?: MaybeSignal<boolean>;
    };
  switch: CommonProps &
    SignalHandlers & {
      active?: MaybeSignal<boolean>;
    };
  revealer: CommonProps &
    SignalHandlers & {
      revealChild?: MaybeSignal<boolean>;
      transitionType?: MaybeSignal<RevealerTransition>;
      transitionDuration?: MaybeSignal<number>;
    };
  menubutton: CommonProps &
    SignalHandlers & {
      tooltipMarkup?: MaybeSignal<string>;
      usePopover?: MaybeSignal<boolean>;
      menuModel?: any;
      actionGroup?: [string, any];
    };
  overlay: CommonProps & SignalHandlers;
  eventbox: CommonProps & SignalHandlers;
  separator: CommonProps &
    SignalHandlers & {
      vertical?: MaybeSignal<boolean>;
    };
  progressbar: CommonProps &
    SignalHandlers & {
      fraction?: MaybeSignal<number>;
      text?: MaybeSignal<string>;
      showText?: MaybeSignal<boolean>;
    };
  levelbar: CommonProps &
    SignalHandlers & {
      value?: MaybeSignal<number>;
      minValue?: MaybeSignal<number>;
      maxValue?: MaybeSignal<number>;
    };
  window: CommonProps &
    SignalHandlers & {
      gdkmonitor?: any;
      anchor?: number;
      exclusivity?: number;
      application?: any;
      name?: string;
      layer?: number;
      margin?: number;
      marginTop?: number;
      marginBottom?: number;
      marginLeft?: number;
      marginRight?: number;
    };
}

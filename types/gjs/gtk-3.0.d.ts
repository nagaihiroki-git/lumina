declare module "gi://Gtk?version=3.0" {
  import * as GObject from "gi://GObject";
  import * as Gio from "gi://Gio";
  import * as Gdk from "gi://Gdk?version=3.0";

  export function init(argv?: string[] | null): string[];

  export enum Orientation {
    HORIZONTAL = 0,
    VERTICAL = 1,
  }

  export enum IconSize {
    INVALID = 0,
    MENU = 1,
    SMALL_TOOLBAR = 2,
    LARGE_TOOLBAR = 3,
    BUTTON = 4,
    DND = 5,
    DIALOG = 6,
  }

  export const STYLE_PROVIDER_PRIORITY_APPLICATION: number;

  export class Widget extends GObject.Object {
    visible: boolean;
    sensitive: boolean;
    get_style_context(): StyleContext;
    show(): void;
    show_all(): void;
    hide(): void;
    destroy(): void;
    run_dispose(): void;
  }

  export class Container extends Widget {
    add(child: Widget): void;
    remove(child: Widget): void;
    get_children(): Widget[];
  }

  export class Box extends Container {
    constructor(props?: {
      orientation?: Orientation;
      spacing?: number;
      homogeneous?: boolean;
      [key: string]: any;
    });
    set_orientation(orientation: Orientation): void;
    pack_start(child: Widget, expand: boolean, fill: boolean, padding: number): void;
    pack_end(child: Widget, expand: boolean, fill: boolean, padding: number): void;
    set_center_widget(child: Widget): void;
    reorder_child(child: Widget, position: number): void;
  }

  export class Label extends Widget {
    constructor(props?: { label?: string; [key: string]: any });
    set_label(text: string): void;
    set_text(text: string): void;
  }

  export class Button extends Widget {
    constructor(props?: { label?: string; [key: string]: any });
    set_label(text: string): void;
  }

  export class Image extends Widget {
    constructor(props?: {
      icon_name?: string;
      icon_size?: IconSize;
      file?: string;
      [key: string]: any;
    });
  }

  export class Entry extends Widget {
    constructor(props?: { text?: string; [key: string]: any });
    set_text(text: string): void;
    get_text(): string;
  }

  export class Scale extends Widget {
    constructor(props?: { [key: string]: any });
  }

  export class Switch extends Widget {
    constructor(props?: { active?: boolean; [key: string]: any });
  }

  export class Revealer extends Container {
    constructor(props?: {
      reveal_child?: boolean;
      transition_type?: number;
      transition_duration?: number;
      [key: string]: any;
    });
  }

  export class Stack extends Container {
    constructor(props?: { [key: string]: any });
  }

  export class ScrolledWindow extends Container {
    constructor(props?: { [key: string]: any });
  }

  export class MenuButton extends Widget {
    constructor(props?: { [key: string]: any });
  }

  export class Overlay extends Container {
    constructor(props?: { [key: string]: any });
  }

  export class EventBox extends Container {
    constructor(props?: { [key: string]: any });
  }

  export class Separator extends Widget {
    constructor(props?: { [key: string]: any });
  }

  export class ProgressBar extends Widget {
    constructor(props?: { [key: string]: any });
  }

  export class LevelBar extends Widget {
    constructor(props?: { [key: string]: any });
  }

  export class Window extends Container {
    constructor(props?: { [key: string]: any });
    set_application(app: Application): void;
  }

  export class Application extends Gio.Application {
    constructor(props?: { application_id?: string; flags?: number });
  }

  export class CssProvider {
    constructor();
    load_from_data(css: string): void;
  }

  export class StyleContext {
    add_class(className: string): void;
    remove_class(className: string): void;
    static add_provider_for_screen(
      screen: Gdk.Screen,
      provider: CssProvider,
      priority: number
    ): void;
  }

  export class Settings extends GObject.Object {
    static get_default(): Settings;
    gtk_application_prefer_dark_theme: boolean;
    gtk_theme_name: string;
    gtk_icon_theme_name: string;
    gtk_cursor_theme_name: string;
  }
}

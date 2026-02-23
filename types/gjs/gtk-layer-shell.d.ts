declare module "gi://GtkLayerShell?version=0.1" {
  import Gtk from "gi://Gtk?version=3.0";
  import Gdk from "gi://Gdk?version=3.0";

  export enum Edge {
    TOP = 0,
    BOTTOM = 1,
    LEFT = 2,
    RIGHT = 3,
  }

  export enum Layer {
    BACKGROUND = 0,
    BOTTOM = 1,
    TOP = 2,
    OVERLAY = 3,
  }

  export function init_for_window(window: Gtk.Window): void;
  export function set_layer(window: Gtk.Window, layer: Layer | number): void;
  export function set_anchor(window: Gtk.Window, edge: Edge, anchor: boolean): void;
  export function set_margin(window: Gtk.Window, edge: Edge, margin: number): void;
  export function set_exclusive_zone(window: Gtk.Window, zone: number): void;
  export function auto_exclusive_zone_enable(window: Gtk.Window): void;
  export function set_monitor(window: Gtk.Window, monitor: Gdk.Monitor): void;
}

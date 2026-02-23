declare module "gi://Gdk?version=3.0" {
  import * as GObject from "gi://GObject";

  export interface Rectangle {
    x: number;
    y: number;
    width: number;
    height: number;
  }

  export class Screen {
    static get_default(): Screen | null;
  }

  export class Display extends GObject.Object {
    static get_default(): Display | null;
    get_n_monitors(): number;
    get_monitor(index: number): Monitor | null;
    get_primary_monitor(): Monitor | null;
  }

  export class Monitor extends GObject.Object {
    get_geometry(): Rectangle;
    get_model(): string | null;
    get_manufacturer(): string | null;
    get_refresh_rate(): number;
    get_scale_factor(): number;
  }
}

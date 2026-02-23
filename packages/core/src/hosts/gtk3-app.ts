import Gtk from "gi://Gtk?version=3.0";
import Gdk from "gi://Gdk?version=3.0";
import Gio from "gi://Gio";
import type { AppProvider, AppOptions } from "../app-provider";
import { setAppProvider } from "../app-provider";
import { setCssEngine, createGtk3CssEngine } from "../css-engine";

let application: Gtk.Application | null = null;
let pendingCss: string[] = [];
let globalCssProvider: Gtk.CssProvider | null = null;
let currentCss = "";

export const gtk3AppProvider: AppProvider = {
  start(options: AppOptions): void {
    Gtk.init(null);

    const appId = `com.lumina.${options.instanceName ?? "app"}`.replace(/-/g, "_");

    const app = new Gtk.Application({
      application_id: appId,
      flags: Gio.ApplicationFlags.FLAGS_NONE,
    });

    application = app;

    app.connect("activate", () => {
      app.hold();

      const settings = Gtk.Settings.get_default();
      if (settings) {
        if (options.gtkTheme) {
          settings.gtk_theme_name = options.gtkTheme;
        }
        if (options.iconTheme) {
          settings.gtk_icon_theme_name = options.iconTheme;
        }
        if (options.cursorTheme) {
          settings.gtk_cursor_theme_name = options.cursorTheme;
        }
      }

      globalCssProvider = new Gtk.CssProvider();
      const screen = Gdk.Screen.get_default();
      if (screen) {
        Gtk.StyleContext.add_provider_for_screen(
          screen,
          globalCssProvider,
          Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION
        );
      }

      if (pendingCss.length > 0) {
        const combined = pendingCss.join("\n");
        this.applyCss(combined, false);
        pendingCss = [];
      }

      if (options.css) {
        this.applyCss(options.css, false);
      }

      options.main();
    });

    app.run(null);
  },

  getApp(): Gtk.Application | null {
    return application;
  },

  applyCss(css: string, reset: boolean = false): void {
    if (!globalCssProvider) {
      pendingCss.push(css);
      return;
    }

    try {
      if (reset) {
        currentCss = css;
      } else {
        currentCss += "\n" + css;
      }
      globalCssProvider.load_from_data(currentCss);
    } catch (e) {
      console.error("Failed to apply CSS:", e);
    }
  },

  quit(): void {
    application?.quit();
  },
};

// Auto-register on import
setAppProvider(gtk3AppProvider);
setCssEngine(createGtk3CssEngine((css) => gtk3AppProvider.applyCss(css, false)));

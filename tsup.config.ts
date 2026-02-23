import { defineConfig } from "tsup";
import { resolve } from "path";

export default defineConfig({
  entry: {
    bar: "apps/bar/app.tsx",
  },
  outDir: "dist",
  format: ["esm"],
  target: "es2022",
  platform: "neutral",
  bundle: true,
  splitting: false,
  sourcemap: false,
  clean: true,
  // Keep gi:// imports external (resolved by gjs at runtime)
  external: [/^gi:\/\//, /^resource:\/\//, "system", "gettext", "cairo"],
  // JSX configuration
  jsx: "automatic",
  jsxImportSource: "@lumina/core",
  // esbuild options
  esbuildOptions(options) {
    options.keepNames = true;
    options.banner = {
      js: `#!/usr/bin/env gjs -m
// Lumina - React + GJS + GTK Framework
`,
    };
  },
  // Resolve workspace packages
  esbuildPlugins: [
    {
      name: "workspace",
      setup(build) {
        build.onResolve({ filter: /^@lumina\// }, (args) => {
          const pkgName = args.path.replace("@lumina/", "");

          if (args.path === "@lumina/core/jsx-runtime") {
            return { path: resolve("packages/core/src/jsx-runtime.ts") };
          }

          return { path: resolve(`packages/${pkgName}/src/index.ts`) };
        });
      },
    },
  ],
});

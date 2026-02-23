#!/usr/bin/env node
import * as esbuild from "esbuild";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { existsSync, readFileSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");

// Get entry point from command line
const entry = process.argv[2];
const outfile = process.argv[3] || "dist/app.js";

if (!entry) {
  console.error("Usage: node scripts/build.mjs <entry.tsx> [outfile.js]");
  process.exit(1);
}

// GJS external imports - these are resolved at runtime by gjs
const gjsExternals = [
  "gi://*",
  "resource://*",
  "system",
  "gettext",
  "cairo",
];

// Plugin to handle gi:// imports
const gjsPlugin = {
  name: "gjs",
  setup(build) {
    // Mark gi:// imports as external
    build.onResolve({ filter: /^gi:\/\// }, (args) => {
      return { path: args.path, external: true };
    });

    // Mark resource:// imports as external
    build.onResolve({ filter: /^resource:\/\// }, (args) => {
      return { path: args.path, external: true };
    });

    // Mark system imports as external
    build.onResolve({ filter: /^(system|gettext|cairo)$/ }, (args) => {
      return { path: args.path, external: true };
    });
  },
};

// Plugin to resolve workspace packages
const workspacePlugin = {
  name: "workspace",
  setup(build) {
    // Resolve @lumina/* packages
    build.onResolve({ filter: /^@lumina\// }, (args) => {
      const pkgName = args.path.replace("@lumina/", "");
      const pkgPath = resolve(rootDir, "packages", pkgName, "src", "index.ts");

      if (existsSync(pkgPath)) {
        return { path: pkgPath };
      }

      // Try jsx-runtime
      if (args.path === "@lumina/core/jsx-runtime") {
        const jsxPath = resolve(rootDir, "packages/core/src/jsx-runtime.ts");
        if (existsSync(jsxPath)) {
          return { path: jsxPath };
        }
      }

      return null;
    });
  },
};

async function build() {
  try {
    const result = await esbuild.build({
      entryPoints: [entry],
      bundle: true,
      outfile,
      format: "esm",
      platform: "neutral",
      target: "es2022",
      jsx: "automatic",
      jsxImportSource: "@lumina/core",
      plugins: [gjsPlugin, workspacePlugin],
      external: gjsExternals,
      sourcemap: false,
      minify: false,
      // Keep names for debugging
      keepNames: true,
      // Banner with gjs shebang
      banner: {
        js: `#!/usr/bin/env gjs -m
// Lumina - React + GJS + GTK Framework
// Built with esbuild
`,
      },
    });

    console.log(`✓ Built ${outfile}`);

    if (result.warnings.length > 0) {
      console.warn("Warnings:", result.warnings);
    }
  } catch (error) {
    console.error("Build failed:", error);
    process.exit(1);
  }
}

build();

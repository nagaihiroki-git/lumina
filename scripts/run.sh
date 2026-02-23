#!/usr/bin/env bash
# Lumina runner - runs bundled JS with gjs

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Find gjs (prefer system gjs, fallback to nix store for NixOS)
if command -v gjs &> /dev/null; then
    GJS="gjs"
else
    # NixOS fallback
    GJS="${LUMINA_GJS:-/nix/store/xg5v65f4x59w3dnpv2dah0wr9qkmhjih-gjs-1.86.0/bin/gjs}"
fi

# GI_TYPELIB_PATH: use system default if available, or set for NixOS
# Most distros set this automatically. NixOS needs explicit paths.
if [ -z "$GI_TYPELIB_PATH" ]; then
    # Check common system paths
    SYSTEM_TYPELIB="/usr/lib/girepository-1.0:/usr/lib64/girepository-1.0"
    if [ -d "/usr/lib/girepository-1.0" ] || [ -d "/usr/lib64/girepository-1.0" ]; then
        export GI_TYPELIB_PATH="$SYSTEM_TYPELIB"
    else
        # NixOS: use paths from AGS wrapper
        export GI_TYPELIB_PATH="/nix/store/fgzpllmvbk3l258j0f3ib7k44lksbqnp-glib-2.86.3/lib/girepository-1.0:/nix/store/izs6bs8fflbyg7djv7p1c753jyinxvx3-gdk-pixbuf-2.44.4/lib/girepository-1.0:/nix/store/njkxckivma0x8j25pkm990z0vi0v4wdc-at-spi2-core-2.58.2/lib/girepository-1.0:/nix/store/vcxhs9a9ywm72vcxci2rfjgrmqw32mdl-harfbuzz-12.3.0/lib/girepository-1.0:/nix/store/pv79l02aklsd6sjh9wxrs9ip3k0a5rln-pango-1.57.0/lib/girepository-1.0:/nix/store/cg89xd93ldyjwxjw05zzpgs1yr3nzj9c-gtk+3-3.24.51/lib/girepository-1.0:/nix/store/1rpz7d45m98k1hdrxjy7p9ip0yqfzklv-gobject-introspection-1.86.0/lib/girepository-1.0:/nix/store/vl6dycidnqfy52gmd64nz1idxcillklk-gtk-layer-shell-0.10.0/lib/girepository-1.0:/nix/store/mzamkswqv7dwd17hcgbws25c266dyjb0-gobject-introspection-wrapped-1.86.0/lib/girepository-1.0"
        export GDK_PIXBUF_MODULE_FILE="/nix/store/cpfmyd7q4v4vz3b02x1c8ym2303xw6ll-librsvg-2.61.3/lib/gdk-pixbuf-2.0/2.10.0/loaders.cache"
    fi
fi

# Entry file
ENTRY="${1:-$ROOT_DIR/dist/bar.js}"

if [ ! -f "$ENTRY" ]; then
    echo "Error: $ENTRY not found"
    echo "Run: npm run build"
    exit 1
fi

exec "$GJS" -m "$ENTRY"

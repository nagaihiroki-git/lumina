{
  description = "Lumina - React-style FRP framework for GTK desktop widgets";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs }: let
    system = "x86_64-linux";
    pkgs = nixpkgs.legacyPackages.${system};
  in {
    devShells.${system}.default = pkgs.mkShell {
      buildInputs = with pkgs; [
        # Runtime dependencies
        gjs
        gtk3
        gtk-layer-shell
        glib

        # Build tools
        nodejs
        typescript
      ];

      shellHook = ''
        echo "╔═══════════════════════════════════════╗"
        echo "║   Lumina Development Shell            ║"
        echo "╠═══════════════════════════════════════╣"
        echo "║ npm install     Install dependencies  ║"
        echo "║ npm run build   Build project         ║"
        echo "║ npm run start   Run bar widget        ║"
        echo "║ npm run dev     Watch mode            ║"
        echo "╚═══════════════════════════════════════╝"
      '';
    };
  };
}

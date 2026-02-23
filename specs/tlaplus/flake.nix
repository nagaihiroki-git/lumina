{
  description = "TLA+ development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            # TLA+ Tools (TLC model checker, PlusCal translator, etc.)
            tlaplus

            # TLA+ Toolbox IDE (optional - GUI)
            tlaplusToolbox

            # TLA+ Proof System (optional - for formal proofs)
            # tlaps

            # Java runtime (required for TLA+ tools)
            openjdk

            # Useful utilities
            graphviz  # For state graph visualization
          ];

          shellHook = ''
            echo "TLA+ Development Environment"
            echo ""
            echo "Available tools:"
            echo "  tlc        - TLC model checker"
            echo "  pcal       - PlusCal translator"
            echo "  tlasany    - TLA+ syntax checker"
            echo "  tlatex     - TLA+ to LaTeX converter"
            echo "  toolbox    - TLA+ Toolbox IDE (GUI)"
            echo ""
            echo "Quick start:"
            echo "  1. Create a .tla file"
            echo "  2. Run: tlc -config Spec.cfg Spec.tla"
            echo ""
          '';
        };
      }
    );
}

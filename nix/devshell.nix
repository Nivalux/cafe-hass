{ pkgs }:

let
  biome = pkgs.writeShellScriptBin "biome" ''
    root=$(git rev-parse --show-toplevel 2>/dev/null || echo "$PWD")
    binary="$root/node_modules/@biomejs/cli-linux-x64/biome"
    if [ ! -x "$binary" ]; then
      echo "biome: $binary is missing, run 'just install' first" >&2
      exit 1
    fi
    exec ${pkgs.glibc}/lib/ld-linux-x86-64.so.2 --library-path ${pkgs.glibc}/lib "$binary" "$@"
  '';
in
pkgs.mkShellNoCC {
  packages = [
    biome
    pkgs.git
    pkgs.just
    pkgs.nodejs_24
    pkgs.podman
    pkgs.python3
  ];

  shellHook = ''
    echo "C.A.F.E. dev shell: run 'just --list' to see the tasks"
  '';
}

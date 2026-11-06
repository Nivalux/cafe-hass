{ pkgs ? import <nixpkgs> { } }:

import ./nix/devshell.nix { inherit pkgs; }

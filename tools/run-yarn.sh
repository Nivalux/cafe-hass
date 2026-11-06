#!/bin/sh
set -eu

if command -v yarn >/dev/null 2>&1; then
  exec yarn "$@"
fi

exec corepack yarn "$@"

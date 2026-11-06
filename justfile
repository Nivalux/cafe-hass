# C.A.F.E. development tasks: run `just` for the list.
#
# In the Nix dev shell (`nix-shell`, no tracked inputs):
#   just install && just check

ha_image := "ghcr.io/home-assistant/home-assistant:latest"
ha_name := "cafe-ha-validation"
ha_port := "8123"
ha_data := env_var_or_default("HOME", "/tmp") + "/.cache/cafe-ha-validation"
yarn := "./tools/run-yarn.sh"

_default:
    @just --list

# Install dependencies
install:
    {{ yarn }} install

# Build every package
build:
    {{ yarn }} build

# Watch mode
dev:
    {{ yarn }} dev

# Unit tests
test:
    {{ yarn }} test --run

# Type checking
typecheck:
    {{ yarn }} typecheck

# Lint with biome
lint: (_biome "lint .")

# Format with biome
format: (_biome "format --write .")

# Everything CI runs
check: typecheck lint test

alias test-ha := test-podman

# Validate the transpiled YAML against the real Home Assistant container image
# (podman, or docker when podman is absent).
#
# Always refreshes :latest and refuses an image older than the current release.
# Override the image with CAFE_HA_IMAGE.
test-podman:
    #!/usr/bin/env bash
    set -euo pipefail
    {{ yarn }} install
    {{ yarn }} build
    CAFE_HA_IMAGE={{ ha_image }} ./tools/ha-validation/run.sh

# Start a throwaway Home Assistant to click through the editor yourself
ha-up:
    #!/usr/bin/env bash
    set -euo pipefail
    mkdir -p {{ ha_data }}
    {{ yarn }} build:ha
    podman rm -f {{ ha_name }} >/dev/null 2>&1 || true
    podman run -d --name {{ ha_name }} -p {{ ha_port }}:8123 \
        -v "{{ ha_data }}:/config" {{ ha_image }}
    echo "Home Assistant: http://localhost:{{ ha_port }} (C.A.F.E. panel after onboarding)"

# Show the logs of the throwaway Home Assistant
ha-logs:
    podman logs -f {{ ha_name }}

# Stop and remove the throwaway Home Assistant
ha-down:
    podman rm -f {{ ha_name }}

# Remove build output and dependencies
clean:
    rm -rf node_modules packages/*/dist packages/*/.turbo .turbo

_biome args:
    #!/usr/bin/env bash
    set -euo pipefail
    if command -v biome >/dev/null 2>&1; then
        exec biome {{ args }}
    fi
    if ./node_modules/@biomejs/cli-linux-x64/biome --version >/dev/null 2>&1; then
        exec ./node_modules/@biomejs/cli-linux-x64/biome {{ args }}
    fi
    echo "the bundled biome binary does not run here, using a container instead"
    podman run --rm -v "$PWD:/w" -w /w docker.io/library/debian:trixie \
        ./node_modules/@biomejs/cli-linux-x64/biome {{ args }}

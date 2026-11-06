#!/usr/bin/env bash
# Transpile the fixtures in tools/ha-validation/emit.ts and validate them with
# Home Assistant's own validator inside the official container.
#
# The image defaults to :latest and is always refreshed, then checked against the
# newest stable Home Assistant release so an outdated :latest cannot pass silently.
set -euo pipefail

image="${CAFE_HA_IMAGE:-ghcr.io/home-assistant/home-assistant:latest}"
max_release_age_days="${CAFE_HA_MAX_RELEASE_AGE_DAYS:-45}"

root=$(cd "$(dirname "$0")/../.." && pwd)
cd "$root"

if command -v podman >/dev/null 2>&1 && podman info >/dev/null 2>&1; then
  runtime=podman
elif command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  runtime=docker
else
  echo "neither podman nor docker is usable here" >&2
  exit 1
fi

$runtime pull --platform linux/amd64 "$image"

allowed_majors=$(python3 tools/ha-validation/current-release.py "$max_release_age_days")
image_version=$($runtime run --rm --platform linux/amd64 --entrypoint python "$image" \
  -c 'from homeassistant.const import __version__; print(__version__)')
image_major="${image_version%.*}"

case " $allowed_majors " in
  *" $image_major "*) ;;
  *)
    echo "$image is Home Assistant $image_version, expected one of: $allowed_majors" >&2
    echo "an outdated image validates a Home Assistant that no longer ships" >&2
    exit 1
    ;;
esac

if [ "$image_major" != "${allowed_majors%% *}" ]; then
  echo "warning: $image is Home Assistant $image_version, the newest release is ${allowed_majors%% *}" >&2
fi

echo "validating against Home Assistant $image_version"

dir=$(mktemp -d)
trap 'rm -rf "$dir"' EXIT

node_modules/.bin/vite-node tools/ha-validation/emit.ts "$dir"

$runtime run --rm --platform linux/amd64 \
  -v "$root/tools/ha-validation/validate.py:/opt/validate.py:ro" \
  -v "$dir:/work:ro" \
  --entrypoint python "$image" /opt/validate.py

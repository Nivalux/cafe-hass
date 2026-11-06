"""Validate C.A.F.E. generated automations with Home Assistant's own validator.

Runs inside the official Home Assistant container:
    podman run --rm -v <fixtures>:/work:ro --entrypoint python <image> /opt/validate.py
"""

import asyncio
import glob
import os
import sys

import homeassistant.loader as loader
import yaml
from homeassistant.components.automation.config import _async_validate_config_item
from homeassistant.core import HomeAssistant
from homeassistant.helpers import trigger as trigger_helper


async def main():
    hass = HomeAssistant("/tmp/cafe-ha-validation")
    loader.async_setup(hass)
    await trigger_helper.async_setup(hass)

    failed = False
    for path in sorted(glob.glob("/work/*.yaml")):
        name = os.path.basename(path)
        expect_invalid = name.startswith("must-fail-")
        error = None
        try:
            with open(path) as handle:
                config = yaml.safe_load(handle)
            await _async_validate_config_item(hass, config, True, False)
        except Exception as err:  # noqa: BLE001
            error = err

        good = (error is None) != expect_invalid
        failed = failed or not good
        kind = " (must be rejected)" if expect_invalid else ""
        if good:
            print(f"OK   {name}{kind}")
        else:
            detail = f"{type(error).__name__}: {error}" if error else "validated cleanly"
            print(f"FAIL {name}{kind} -> {detail}")

    sys.exit(1 if failed else 0)


asyncio.run(main())

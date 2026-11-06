"""Print the Home Assistant release majors the validation is allowed to run against.

Guards against a stale `:latest` image: the newest stable release is read from the
GitHub API and refused when it is older than the given amount of days, which would
mean the reference itself is broken.
"""

import datetime
import json
import sys
import urllib.request

max_age_days = int(sys.argv[1]) if len(sys.argv) > 1 else 45

request = urllib.request.Request(
    "https://api.github.com/repos/home-assistant/core/releases/latest",
    headers={"User-Agent": "cafe-ha-validation", "Accept": "application/vnd.github+json"},
)
with urllib.request.urlopen(request, timeout=30) as response:
    release = json.load(response)

tag = release["tag_name"].lstrip("v")
published = datetime.datetime.fromisoformat(release["published_at"].replace("Z", "+00:00"))
age_days = (datetime.datetime.now(datetime.timezone.utc) - published).days

if age_days > max_age_days:
    print(
        f"newest Home Assistant release {tag} is {age_days} days old, "
        f"refusing to treat it as current (limit {max_age_days} days)",
        file=sys.stderr,
    )
    sys.exit(1)

year, month, _patch = tag.split(".")
current = f"{year}.{month}"
previous_year, previous_month = (int(year) - 1, 12) if int(month) == 1 else (int(year), int(month) - 1)

print(f"{current} {previous_year}.{previous_month}")

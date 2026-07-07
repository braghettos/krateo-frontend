#!/usr/bin/env python3
"""Regenerate the `config` block of chart/values.schema.json FROM chart/values.yaml.

WHY: the krateo installer applies the values.schema.json *defaults* when it deploys a
component, so the schema — not values.yaml — is the effective source of truth for the
rendered ConfigMap. If the two drift (e.g. a stale `INIT` route), the cluster gets the
schema's value and the portal breaks. This script makes `config` a derived artifact:
its `properties` and `default` are generated verbatim from values.yaml's `config:` block.

USAGE: `python3 scripts/gen-config-schema.py`. In CI, run it then `git diff --exit-code
chart/values.schema.json` — a non-empty diff means the schema drifted from values.yaml.
"""
import json
import pathlib

import yaml

ROOT = pathlib.Path(__file__).resolve().parents[1]
CHART = ROOT / "chart"

values = yaml.safe_load((CHART / "values.yaml").read_text()) or {}
schema = json.loads((CHART / "values.schema.json").read_text())

config = values.get("config", {}) or {}
existing = schema["properties"]["config"].get("properties", {})


def title_for(key: str) -> str:
    """Preserve an existing hand-written title; otherwise derive one from the key."""
    if key in existing and existing[key].get("title"):
        return existing[key]["title"]
    words = []
    for word in key.split("_"):
        words.append(word if word in ("API", "URL") else word.capitalize())
    return " ".join(words).replace("Base", "base")


def json_type(value: object) -> str:
    """JSON-Schema type inferred from the values.yaml scalar. bool is checked BEFORE int
    (bool is an int subclass in Python), so a capability flag like SNOWPLOW_IDENTITY_INJECTION
    renders `type: boolean` — the ConfigMap template then emits a real JSON boolean and the
    frontend reads it as one. Everything else (URLs, routes) stays `string`."""
    if isinstance(value, bool):
        return "boolean"
    if isinstance(value, int):
        return "integer"
    if isinstance(value, float):
        return "number"
    return "string"


schema["properties"]["config"]["properties"] = {
    key: {"type": json_type(value), "title": title_for(key), "default": value}
    for key, value in config.items()
}
schema["properties"]["config"]["default"] = dict(config)

(CHART / "values.schema.json").write_text(json.dumps(schema, indent=2) + "\n")
print("regenerated config schema from values.yaml:", list(config.keys()))

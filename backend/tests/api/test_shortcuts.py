import re
from pathlib import Path
import pytest
from src.api.routes.shortcuts import DEFAULTS


def test_shortcuts_drift_guard_against_frontend():
    # Locate frontend shortcutDefaults.ts relative to tests/api directory
    frontend_path = (
        Path(__file__).parents[3]
        / "frontend"
        / "src"
        / "utils"
        / "shortcutDefaults.ts"
    )

    if not frontend_path.exists():
        pytest.skip(f"Frontend shortcut defaults file not found at {frontend_path}")

    content = frontend_path.read_text(encoding="utf-8")

    # Extract keys inside ACTION_KEYS or DEFAULT_SHORTCUTS object definitions
    parsed_keys = set(re.findall(r"([a-zA-Z0-9_]+)\s*:\s*\{", content))

    if not parsed_keys:
        parsed_keys = set(re.findall(r"['\"]([a-zA-Z0-9_]+)['\"]\s*:", content))

    # Filter out metadata attributes and retain only shortcut action keys
    shortcut_keys = {
        k for k in parsed_keys
        if k.startswith(("go_", "create_", "open_", "focus_", "save_", "new_"))
    }

    # Fallback sanity checks if no keys were parsed
    assert "go_tax_ledger" in DEFAULTS, "go_tax_ledger should be present in backend DEFAULTS"
    assert "go_inventory" not in DEFAULTS, "go_inventory should be removed from backend DEFAULTS"

    if shortcut_keys:
        assert set(DEFAULTS.keys()) == shortcut_keys
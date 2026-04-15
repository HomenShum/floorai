from __future__ import annotations

import os
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = PROJECT_ROOT / "data"
EVAL_RESULTS_DIR = PROJECT_ROOT / "eval_results"
MODEL_NAME = os.getenv("RETAIL_OPS_MODEL", "gemini-3.1-pro-preview")
SKILLS_PATH = ".deepagents/skills/"


def google_api_key() -> str | None:
    return os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")

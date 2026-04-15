from __future__ import annotations

import csv
import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from .config import DATA_DIR


def _read_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


@lru_cache(maxsize=1)
def load_issues() -> list[dict[str, Any]]:
    issues_path = DATA_DIR / "synthetic_issues.csv"
    with issues_path.open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


@lru_cache(maxsize=1)
def load_policies() -> list[dict[str, Any]]:
    return _read_json(DATA_DIR / "policies.json")


@lru_cache(maxsize=1)
def load_goldens() -> list[dict[str, Any]]:
    primary = DATA_DIR / "golden_dataset.json"
    if primary.exists():
        cases = _read_json(primary)
        return [
            {
                "case_id": case["id"],
                "prompt": case["query"],
                "preferred_response": case["preferred_response"],
                "must_include": case["required_references"],
                "criteria": case.get("criteria", {}),
                "role": case.get("role"),
                "storeId": case.get("storeId"),
                "regionId": case.get("regionId"),
            }
            for case in cases
        ]
    return _read_json(DATA_DIR / "synthetic_preferred_responses.json")


def normalize_text(value: str) -> str:
    return " ".join(value.lower().split())


def get_issue(issue_id: str) -> dict[str, Any] | None:
    for issue in load_issues():
        if issue["issue_id"] == issue_id:
            return issue
    return None


def search_issues(
    *,
    store_id: str | None = None,
    region_id: str | None = None,
    issue_type: str | None = None,
    severity: str | None = None,
    status: str | None = None,
    keyword: str | None = None,
    limit: int = 10,
) -> list[dict[str, Any]]:
    items = load_issues()

    def matches(issue: dict[str, Any]) -> bool:
        haystack = normalize_text(
            " ".join(
                [
                    issue.get("title", ""),
                    issue.get("description", ""),
                    issue.get("issue_type", ""),
                    issue.get("category", ""),
                    issue.get("related_policy", ""),
                    issue.get("affected_sku", ""),
                ]
            )
        )
        return (
            (store_id is None or issue.get("store_id") == store_id)
            and (region_id is None or issue.get("region_id") == region_id)
            and (issue_type is None or issue.get("issue_type") == issue_type)
            and (severity is None or issue.get("severity") == severity)
            and (status is None or issue.get("status") == status)
            and (keyword is None or normalize_text(keyword) in haystack)
        )

    return [issue for issue in items if matches(issue)][:limit]


def lookup_policy(*, policy_id: str | None = None, keyword: str | None = None) -> list[dict[str, Any]]:
    policies = load_policies()
    if policy_id:
        return [policy for policy in policies if policy["policy_id"] == policy_id]
    if keyword:
        needle = normalize_text(keyword)
        return [
            policy
            for policy in policies
            if needle in normalize_text(
                " ".join(
                    [
                        policy.get("policy_id", ""),
                        policy.get("title", ""),
                        policy.get("category", ""),
                        policy.get("content", ""),
                    ]
                )
            )
        ]
    return policies


def build_store_directory() -> list[dict[str, str]]:
    seen: dict[str, dict[str, str]] = {}
    for issue in load_issues():
        store_id = issue["store_id"]
        if store_id == "STR-ALL":
            continue
        seen.setdefault(
            store_id,
            {
                "store_id": store_id,
                "store_name": issue["store_name"],
                "region_id": issue["region_id"],
                "region_name": issue["region_name"],
            },
        )
    return list(seen.values())


def build_region_summary(region_id: str) -> dict[str, Any]:
    issues = [issue for issue in load_issues() if issue["region_id"] == region_id]
    by_severity: dict[str, int] = {}
    by_type: dict[str, int] = {}
    escalated = 0
    vendor_patterns: dict[str, int] = {}

    for issue in issues:
        severity = issue["severity"]
        issue_type = issue["issue_type"]
        by_severity[severity] = by_severity.get(severity, 0) + 1
        by_type[issue_type] = by_type.get(issue_type, 0) + 1
        if issue["escalated_to_regional"].lower() == "yes":
            escalated += 1
        if "dairyfresh" in normalize_text(issue["description"]):
            vendor_patterns["DairyFresh Co"] = vendor_patterns.get("DairyFresh Co", 0) + 1

    return {
        "region_id": region_id,
        "issue_count": len(issues),
        "by_severity": by_severity,
        "by_issue_type": by_type,
        "escalated_count": escalated,
        "vendor_patterns": vendor_patterns,
    }

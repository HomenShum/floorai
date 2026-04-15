from __future__ import annotations

from typing import Any

from langchain_core.tools import tool

from .data_loader import (
    build_region_summary,
    build_store_directory,
    get_issue,
    lookup_policy,
    search_issues,
)


@tool
def get_issue_by_id(issue_id: str) -> dict[str, Any]:
    """Return a single issue by issue ID, including store, severity, policy, and description."""
    issue = get_issue(issue_id)
    if issue is None:
        return {"error": f"Issue {issue_id} was not found."}
    return issue


@tool
def search_issue_log(
    store_id: str | None = None,
    region_id: str | None = None,
    issue_type: str | None = None,
    severity: str | None = None,
    status: str | None = None,
    keyword: str | None = None,
    limit: int = 10,
) -> list[dict[str, Any]]:
    """Search the synthetic issue log by store, region, type, severity, status, or keyword."""
    return search_issues(
        store_id=store_id,
        region_id=region_id,
        issue_type=issue_type,
        severity=severity,
        status=status,
        keyword=keyword,
        limit=limit,
    )


@tool
def lookup_policy_reference(policy_id: str | None = None, keyword: str | None = None) -> list[dict[str, Any]]:
    """Look up a policy by exact policy ID or keyword for policy-grounded guidance."""
    return lookup_policy(policy_id=policy_id, keyword=keyword)


@tool
def get_region_summary(region_id: str) -> dict[str, Any]:
    """Summarize issue counts and systemic patterns for a region."""
    return build_region_summary(region_id)


@tool
def get_store_directory(region_id: str | None = None) -> list[dict[str, str]]:
    """Return store directory information for the synthetic dataset."""
    stores = build_store_directory()
    if region_id is None:
        return stores
    return [store for store in stores if store["region_id"] == region_id]


RETAIL_OPS_TOOLS = [
    get_issue_by_id,
    search_issue_log,
    lookup_policy_reference,
    get_region_summary,
    get_store_directory,
]

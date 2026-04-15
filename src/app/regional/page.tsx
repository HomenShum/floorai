"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";

import { api } from "../../../convex/_generated/api";
import { ActionItemsPanel } from "@/components/ActionItemsPanel";
import { ChatPanel } from "@/components/ChatPanel";
import { IssueCard } from "@/components/IssueCard";
import { RecentActivityPanel } from "@/components/RecentActivityPanel";
import { useOperatorSession } from "@/components/OperatorSessionProvider";

const REGION_ID = "REG-NE";
type RegionalView = "overview" | "intervene" | "queue";

export default function RegionalPage() {
  return (
    <Suspense fallback={<div className="app-shell"><div className="app-frame"><p className="py-6 text-center text-sm text-gray-400">Loading...</p></div></div>}>
      <RegionalPageInner />
    </Suspense>
  );
}

function RegionalPageInner() {
  const { operator } = useOperatorSession();
  const searchParams = useSearchParams();
  const operatorProfile = useQuery(
    api.users.getById,
    operator?.operatorId ? { operatorId: operator.operatorId } : "skip"
  );
  const hasRegionAccess =
    operatorProfile?.role === "regional_manager" &&
    operatorProfile.regionIds.includes(REGION_ID);

  const [activeView, setActiveView] = useState<RegionalView>("overview");
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [storeFilter, setStoreFilter] = useState("all");
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);

  // Read store from URL params on mount
  useEffect(() => {
    const storeParam = searchParams.get("store");
    if (storeParam) {
      setStoreFilter(storeParam);
    }
  }, [searchParams]);

  const stores = useQuery(
    api.stores.getAll,
    hasRegionAccess && operator ? { operatorId: operator.operatorId } : "skip"
  );
  const issues = useQuery(
    api.issues.getAll,
    hasRegionAccess && operator ? { operatorId: operator.operatorId } : "skip"
  );
  const issueAttachments = useQuery(
    api.files.listByIssueIds,
    hasRegionAccess && operator
      ? {
          operatorId: operator.operatorId,
          issueIds: issues?.map((issue: any) => issue.issueId) ?? [],
          regionId: REGION_ID,
        }
      : "skip"
  );
  const summary = useQuery(
    api.operations.getRegionalSummary,
    hasRegionAccess && operator
      ? { operatorId: operator.operatorId, regionId: REGION_ID }
      : "skip"
  );
  const regionalActionItems = useQuery(
    api.actionItems.list,
    hasRegionAccess && operator
      ? {
          operatorId: operator.operatorId,
          regionId: REGION_ID,
        }
      : "skip"
  );
  const updateIssueStatus = useMutation(api.issues.updateStatus);
  const escalateIssue = useMutation(api.issues.escalate);

  const openIssues = issues?.filter((issue: any) => issue.status !== "resolved") || [];
  const filteredIssues = useMemo(() => {
    const base = issues ?? [];
    return base.filter((issue: any) => {
      if (statusFilter !== "all" && issue.status !== statusFilter) {
        return false;
      }
      if (severityFilter !== "all" && issue.severity !== severityFilter) {
        return false;
      }
      if (storeFilter !== "all") {
        if (storeFilter === "regional") {
          return issue.storeId === "STR-ALL";
        }
        return issue.storeId === storeFilter;
      }
      return true;
    });
  }, [issues, severityFilter, statusFilter, storeFilter]);

  const attachmentsByIssue = (issueAttachments ?? []).reduce(
    (acc: Record<string, any[]>, file: any) => {
      if (!file.issueId) return acc;
      acc[file.issueId] = [...(acc[file.issueId] ?? []), file];
      return acc;
    },
    {}
  );

  const criticalCount = openIssues.filter((issue: any) => issue.severity === "critical").length;
  const escalatedCount = openIssues.filter((issue: any) => issue.escalatedToRegional).length;
  const totalImpact = openIssues.reduce(
    (sum: number, issue: any) => sum + issue.estimatedRevenueImpact,
    0
  );
  const topPattern = summary
    ? Object.entries(summary.issueTypeCounts || {}).sort((a: any, b: any) => b[1] - a[1])[0]
    : null;

  const topInterventions = [...openIssues]
    .sort((a: any, b: any) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      return (
        (order[a.severity as keyof typeof order] ?? 4) -
        (order[b.severity as keyof typeof order] ?? 4)
      );
    })
    .slice(0, 3);

  const hotStores = (stores ?? [])
    .map((store: any) => {
      const storeIssues = openIssues.filter((issue: any) => issue.storeId === store.storeId);
      const criticals = storeIssues.filter((issue: any) => issue.severity === "critical").length;
      const impact = storeIssues.reduce(
        (sum: number, issue: any) => sum + issue.estimatedRevenueImpact,
        0
      );
      return {
        ...store,
        issueCount: storeIssues.length,
        criticals,
        impact,
      };
    })
    .sort((a: any, b: any) => b.criticals - a.criticals || b.issueCount - a.issueCount || b.impact - a.impact)
    .slice(0, 4);

  const selectedIssue = selectedIssueId
    ? (issues ?? []).find((issue: any) => issue.issueId === selectedIssueId)
    : null;
  const issueContext = useMemo(
    () =>
      selectedIssue
        ? { issueId: selectedIssue.issueId, title: selectedIssue.title, description: selectedIssue.description }
        : undefined,
    [selectedIssue?.issueId, selectedIssue?.title, selectedIssue?.description]
  );

  const nextAction = (regionalActionItems ?? []).find((item: any) => item.status !== "completed");
  const commandBrief = buildRegionalBrief({
    openIssueCount: openIssues.length,
    criticalCount,
    escalatedCount,
    topPattern,
    nextAction,
  });

  if (!operator) {
    return (
      <WorkspaceAccessState
        title="Regional operations command"
        message="Select a regional manager session from home before entering this workspace."
      />
    );
  }

  if (operatorProfile === undefined) {
    return (
      <WorkspaceAccessState
        title="Regional operations command"
        message="Loading operator session..."
      />
    );
  }

  if (!hasRegionAccess) {
    return (
      <WorkspaceAccessState
        title="Regional operations command"
        message="This workspace is only available to regional manager sessions with region access."
      />
    );
  }

  return (
    <div className="app-shell">
      <div className="app-frame flex flex-col gap-0">
        {/* ── Header bar ──────────────────────────────────── */}
        <header className="flex items-center justify-between border-b border-gray-200 pb-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">
              &larr;
            </Link>
            <h1 className="text-sm font-semibold text-gray-900">Northeast Region</h1>
            <span className="rounded bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">{REGION_ID}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
              {openIssues.length} open
            </span>
            {criticalCount > 0 && (
              <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
                {criticalCount} critical
              </span>
            )}
            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
              {escalatedCount} escalated
            </span>
            <span className="hidden text-xs text-gray-400 sm:inline">
              {operatorProfile.name}
            </span>
          </div>
        </header>

        {/* ── Tab bar ─────────────────────────────────────── */}
        <nav className="flex gap-4 border-b border-gray-200 pt-2">
          <TabButton active={activeView === "overview"} label="Overview" onClick={() => setActiveView("overview")} />
          <TabButton active={activeView === "intervene"} label="Intervene" onClick={() => setActiveView("intervene")} />
          <TabButton active={activeView === "queue"} label="Queue" onClick={() => setActiveView("queue")} />
        </nav>

        {/* ── Two-column body ─────────────────────────────── */}
        <div className="mt-4 flex gap-5">
          {/* LEFT COLUMN */}
          <div className="min-w-0 flex-1 space-y-4">
            {activeView === "overview" && (
              <>
                {/* Metric row */}
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <MetricBadge label="Open" value={summary?.openIssueCount ?? openIssues.length} />
                  <MetricBadge label="Critical" value={summary?.criticalIssueCount ?? criticalCount} />
                  <MetricBadge label="Escalated" value={summary?.escalatedIssueCount ?? escalatedCount} />
                  <MetricBadge label="At risk" value={`$${((summary?.estimatedRevenueImpact ?? totalImpact) || 0).toLocaleString()}`} />
                </div>

                {/* Store chips — horizontal scroll */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  <button
                    type="button"
                    onClick={() => setStoreFilter("all")}
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition ${
                      storeFilter === "all"
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    All stores
                  </button>
                  {(stores ?? []).map((s: any) => (
                    <button
                      key={s.storeId}
                      type="button"
                      onClick={() => setStoreFilter(s.storeId)}
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition ${
                        storeFilter === s.storeId
                          ? "bg-gray-900 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {s.storeId}
                    </button>
                  ))}
                </div>

                {/* Hot stores */}
                {hotStores.length > 0 && (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    {hotStores.map((s: any) => (
                      <button
                        key={s.storeId}
                        type="button"
                        onClick={() => setStoreFilter(s.storeId)}
                        className="rounded-lg border border-gray-200 bg-white p-3 text-left transition hover:border-gray-300"
                      >
                        <p className="text-sm font-medium text-gray-900">{s.name}</p>
                        <p className="text-[11px] text-gray-400">{s.managerName}</p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">{s.issueCount} open</span>
                          {s.criticals > 0 && (
                            <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] text-red-700">{s.criticals} crit</span>
                          )}
                          <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-700">${s.impact.toLocaleString()}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Issue list with inline filters */}
                <div>
                  <div className="flex items-center gap-2 pb-2">
                    <select
                      name="regionalIssueStatusFilter"
                      value={statusFilter}
                      onChange={(event) => setStatusFilter(event.target.value)}
                      className="rounded border border-gray-200 bg-white px-2 py-1 text-xs outline-none"
                    >
                      <option value="all">All statuses</option>
                      <option value="open">Open</option>
                      <option value="in_progress">In progress</option>
                      <option value="resolved">Resolved</option>
                    </select>
                    <select
                      name="regionalIssueSeverityFilter"
                      value={severityFilter}
                      onChange={(event) => setSeverityFilter(event.target.value)}
                      className="rounded border border-gray-200 bg-white px-2 py-1 text-xs outline-none"
                    >
                      <option value="all">All severities</option>
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                    <span className="ml-auto text-xs text-gray-400">{filteredIssues.length} shown</span>
                  </div>

                  {!issues ? (
                    <p className="py-6 text-center text-sm text-gray-400">Loading issues...</p>
                  ) : filteredIssues.length === 0 ? (
                    <p className="py-6 text-center text-sm text-gray-400">No issues match current filters.</p>
                  ) : (
                    <div className="max-h-[600px] space-y-3 overflow-y-auto pr-1">
                      {filteredIssues
                        .sort((a: any, b: any) => {
                          const order = { critical: 0, high: 1, medium: 2, low: 3 };
                          return (
                            (order[a.severity as keyof typeof order] ?? 4) -
                            (order[b.severity as keyof typeof order] ?? 4)
                          );
                        })
                        .map((issue: any) => (
                          <IssueCard
                            key={issue._id}
                            issue={issue}
                            attachments={attachmentsByIssue[issue.issueId] ?? []}
                            showStore
                            onSelect={setSelectedIssueId}
                            isSelected={selectedIssueId === issue.issueId}
                            onResolve={(issueId) =>
                              updateIssueStatus({
                                operatorId: operator.operatorId,
                                issueId,
                                status: "resolved",
                                resolutionNotes: "Resolved from regional command workspace.",
                              })
                            }
                            onEscalate={(issueId) =>
                              escalateIssue({
                                operatorId: operator.operatorId,
                                issueId,
                              })
                            }
                          />
                        ))}
                    </div>
                  )}
                </div>

                <ActionItemsPanel operatorId={operator.operatorId} title="Action items" regionId={REGION_ID} />
                <RecentActivityPanel operatorId={operator.operatorId} regionId={REGION_ID} title="Activity" />
              </>
            )}

            {activeView === "intervene" && (
              <>
                {/* Top interventions — sorted issue list */}
                <div className="space-y-3">
                  {topInterventions.length === 0 ? (
                    <p className="py-6 text-center text-sm text-gray-400">No active cases requiring intervention.</p>
                  ) : (
                    topInterventions.map((issue: any) => (
                      <IssueCard
                        key={issue._id}
                        issue={issue}
                        attachments={attachmentsByIssue[issue.issueId] ?? []}
                        showStore
                        onSelect={setSelectedIssueId}
                        isSelected={selectedIssueId === issue.issueId}
                        onResolve={(issueId) =>
                          updateIssueStatus({
                            operatorId: operator.operatorId,
                            issueId,
                            status: "resolved",
                            resolutionNotes: "Resolved from regional command workspace.",
                          })
                        }
                        onEscalate={(issueId) =>
                          escalateIssue({
                            operatorId: operator.operatorId,
                            issueId,
                          })
                        }
                      />
                    ))
                  )}
                </div>
                <ActionItemsPanel operatorId={operator.operatorId} title="Action items" regionId={REGION_ID} />
              </>
            )}

            {activeView === "queue" && (
              <>
                <div>
                  <div className="flex items-center gap-2 pb-2">
                    <select
                      name="regionalIssueStoreFilter"
                      value={storeFilter}
                      onChange={(event) => setStoreFilter(event.target.value)}
                      className="rounded border border-gray-200 bg-white px-2 py-1 text-xs outline-none"
                    >
                      <option value="all">All stores</option>
                      <option value="regional">Regional-only</option>
                      {stores?.map((s: any) => (
                        <option key={s.storeId} value={s.storeId}>
                          {s.storeId}
                        </option>
                      ))}
                    </select>
                    <select
                      name="regionalIssueStatusFilter"
                      value={statusFilter}
                      onChange={(event) => setStatusFilter(event.target.value)}
                      className="rounded border border-gray-200 bg-white px-2 py-1 text-xs outline-none"
                    >
                      <option value="all">All statuses</option>
                      <option value="open">Open</option>
                      <option value="in_progress">In progress</option>
                      <option value="resolved">Resolved</option>
                    </select>
                    <select
                      name="regionalIssueSeverityFilter"
                      value={severityFilter}
                      onChange={(event) => setSeverityFilter(event.target.value)}
                      className="rounded border border-gray-200 bg-white px-2 py-1 text-xs outline-none"
                    >
                      <option value="all">All severities</option>
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                    <span className="ml-auto text-xs text-gray-400">{filteredIssues.length} shown</span>
                  </div>

                  {!issues ? (
                    <p className="py-6 text-center text-sm text-gray-400">Loading regional issues...</p>
                  ) : filteredIssues.length === 0 ? (
                    <p className="py-6 text-center text-sm text-gray-400">No issues match current filters.</p>
                  ) : (
                    <div className="max-h-[700px] space-y-3 overflow-y-auto pr-1">
                      {filteredIssues
                        .sort((a: any, b: any) => {
                          const order = { critical: 0, high: 1, medium: 2, low: 3 };
                          return (
                            (order[a.severity as keyof typeof order] ?? 4) -
                            (order[b.severity as keyof typeof order] ?? 4)
                          );
                        })
                        .map((issue: any) => (
                          <IssueCard
                            key={issue._id}
                            issue={issue}
                            attachments={attachmentsByIssue[issue.issueId] ?? []}
                            showStore
                            onSelect={setSelectedIssueId}
                            isSelected={selectedIssueId === issue.issueId}
                            onResolve={(issueId) =>
                              updateIssueStatus({
                                operatorId: operator.operatorId,
                                issueId,
                                status: "resolved",
                                resolutionNotes: "Resolved from regional command workspace.",
                              })
                            }
                            onEscalate={(issueId) =>
                              escalateIssue({
                                operatorId: operator.operatorId,
                                issueId,
                              })
                            }
                          />
                        ))}
                    </div>
                  )}
                </div>

                <ActionItemsPanel operatorId={operator.operatorId} title="Action items" regionId={REGION_ID} />
                <RecentActivityPanel operatorId={operator.operatorId} regionId={REGION_ID} title="Activity" />
              </>
            )}
          </div>

          {/* RIGHT COLUMN — Chat */}
          <div className="hidden w-[420px] shrink-0 xl:block">
            <ChatPanel
              operatorId={operator.operatorId}
              regionId={REGION_ID}
              issueContext={issueContext}
              onClearIssue={selectedIssueId ? () => setSelectedIssueId(null) : undefined}
              operatorName={operatorProfile?.name}
            />
          </div>
        </div>

        {/* Chat for smaller screens */}
        <div className="mt-4 xl:hidden">
          <ChatPanel operatorId={operator.operatorId} regionId={REGION_ID} />
        </div>
      </div>
    </div>
  );
}

/* ── Render helpers ────────────────────────────────────────── */

function TabButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border-b-2 px-3 pb-2 text-sm font-medium transition ${
        active
          ? "border-indigo-600 text-gray-900"
          : "border-transparent text-gray-400 hover:text-gray-700"
      }`}
    >
      {label}
    </button>
  );
}

function MetricBadge({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
      <p className="text-[11px] font-medium uppercase text-gray-400">{label}</p>
      <p className="mt-0.5 text-lg font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function buildRegionalBrief({
  openIssueCount,
  criticalCount,
  escalatedCount,
  topPattern,
  nextAction,
}: {
  openIssueCount: number;
  criticalCount: number;
  escalatedCount: number;
  topPattern: any;
  nextAction: any;
}) {
  const headline =
    criticalCount > 0
      ? `${criticalCount} critical incidents need regional intervention now.`
      : `${openIssueCount} active issues are currently moving through the region.`;

  const summary = topPattern
    ? `${String(topPattern[0]).replace("_", " ")} is currently the leading regional pattern with ${topPattern[1]} active issues. ${
        nextAction ? `The next follow-up in queue is ${nextAction.title}. ` : ""
      }${escalatedCount} cases are already escalated to regional review.`
    : `No single category is dominating the region. ${
        nextAction ? `The next follow-up in queue is ${nextAction.title}.` : ""
      }`;

  const chips = [
    `${openIssueCount} open issues`,
    `${criticalCount} critical`,
    `${escalatedCount} escalated`,
    nextAction ? "follow-up queued" : "queue clear",
  ];

  return { headline, summary, chips };
}

function WorkspaceAccessState({ title, message }: { title: string; message: string }) {
  return (
    <div className="app-shell">
      <div className="app-frame">
        <div className="flex min-h-[300px] items-center justify-center">
          <div className="text-center">
            <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">&larr; Home</Link>
            <p className="mt-3 text-sm font-medium text-gray-900">{title}</p>
            <p className="mt-1 text-sm text-gray-500">{message}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

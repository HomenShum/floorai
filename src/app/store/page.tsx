"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";

import { api } from "../../../convex/_generated/api";
import { ActionItemsPanel } from "@/components/ActionItemsPanel";
import { ChatPanel } from "@/components/ChatPanel";
import { IssueCard } from "@/components/IssueCard";
import { IssueComposer } from "@/components/IssueComposer";
import { RecentActivityPanel } from "@/components/RecentActivityPanel";
import { useOperatorSession } from "@/components/OperatorSessionProvider";

type StoreView = "briefing" | "capture" | "records";

export default function StorePage() {
  return (
    <Suspense fallback={<div className="app-shell"><div className="app-frame"><p className="py-6 text-center text-sm text-gray-400">Loading...</p></div></div>}>
      <StorePageInner />
    </Suspense>
  );
}

function StorePageInner() {
  const { operator } = useOperatorSession();
  const searchParams = useSearchParams();
  const operatorProfile = useQuery(
    api.users.getById,
    operator?.operatorId ? { operatorId: operator.operatorId } : "skip"
  );
  const allowedStores = operatorProfile?.storeIds ?? [];
  const [selectedStore, setSelectedStore] = useState<string>("");
  const [activeView, setActiveView] = useState<StoreView>("briefing");
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);

  useEffect(() => {
    if (!allowedStores.length) {
      setSelectedStore("");
      return;
    }
    // Check URL param first
    const storeParam = searchParams.get("store");
    if (storeParam && allowedStores.includes(storeParam)) {
      setSelectedStore(storeParam);
      return;
    }
    if (!selectedStore || !allowedStores.includes(selectedStore)) {
      setSelectedStore(allowedStores[0]);
    }
  }, [allowedStores, selectedStore, searchParams]);

  const canAccess =
    operatorProfile?.role === "store_manager" && allowedStores.length > 0 && !!selectedStore;

  const issues = useQuery(
    api.issues.getByStore,
    canAccess && operator
      ? { operatorId: operator.operatorId, storeId: selectedStore }
      : "skip"
  );
  const issueAttachments = useQuery(
    api.files.listByIssueIds,
    canAccess && operator
      ? {
          operatorId: operator.operatorId,
          issueIds: issues?.map((issue: any) => issue.issueId) ?? [],
          storeId: selectedStore,
        }
      : "skip"
  );
  const store = useQuery(
    api.stores.getById,
    canAccess && operator
      ? { operatorId: operator.operatorId, storeId: selectedStore }
      : "skip"
  );
  const metrics = useQuery(
    api.operations.getStoreMetrics,
    canAccess && operator
      ? { operatorId: operator.operatorId, storeId: selectedStore }
      : "skip"
  );
  const staffing = useQuery(
    api.staffing.getLatestByStore,
    canAccess && operator
      ? { operatorId: operator.operatorId, storeId: selectedStore }
      : "skip"
  );
  const actionItems = useQuery(
    api.actionItems.list,
    canAccess && operator
      ? {
          operatorId: operator.operatorId,
          storeId: selectedStore,
        }
      : "skip"
  );
  const updateIssueStatus = useMutation(api.issues.updateStatus);
  const escalateIssue = useMutation(api.issues.escalate);

  const openIssues = useMemo(
    () => issues?.filter((issue: any) => issue.status !== "resolved") || [],
    [issues]
  );
  const filteredIssues = useMemo(() => {
    const base = issues ?? [];
    return base.filter((issue: any) => {
      if (statusFilter !== "all" && issue.status !== statusFilter) {
        return false;
      }
      if (severityFilter !== "all" && issue.severity !== severityFilter) {
        return false;
      }
      return true;
    });
  }, [issues, severityFilter, statusFilter]);
  const criticalCount = openIssues.filter((issue: any) => issue.severity === "critical").length;
  const attachmentsByIssue = (issueAttachments ?? []).reduce(
    (acc: Record<string, any[]>, file: any) => {
      if (!file.issueId) return acc;
      acc[file.issueId] = [...(acc[file.issueId] ?? []), file];
      return acc;
    },
    {}
  );

  const topIssue = [...openIssues].sort((a: any, b: any) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return (
      (order[a.severity as keyof typeof order] ?? 4) -
      (order[b.severity as keyof typeof order] ?? 4)
    );
  })[0];

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

  const nextAction = (actionItems ?? []).find((item: any) => item.status !== "completed");
  const commandBrief = buildCommandBrief({
    storeName: store?.name ?? selectedStore,
    openIssueCount: openIssues.length,
    criticalCount,
    topIssue,
    staffing,
    nextAction,
  });

  if (!operator) {
    return (
      <WorkspaceAccessState
        title="Store operations workspace"
        message="Select a store manager session from home before entering this workspace."
      />
    );
  }

  if (operatorProfile === undefined) {
    return (
      <WorkspaceAccessState
        title="Store operations workspace"
        message="Loading operator session..."
      />
    );
  }

  if (operatorProfile?.role !== "store_manager") {
    return (
      <WorkspaceAccessState
        title="Store operations workspace"
        message="This workspace is only available to store manager sessions."
      />
    );
  }

  if (!selectedStore) {
    return (
      <WorkspaceAccessState
        title="Store operations workspace"
        message="No store is assigned to this operator session."
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
            <h1 className="text-sm font-semibold text-gray-900">
              {store?.name ?? selectedStore}
            </h1>
            <select
              name="storeSelector"
              value={selectedStore}
              onChange={(event) => setSelectedStore(event.target.value)}
              className="rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 outline-none"
            >
              {allowedStores.map((storeId: string) => (
                <option key={storeId} value={storeId}>
                  {storeId}
                </option>
              ))}
            </select>
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
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
              {staffing ? `${staffing.actualCount}/${staffing.scheduledCount} staff` : "..."}
            </span>
            <span className="hidden text-xs text-gray-400 sm:inline">
              {operatorProfile.name}
            </span>
          </div>
        </header>

        {/* ── Tab bar ─────────────────────────────────────── */}
        <nav className="flex gap-4 border-b border-gray-200 pt-2">
          <TabButton active={activeView === "briefing"} label="Briefing" onClick={() => setActiveView("briefing")} />
          <TabButton active={activeView === "capture"} label="Capture" onClick={() => setActiveView("capture")} />
          <TabButton active={activeView === "records"} label="Records" onClick={() => setActiveView("records")} />
        </nav>

        {/* ── Two-column body ─────────────────────────────── */}
        <div className="mt-4 flex gap-5">
          {/* LEFT COLUMN */}
          <div className="min-w-0 flex-1 space-y-4">
            {activeView === "briefing" && (
              <>
                {/* Metric row */}
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <MetricBadge label="Open" value={metrics?.openIssueCount ?? openIssues.length} />
                  <MetricBadge label="Low stock" value={metrics?.lowStockCount ?? 0} />
                  <MetricBadge label="At risk" value={`$${(metrics?.estimatedRevenueImpact ?? 0).toLocaleString()}`} />
                  <MetricBadge
                    label="Staff"
                    value={staffing ? `${staffing.actualCount}/${staffing.scheduledCount}` : "--"}
                  />
                </div>

                {/* Top issue card */}
                {topIssue && (
                  <div className="panel-strong p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{topIssue.title}</p>
                        <p className="mt-1 text-xs text-gray-500">{topIssue.description}</p>
                      </div>
                      <div className="flex shrink-0 gap-1.5">
                        <span className="rounded bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700">{topIssue.severity}</span>
                        <span className="rounded bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">{topIssue.issueId}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Issue list */}
                <div>
                  <div className="flex items-center gap-2 pb-2">
                    <select
                      name="storeIssueStatusFilter"
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
                      name="storeIssueSeverityFilter"
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
                            onSelect={setSelectedIssueId}
                            isSelected={selectedIssueId === issue.issueId}
                            onResolve={(issueId) =>
                              updateIssueStatus({
                                operatorId: operator.operatorId,
                                issueId,
                                status: "resolved",
                                resolutionNotes: "Resolved from store manager workspace.",
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

                {/* Action items + activity */}
                <ActionItemsPanel operatorId={operator.operatorId} title="Action items" storeId={selectedStore} />
                <RecentActivityPanel operatorId={operator.operatorId} storeId={selectedStore} title="Activity" />
              </>
            )}

            {activeView === "capture" && (
              <>
                <IssueComposer
                  operatorId={operator.operatorId}
                  storeId={selectedStore}
                  regionId={store?.regionId || "REG-NE"}
                  reporterName={operatorProfile.name}
                  reporterRole="store_manager"
                />
                <ActionItemsPanel operatorId={operator.operatorId} title="Action items" storeId={selectedStore} />
                <RecentActivityPanel operatorId={operator.operatorId} storeId={selectedStore} title="Activity" />
              </>
            )}

            {activeView === "records" && (
              <>
                <div>
                  <div className="flex items-center gap-2 pb-2">
                    <select
                      name="storeIssueStatusFilter"
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
                      name="storeIssueSeverityFilter"
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
                            onSelect={setSelectedIssueId}
                            isSelected={selectedIssueId === issue.issueId}
                            onResolve={(issueId) =>
                              updateIssueStatus({
                                operatorId: operator.operatorId,
                                issueId,
                                status: "resolved",
                                resolutionNotes: "Resolved from store manager workspace.",
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

                <ActionItemsPanel operatorId={operator.operatorId} title="Action items" storeId={selectedStore} />
                <RecentActivityPanel operatorId={operator.operatorId} storeId={selectedStore} title="Activity" />
              </>
            )}
          </div>

          {/* RIGHT COLUMN — Chat */}
          <div className="hidden w-[400px] shrink-0 xl:block">
            <ChatPanel
              operatorId={operator.operatorId}
              storeId={selectedStore}
              issueContext={issueContext}
              onClearIssue={selectedIssueId ? () => setSelectedIssueId(null) : undefined}
              operatorName={operatorProfile?.name}
            />
          </div>
        </div>

        {/* Chat for smaller screens */}
        <div className="mt-4 xl:hidden">
          <ChatPanel operatorId={operator.operatorId} storeId={selectedStore} />
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

function buildCommandBrief({
  storeName,
  openIssueCount,
  criticalCount,
  topIssue,
  staffing,
  nextAction,
}: {
  storeName: string;
  openIssueCount: number;
  criticalCount: number;
  topIssue: any;
  staffing: any;
  nextAction: any;
}) {
  const headline =
    criticalCount > 0
      ? `${criticalCount} critical issue${criticalCount > 1 ? "s" : ""} need immediate attention at ${storeName}.`
      : openIssueCount > 0
        ? `${openIssueCount} active issue${openIssueCount > 1 ? "s" : ""} are open at ${storeName}.`
        : `Operations are stable at ${storeName}.`;

  const summary = topIssue
    ? `Start with ${topIssue.issueId}. ${topIssue.title} is the clearest live risk right now. ${
        staffing?.staffingRisk
          ? `Current staffing is ${staffing.staffingRisk} risk. `
          : ""
      }${nextAction ? `The next tracked follow-up is ${nextAction.title}.` : ""}`
    : "There is no single incident dominating the store right now, so use this page to capture new issues or review historical records without wading through every panel.";

  const chips = [
    `${openIssueCount} open issues`,
    criticalCount > 0 ? `${criticalCount} critical` : "no criticals",
    staffing?.staffingRisk ? `${staffing.staffingRisk} staffing risk` : "staffing stable",
    nextAction ? "follow-up queued" : "no pending follow-up",
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

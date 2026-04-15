"use client";

import { useQuery } from "convex/react";

import { api } from "../../convex/_generated/api";

interface RecentActivityPanelProps {
  operatorId: string;
  storeId?: string;
  regionId?: string;
  title: string;
}

const statusStyles: Record<string, string> = {
  success: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-800",
  failure: "bg-red-100 text-red-700",
};

export function RecentActivityPanel({
  operatorId,
  storeId,
  regionId,
  title,
}: RecentActivityPanelProps) {
  const events = useQuery(api.audit.listRecent, {
    operatorId,
    storeId,
    regionId,
    limit: 10,
  });

  return (
    <section className="panel-strong p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="section-label">Audit Trail</p>
          <h3 className="mt-1 text-lg font-semibold text-slate-900">{title}</h3>
        </div>
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500">
          {events?.length || 0} recent
        </span>
      </div>

      {!events ? (
        <p className="mt-4 text-sm text-slate-500">Loading recent activity...</p>
      ) : events.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No recent audited activity for this scope.</p>
      ) : (
        <div className="mt-4 max-h-[320px] space-y-3 overflow-y-auto pr-1">
          {events.map((event: any) => (
            <div
              key={event._id}
              className="rounded-[18px] border border-[rgba(72,57,39,0.12)] bg-[rgba(255,252,246,0.92)] p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-900">{event.summary}</p>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                    {event.eventType.replaceAll(".", " / ")}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    statusStyles[event.status] || "bg-slate-100 text-slate-700"
                  }`}
                >
                  {event.status}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                <span>{event.actorName}</span>
                <span>/</span>
                <span>{new Date(event.createdAt).toLocaleString()}</span>
                {event.entityId ? (
                  <>
                    <span>/</span>
                    <span>{event.entityId}</span>
                  </>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

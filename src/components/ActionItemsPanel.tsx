"use client";

import { useMutation, useQuery } from "convex/react";

import { api } from "../../convex/_generated/api";

interface ActionItemsPanelProps {
  operatorId: string;
  title: string;
  storeId?: string;
  regionId?: string;
}

const priorityStyles: Record<string, string> = {
  critical: "bg-red-100 text-red-700",
  high: "bg-amber-100 text-amber-800",
  medium: "bg-sky-100 text-sky-800",
  low: "bg-emerald-100 text-emerald-700",
};

export function ActionItemsPanel({
  operatorId,
  title,
  storeId,
  regionId,
}: ActionItemsPanelProps) {
  const items = useQuery(api.actionItems.list, {
    operatorId,
    storeId,
    regionId,
  });
  const updateStatus = useMutation(api.actionItems.updateStatus);

  return (
    <section className="panel-strong p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="section-label">Execution Queue</p>
          <h3 className="mt-1 text-lg font-semibold text-slate-900">{title}</h3>
        </div>
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500">
          {items?.length || 0} tracked
        </span>
      </div>

      {!items ? (
        <p className="mt-4 text-sm text-slate-500">Loading action items...</p>
      ) : items.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No open follow-ups right now.</p>
      ) : (
        <div className="mt-4 max-h-[420px] space-y-3 overflow-y-auto pr-1">
          {items.map((item: any) => (
            <div
              key={item._id}
              className="rounded-[18px] border border-[rgba(72,57,39,0.12)] bg-[rgba(255,252,246,0.92)] p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                  <p className="text-sm leading-6 text-slate-600">{item.description}</p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    priorityStyles[item.priority] || priorityStyles.medium
                  }`}
                >
                  {item.priority}
                </span>
              </div>

              <div className="mt-4 flex flex-col gap-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <span>{item.assignee}</span>
                  {item.dueAt ? <span>due {new Date(item.dueAt).toLocaleDateString()}</span> : null}
                  <span className="capitalize">{item.status.replace("_", " ")}</span>
                </div>
                {item.status !== "completed" ? (
                  <button
                    type="button"
                    onClick={() =>
                      updateStatus({
                        operatorId,
                        actionItemId: item.actionItemId,
                        status: "completed",
                      })
                    }
                    className="btn-secondary w-fit px-3 py-1.5 text-[11px]"
                  >
                    Mark complete
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

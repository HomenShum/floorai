import { AttachmentList } from "./AttachmentList";

const severityStyles: Record<string, string> = {
  critical: "bg-red-100 text-red-700 border-red-200",
  high: "bg-amber-100 text-amber-800 border-amber-200",
  medium: "bg-sky-100 text-sky-800 border-sky-200",
  low: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const statusStyles: Record<string, string> = {
  open: "bg-slate-900 text-white border-slate-900",
  in_progress: "bg-teal-100 text-teal-800 border-teal-200",
  resolved: "bg-slate-100 text-slate-500 border-slate-200",
};

interface IssueCardProps {
  issue: {
    issueId: string;
    storeId: string;
    title: string;
    description: string;
    severity: string;
    status: string;
    issueType: string;
    reporterName: string;
    estimatedRevenueImpact: number;
    escalatedToRegional: boolean;
    createdAt: string;
  };
  attachments?: Array<{
    fileId: string;
    filename: string;
    mimeType: string;
    fileCategory: string;
    sizeBytes: number;
    url?: string | null;
  }>;
  showStore?: boolean;
  onResolve?: (issueId: string) => void;
  onEscalate?: (issueId: string) => void;
  onSelect?: (issueId: string) => void;
  isSelected?: boolean;
}

export function IssueCard({
  issue,
  attachments = [],
  showStore,
  onResolve,
  onEscalate,
  onSelect,
  isSelected,
}: IssueCardProps) {
  const timeAgo = getTimeAgo(issue.createdAt);

  return (
    <article
      onClick={onSelect ? () => onSelect(issue.issueId) : undefined}
      className={`panel-strong p-4 transition hover:-translate-y-0.5 hover:shadow-lg ${
        issue.status === "resolved" ? "opacity-75" : ""
      } ${issue.severity === "critical" ? "ring-1 ring-red-200" : ""} ${
        onSelect ? "cursor-pointer" : ""
      } ${isSelected ? "border-l-4 border-l-indigo-500 ring-1 ring-indigo-200" : ""}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-slate-600">
              {issue.issueId}
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-600">
              {issue.issueType.replace("_", " ")}
            </span>
            {showStore && issue.storeId !== "STR-ALL" ? (
              <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-600">
                {issue.storeId}
              </span>
            ) : null}
            {issue.storeId === "STR-ALL" ? (
              <span className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-teal-700">
                Regional
              </span>
            ) : null}
          </div>
          <div>
            <h3 className={`text-base font-semibold text-slate-900 ${onSelect ? "hover:text-indigo-600 transition-colors" : ""}`}>{issue.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{issue.description}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 sm:max-w-[220px] sm:justify-end">
          {issue.escalatedToRegional ? (
            <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
              escalated
            </span>
          ) : null}
          <span
            className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
              severityStyles[issue.severity] || ""
            }`}
          >
            {issue.severity}
          </span>
          <span
            className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
              statusStyles[issue.status] || ""
            }`}
          >
            {issue.status.replace("_", " ")}
          </span>
        </div>
      </div>

      <AttachmentList attachments={attachments} compact />

      <div className="mt-4 flex flex-col gap-3 border-t border-[rgba(72,57,39,0.08)] pt-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span>{issue.reporterName}</span>
          <span>/</span>
          <span>{timeAgo}</span>
          {issue.estimatedRevenueImpact > 0 ? (
            <>
              <span>/</span>
              <span className="font-semibold text-red-700">
                ${issue.estimatedRevenueImpact.toLocaleString()} at risk
              </span>
            </>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {issue.status !== "resolved" && onResolve ? (
            <button
              type="button"
              onClick={(e: React.MouseEvent) => { e.stopPropagation(); onResolve(issue.issueId); }}
              className="btn-secondary px-3 py-1.5 text-[11px]"
            >
              Resolve
            </button>
          ) : null}
          {!issue.escalatedToRegional && onEscalate ? (
            <button
              type="button"
              onClick={(e: React.MouseEvent) => { e.stopPropagation(); onEscalate(issue.issueId); }}
              className="rounded-2xl border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] font-medium text-red-700 transition hover:bg-red-100"
            >
              Escalate
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function getTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = Math.max(0, now.getTime() - date.getTime());
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) {
    return "just now";
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

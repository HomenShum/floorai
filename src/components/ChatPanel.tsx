"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { api } from "../../convex/_generated/api";
import { AttachmentList } from "./AttachmentList";
import { uploadFilesToConvex } from "@/lib/fileUploads";

interface IssueContext {
  issueId: string;
  title: string;
  description: string;
}

interface ChatPanelProps {
  operatorId: string;
  storeId?: string;
  regionId?: string;
  issueContext?: IssueContext;
  onClearIssue?: () => void;
  operatorName?: string;
}

type ParsedTrace = {
  planner?: {
    summary?: string;
    telemetry?: {
      model?: string;
      durationMs?: number;
      tokensIn?: number;
      tokensOut?: number;
      totalTokens?: number;
    };
    plan?: Array<{
      id: string;
      stepIndex: number;
      groupId: string;
      toolName: string;
      purpose: string;
      args?: Record<string, unknown>;
      dependsOn?: string[];
      injectPriorResults?: string[];
      model?: string;
    }>;
  };
  execution?: {
    steps?: Array<{
      id: string;
      stepIndex: number;
      groupId: string;
      tool: string;
      purpose: string;
      summary: string;
      durationMs?: number;
      success?: boolean;
      actualArgs?: Record<string, unknown>;
      plannedArgs?: Record<string, unknown>;
      telemetry?: {
        model?: string;
        tokensIn?: number;
        tokensOut?: number;
        totalTokens?: number;
      };
      sources?: Array<{
        url: string;
        domain: string;
        title?: string;
        snippet?: string;
      }>;
    }>;
    modelTurns?: Array<{
      turn: number;
      model: string;
      durationMs?: number;
      tokensIn?: number;
      tokensOut?: number;
      totalTokens?: number;
    }>;
    totalDurationMs?: number;
    fallbackUsed?: boolean;
  };
  sources?: Array<{
    url: string;
    domain: string;
    title?: string;
    snippet?: string;
  }>;
  telemetry?: {
    planning?: {
      model?: string;
      durationMs?: number;
      tokensIn?: number;
      tokensOut?: number;
      totalTokens?: number;
    };
    fallback?: {
      model?: string;
      durationMs?: number;
      tokensIn?: number;
      tokensOut?: number;
      totalTokens?: number;
    } | null;
  };
};

type ParsedQuality = {
  status?: string;
  summary?: string;
  checks?: Array<{
    key: string;
    label: string;
    passed: boolean;
    severity: "error" | "warning";
    message: string;
  }>;
};

type ParsedMessageMetadata = {
  model?: string;
  operatorId?: string;
  answerPacketId?: string | null;
  quality?: ParsedQuality;
  trace?: ParsedTrace;
};

function formatFileSize(file: File) {
  if (file.size >= 1024 * 1024) {
    return `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(file.size / 1024))} KB`;
}

function formatDuration(durationMs?: number) {
  if (!durationMs && durationMs !== 0) {
    return "n/a";
  }
  if (durationMs < 1000) {
    return `${durationMs} ms`;
  }
  return `${(durationMs / 1000).toFixed(1)} s`;
}

function formatTokens(tokens?: number) {
  if (!tokens && tokens !== 0) {
    return "n/a";
  }
  return tokens.toLocaleString();
}

function parseMetadata(metadataJson?: string | null): ParsedMessageMetadata | null {
  if (!metadataJson) {
    return null;
  }

  try {
    const parsed = JSON.parse(metadataJson);
    if (parsed?.trace || parsed?.quality || parsed?.answerPacketId) {
      return parsed;
    }
    return {
      trace: parsed ?? null,
    };
  } catch {
    return null;
  }
}

function prettifyToolName(value: string) {
  return value.replace(/_/g, " ");
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

function compactArgEntries(args?: Record<string, unknown>) {
  if (!args) {
    return [];
  }
  return Object.entries(args).filter(([, value]) => value !== undefined && value !== null && value !== "");
}

function getSourceDisplayDomain(source: NonNullable<ParsedTrace["sources"]>[number]) {
  const title = (source.title || "").trim();
  if (
    source.domain === "vertexaisearch.cloud.google.com" &&
    title &&
    /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(title)
  ) {
    return title;
  }
  return source.domain;
}

function getSourceHref(source: NonNullable<ParsedTrace["sources"]>[number]) {
  if (source.url?.includes("vertexaisearch.cloud.google.com/grounding-api-redirect/")) {
    return `/api/source?url=${encodeURIComponent(source.url)}`;
  }
  return source.url;
}

function formatPreviewValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "n/a";
  }

  if (typeof value === "number") {
    return value.toLocaleString();
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "string") {
    return value.length > 180 ? `${value.slice(0, 177)}...` : value;
  }

  if (Array.isArray(value)) {
    const preview = value
      .slice(0, 3)
      .map((item) =>
        typeof item === "string" || typeof item === "number" ? String(item) : JSON.stringify(item)
      )
      .join(", ");
    return preview ? `${preview}${value.length > 3 ? ` +${value.length - 3} more` : ""}` : "[]";
  }

  if (typeof value === "object") {
    const entries: Array<[string, unknown]> = Object.entries(value as Record<string, unknown>).slice(0, 3);
    if (!entries.length) {
      return "{}";
    }
    const preview: string = entries
      .map(([key, entryValue]) => `${key}: ${formatPreviewValue(entryValue)}`)
      .join(" / ");
    return preview.length > 180 ? `${preview.slice(0, 177)}...` : preview;
  }

  return String(value);
}

function formatQualityStatus(status?: string) {
  if (status === "pass") {
    return "Passed";
  }
  if (status === "warning") {
    return "Needs attention";
  }
  if (status === "fail") {
    return "Blocked";
  }
  return "Pending";
}

function qualityStatusClasses(status?: string) {
  if (status === "pass") {
    return "border-emerald-100 bg-emerald-50 text-emerald-700";
  }
  if (status === "warning") {
    return "border-amber-100 bg-amber-50 text-amber-700";
  }
  if (status === "fail") {
    return "border-rose-100 bg-rose-50 text-rose-700";
  }
  return "border-slate-200 bg-slate-100 text-slate-600";
}

function AssistantMarkdown({ content }: { content: string }) {
  return (
    <div className="assistant-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node: _node, ...props }) => (
            <a
              {...props}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-teal-700 underline decoration-teal-200 underline-offset-4"
            />
          ),
          code: ({ inline, children, className, ...props }: any) =>
            inline ? (
              <code
                {...props}
                className={`rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.9em] text-slate-700 ${className || ""}`}
              >
                {children}
              </code>
            ) : (
              <code {...props} className={className}>
                {children}
              </code>
            ),
          pre: ({ children }) => (
            <pre className="overflow-x-auto rounded-[16px] border border-[rgba(72,57,39,0.1)] bg-slate-950/95 px-4 py-3 text-[12px] leading-6 text-slate-100">
              {children}
            </pre>
          ),
          hr: () => <hr className="my-5 border-t border-[rgba(72,57,39,0.1)]" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function SourceCards({ sources }: { sources: ParsedTrace["sources"] }) {
  if (!sources?.length) {
    return null;
  }

  return (
    <div className="mt-5 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="section-label">Sources</p>
        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-500">
          {sources.length} linked
        </span>
      </div>
      <div className="space-y-2">
        {sources.map((source) => (
          <a
            key={source.url}
            href={getSourceHref(source)}
            target="_blank"
            rel="noreferrer"
            className="block rounded-[18px] border border-[rgba(72,57,39,0.12)] bg-[rgba(255,252,246,0.92)] px-3 py-3 transition hover:border-teal-200 hover:bg-white"
          >
            {(() => {
              const displayDomain = getSourceDisplayDomain(source);
              const title = source.title && source.title !== displayDomain ? source.title : displayDomain;

              return (
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-semibold text-slate-900">{title}</p>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-600">
                    {displayDomain}
                  </span>
                </div>
              );
            })()}
            {source.snippet ? (
              <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{source.snippet}</p>
            ) : null}
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="truncate text-[11px] uppercase tracking-[0.14em] text-slate-400">
                Click to review source
              </p>
              <span className="text-xs font-medium text-teal-700">Open link</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

function QualityChecks({
  quality,
  answerPacketId,
}: {
  quality?: ParsedQuality;
  answerPacketId?: string | null;
}) {
  if (!quality) {
    return null;
  }

  const checks = quality.checks ?? [];
  const passedCount = checks.filter((check) => check.passed).length;

  return (
    <details className="overflow-hidden rounded-[20px] border border-[rgba(72,57,39,0.12)] bg-[rgba(255,252,246,0.92)]">
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-slate-900">
        Quality checks
      </summary>
      <div className="border-t border-[rgba(72,57,39,0.08)] px-4 py-4">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${qualityStatusClasses(
              quality.status
            )}`}
          >
            {formatQualityStatus(quality.status)}
          </span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-600">
            {passedCount}/{checks.length || 0} checks passed
          </span>
          {answerPacketId ? (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
              {answerPacketId}
            </span>
          ) : null}
        </div>

        {quality.summary ? (
          <div className="mb-4 rounded-[18px] border border-[rgba(72,57,39,0.08)] bg-white px-4 py-3">
            <p className="section-label">Runtime summary</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{quality.summary}</p>
          </div>
        ) : null}

        <div className="space-y-3">
          {checks.map((check) => (
            <div
              key={check.key}
              className={`rounded-[18px] border px-4 py-3 ${
                check.passed
                  ? "border-emerald-100 bg-emerald-50/70"
                  : check.severity === "error"
                    ? "border-rose-100 bg-rose-50/70"
                    : "border-amber-100 bg-amber-50/70"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-slate-900">{check.label}</p>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                    check.passed
                      ? "bg-emerald-100 text-emerald-700"
                      : check.severity === "error"
                        ? "bg-rose-100 text-rose-700"
                        : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {check.passed ? "pass" : check.severity}
                </span>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-600">{check.message}</p>
            </div>
          ))}
        </div>
      </div>
    </details>
  );
}

function StepCard({
  title,
  subtitle,
  pills,
  body,
  args,
  telemetry,
  sources,
}: {
  title: string;
  subtitle?: string;
  pills: string[];
  body: string;
  args?: Record<string, unknown>;
  telemetry?: {
    model?: string;
    tokensIn?: number;
    tokensOut?: number;
    totalTokens?: number;
  };
  sources?: Array<{
    url: string;
    domain: string;
    title?: string;
    snippet?: string;
  }>;
}) {
  const entries = compactArgEntries(args);

  return (
    <div className="rounded-[18px] border border-[rgba(72,57,39,0.1)] bg-white px-3 py-3">
      <div className="flex flex-wrap items-center gap-2">
        {pills.map((pill) => (
          <span
            key={pill}
            className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600"
          >
            {pill}
          </span>
        ))}
      </div>

      <p className="mt-3 text-sm font-semibold text-slate-900">{title}</p>
      {subtitle ? <p className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</p> : null}
      {body ? (
        <div className="mt-3 rounded-[14px] border border-[rgba(72,57,39,0.08)] bg-[rgba(248,245,239,0.72)] px-3 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            Output preview
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-600">{body}</p>
        </div>
      ) : null}

      {entries.length ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {entries.map(([key, value]) => (
            <div
              key={key}
              className="rounded-[14px] border border-[rgba(72,57,39,0.08)] bg-[rgba(248,245,239,0.8)] px-3 py-2"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                {titleCase(key.replace(/_/g, " "))}
              </p>
              <p className="mt-1 break-words text-xs leading-5 text-slate-700">{formatPreviewValue(value)}</p>
            </div>
          ))}
        </div>
      ) : null}

      {telemetry?.model || telemetry?.tokensIn || telemetry?.tokensOut || telemetry?.totalTokens ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {telemetry.model ? (
            <span className="rounded-full bg-teal-50 px-2.5 py-1 text-[11px] text-teal-700">
              {telemetry.model}
            </span>
          ) : null}
          {telemetry.tokensIn ? (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-600">
              in {formatTokens(telemetry.tokensIn)}
            </span>
          ) : null}
          {telemetry.tokensOut ? (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-600">
              out {formatTokens(telemetry.tokensOut)}
            </span>
          ) : null}
          {telemetry.totalTokens ? (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-600">
              total {formatTokens(telemetry.totalTokens)}
            </span>
          ) : null}
        </div>
      ) : null}

      {sources?.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {sources.slice(0, 3).map((source) => (
            <a
              key={source.url}
              href={getSourceHref(source)}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] text-amber-700 hover:bg-amber-100"
            >
              {getSourceDisplayDomain(source)}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function TraceDetails({ trace }: { trace: ParsedTrace | null }) {
  if (!trace) {
    return null;
  }

  const steps = trace.execution?.steps ?? [];
  const plan = trace.planner?.plan ?? [];
  const successfulCount = steps.filter((step) => step.success !== false).length;

  return (
    <div className="mt-5 space-y-3">
      <details className="overflow-hidden rounded-[20px] border border-[rgba(72,57,39,0.12)] bg-[rgba(255,252,246,0.92)]">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-slate-900">
          Agent trace
        </summary>
        <div className="border-t border-[rgba(72,57,39,0.08)] px-4 py-4">
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <TelemetryCard
              label="Plan"
              primary={`${plan.length} steps`}
              secondary={trace.planner?.telemetry?.model || "planner"}
            />
            <TelemetryCard
              label="Execution"
              primary={`${successfulCount}/${steps.length} succeeded`}
              secondary={formatDuration(trace.execution?.totalDurationMs)}
            />
            <TelemetryCard
              label="Sources"
              primary={`${(trace.sources ?? []).length}`}
              secondary={trace.execution?.fallbackUsed ? "fallback used" : "grounded"}
            />
          </div>

          {trace.planner?.summary ? (
            <div className="mb-4 rounded-[18px] border border-[rgba(72,57,39,0.08)] bg-white px-4 py-3">
              <p className="section-label">Plan summary</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{trace.planner.summary}</p>
            </div>
          ) : null}

          {plan.length ? (
            <div className="space-y-3">
              <p className="section-label">Planned steps</p>
              {plan.map((step) => (
                <StepCard
                  key={step.id}
                  title={titleCase(prettifyToolName(step.toolName))}
                  subtitle={step.purpose}
                  pills={[step.id, `tier ${step.stepIndex}`, prettifyToolName(step.toolName)]}
                  body={
                    step.dependsOn?.length
                      ? `Depends on ${step.dependsOn.join(", ")}`
                      : "Ready to execute in sequence."
                  }
                  args={step.args}
                />
              ))}
            </div>
          ) : null}

          {steps.length ? (
            <div className="mt-5 space-y-3">
              <p className="section-label">Executed steps</p>
              {steps.map((step) => (
                <StepCard
                  key={step.id}
                  title={titleCase(prettifyToolName(step.tool))}
                  subtitle={step.purpose}
                  pills={[
                    step.id,
                    step.groupId,
                    prettifyToolName(step.tool),
                    step.success === false ? "failed" : "success",
                    formatDuration(step.durationMs),
                  ]}
                  body={step.summary === step.purpose ? "" : step.summary}
                  args={step.actualArgs}
                  telemetry={step.telemetry}
                  sources={step.sources}
                />
              ))}
            </div>
          ) : null}
        </div>
      </details>

      <details className="overflow-hidden rounded-[20px] border border-[rgba(72,57,39,0.12)] bg-[rgba(255,252,246,0.92)]">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-slate-900">
          Telemetry
        </summary>
        <div className="border-t border-[rgba(72,57,39,0.08)] px-4 py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <TelemetryCard
              label="Planning"
              primary={trace.telemetry?.planning?.model || "n/a"}
              secondary={`${formatDuration(trace.telemetry?.planning?.durationMs)} / in ${formatTokens(
                trace.telemetry?.planning?.tokensIn
              )} / out ${formatTokens(trace.telemetry?.planning?.tokensOut)}`}
            />
            <TelemetryCard
              label="Execution"
              primary={trace.execution?.modelTurns?.at(-1)?.model || "n/a"}
              secondary={`${formatDuration(trace.execution?.totalDurationMs)} / total ${formatTokens(
                (trace.execution?.modelTurns ?? []).reduce(
                  (sum, turn) => sum + (turn.totalTokens ?? 0),
                  0
                ) || undefined
              )}`}
            />
          </div>

          {trace.execution?.modelTurns?.length ? (
            <div className="mt-4 space-y-3">
              {(trace.execution.modelTurns ?? []).map((turn) => (
                <div
                  key={`turn-${turn.turn}`}
                  className="rounded-[18px] border border-[rgba(72,57,39,0.08)] bg-white px-4 py-3 text-xs text-slate-600"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1">turn {turn.turn}</span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1">{turn.model}</span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1">
                      {formatDuration(turn.durationMs)}
                    </span>
                  </div>
                  <p className="mt-2">
                    input {formatTokens(turn.tokensIn)} / output {formatTokens(turn.tokensOut)} / total{" "}
                    {formatTokens(turn.totalTokens)}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </details>
    </div>
  );
}

function TelemetryCard({
  label,
  primary,
  secondary,
}: {
  label: string;
  primary: string;
  secondary: string;
}) {
  return (
    <div className="rounded-[18px] border border-[rgba(72,57,39,0.08)] bg-white px-4 py-3">
      <p className="section-label">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{primary}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{secondary}</p>
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function ChatPanel({ operatorId, storeId, regionId, issueContext, onClearIssue, operatorName }: ChatPanelProps) {
  const scopeKey = storeId || regionId || "global";
  const [input, setInput] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const chat = useAction(api.agent.chat);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const createFileRecord = useMutation(api.files.create);
  const messages = useQuery(
    api.messages.getBySession,
    sessionId
      ? {
          operatorId,
          sessionId,
          storeId,
          regionId,
        }
      : "skip"
  );
  const attachments = useQuery(
    api.files.getBySession,
    sessionId
      ? {
          operatorId,
          sessionId,
          storeId,
          regionId,
        }
      : "skip"
  );
  const events = useQuery(
    api.messages.getEventsBySession,
    sessionId
      ? {
          operatorId,
          sessionId,
          storeId,
          regionId,
        }
      : "skip"
  );

  useEffect(() => {
    if (issueContext) {
      // Thread mode: deterministic session ID per issue (persists across page loads)
      setSessionId(`session-${scopeKey}-thread-${issueContext.issueId}`);
    } else {
      // General mode: persisted session
      const sessionStorageKey = `ops-session-${scopeKey}`;
      const existing =
        typeof window !== "undefined" ? window.localStorage.getItem(sessionStorageKey) : null;
      const nextSession = existing || `session-${scopeKey}-${Date.now()}`;
      if (typeof window !== "undefined" && !existing) {
        window.localStorage.setItem(sessionStorageKey, nextSession);
      }
      setSessionId(nextSession);
    }
  }, [scopeKey, issueContext?.issueId]);

  useEffect(() => {
    const sidebarStorageKey = `ops-sidebar-open-${scopeKey}`;
    const stored =
      typeof window !== "undefined" ? window.localStorage.getItem(sidebarStorageKey) : null;
    if (stored !== null) {
      setIsOpen(stored === "true");
    }
  }, [scopeKey]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(`ops-sidebar-open-${scopeKey}`, String(isOpen));
    }
  }, [isOpen, scopeKey]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const suggestions = useMemo(
    () =>
      issueContext
        ? [
            `What's the current status of ${issueContext.issueId}?`,
            `What policy applies to this issue?`,
            `What are the recommended next steps for resolution?`,
          ]
        : storeId
          ? [
              "What issues need my attention right now?",
              "Review the current evidence and tell me what to escalate.",
              "What policy applies to our biggest open risk today?",
            ]
          : [
              "Which stores need intervention first?",
              "What cross-store patterns are emerging?",
              "Summarize the highest-risk escalations and next actions.",
            ],
    [storeId, issueContext?.issueId]
  );

  const latestMetadata = useMemo(() => {
    const assistant = [...(messages ?? [])]
      .sort((a: any, b: any) => a.createdAt - b.createdAt)
      .reverse()
      .find((message: any) => message.role === "assistant");
    return assistant ? parseMetadata(assistant.metadataJson) : null;
  }, [messages]);

  const latestTrace = latestMetadata?.trace ?? null;

  const sortedMessages = useMemo(
    () => [...(messages ?? [])].sort((a: any, b: any) => a.createdAt - b.createdAt),
    [messages]
  );

  const latestStreamEvent = useMemo(
    () => [...(events ?? [])].sort((a: any, b: any) => a.sequence - b.sequence).at(-1) ?? null,
    [events]
  );

  const activeAssistantMessage = useMemo(
    () =>
      [...sortedMessages]
        .reverse()
        .find((message: any) => message.role === "assistant" && message.status === "streaming") ?? null,
    [sortedMessages]
  );

  const liveStatusLabel =
    latestStreamEvent?.summary ||
    (loading
      ? activeAssistantMessage
        ? "Streaming assistant response..."
        : "Starting assistant run..."
      : null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if ((!input.trim() && files.length === 0) || loading || !sessionId) return;

    setError(null);
    setLoading(true);
    setIsOpen(true);
    const baseQuery = input.trim() || "Review the attached evidence and tell me the operational next step.";
    const query = issueContext
      ? `[Issue Thread: ${issueContext.issueId} — ${issueContext.title}]\n${issueContext.description}\n\nUser question: ${baseQuery}`
      : baseQuery;
    setInput("");

    try {
      const uploadedFiles =
        files.length > 0
          ? await uploadFilesToConvex({
              files,
              generateUploadUrl,
              createFileRecord,
              context: {
                operatorId,
                sessionId,
                storeId,
                regionId,
                uploadedBy: storeId
                  ? `Manager ${storeId}`
                  : `Regional Manager ${regionId || "REG-NE"}`,
              },
            })
          : [];

      await chat({
        operatorId,
        query,
        storeId,
        regionId,
        sessionId,
        fileIds: uploadedFiles.map((file) => file.fileId),
      });
      setFiles([]);
    } catch (caughtError: any) {
      setError(caughtError?.message || "The assistant could not complete that request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-5 right-5 z-40 rounded-[22px] border border-[rgba(72,57,39,0.12)] bg-white/95 px-4 py-3 shadow-xl backdrop-blur"
        >
          <p className="text-left text-xs uppercase tracking-[0.18em] text-slate-400">Assistant</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {storeId ? `Store ${storeId}` : `Region ${regionId || "REG-NE"}`}
          </p>
          {latestMetadata ? (
            <p className="mt-1 text-xs text-slate-500">
              {(latestTrace?.execution?.steps ?? []).length} steps / {(latestTrace?.sources ?? []).length} sources
            </p>
          ) : (
            <p className="mt-1 text-xs text-slate-500">Open the operator rail</p>
          )}
        </button>
      ) : null}

      <aside
        className={`fixed inset-y-3 right-3 z-50 flex w-[min(560px,calc(100vw-1.5rem))] flex-col rounded-[28px] border border-[rgba(72,57,39,0.12)] bg-[rgba(255,250,243,0.98)] shadow-2xl backdrop-blur transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-[110%]"
        }`}
      >
        <div className="border-b border-[rgba(72,57,39,0.08)] px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              {issueContext ? (
                <>
                  <div className="flex items-center gap-2">
                    {onClearIssue && (
                      <button
                        type="button"
                        onClick={onClearIssue}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                      >
                        &larr; All issues
                      </button>
                    )}
                  </div>
                  <h2 className="mt-1 text-sm font-semibold text-slate-900">
                    Thread: {issueContext.issueId}
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">
                    {issueContext.title}
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-sm font-semibold text-slate-900">AI Assistant</h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {storeId ? `Store: ${storeId}` : `Region: ${regionId || "All"}`}
                  </p>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600"
            >
              Collapse
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <TelemetryCard
              label="Mode"
              primary="Session retained"
              secondary="Scoped to current workspace"
            />
            <TelemetryCard
              label="Last run"
              primary={`${(latestTrace?.execution?.steps ?? []).length || 0} steps`}
              secondary={formatDuration(latestTrace?.execution?.totalDurationMs)}
            />
            <TelemetryCard
              label="Quality"
              primary={formatQualityStatus(latestMetadata?.quality?.status)}
              secondary={latestMetadata?.answerPacketId || "No answer packet yet"}
            />
            <TelemetryCard
              label="Sources"
              primary={(latestTrace?.sources ?? []).length ? `${(latestTrace?.sources ?? []).length} linked` : "Internal only"}
              secondary={(latestTrace?.sources ?? []).length ? "Cross-reference ready" : "No external search in last run"}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {(!messages || messages.length === 0) && !loading ? (
            <div className="space-y-5">
              {/* Daily greeting */}
              <div className="rounded-[20px] border border-dashed border-[rgba(72,57,39,0.14)] bg-[rgba(255,252,246,0.75)] p-5">
                <p className="text-sm font-semibold text-slate-900">
                  {getGreeting()}{operatorName ? `, ${operatorName}` : ""}.
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {issueContext
                    ? `Thread for ${issueContext.issueId}. Ask about status, policy, or next steps for this issue.`
                    : storeId
                      ? `Here's your workspace for store ${storeId}. Ask for triage, policy interpretation, risk summaries, or upload evidence.`
                      : `Here's your regional overview${regionId ? ` for ${regionId}` : ""}. Ask about store performance, escalations, or cross-store patterns.`}
                </p>
              </div>
              <div className="grid gap-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInput(suggestion)}
                    className="rounded-[18px] border border-[rgba(72,57,39,0.12)] bg-white/90 px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-white"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="mb-4 rounded-[18px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="space-y-5">
            {sortedMessages.map((message: any) => {
              const messageAttachments = (attachments ?? []).filter((attachment: any) =>
                message.fileIds?.includes(attachment.fileId)
              );
              const metadata = parseMetadata(message.metadataJson);

              return (
                <div
                  key={message._id}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`w-full max-w-[96%] rounded-[24px] px-4 py-4 ${
                      message.role === "user"
                        ? "bg-[linear-gradient(135deg,#115e59_0%,#0f766e_100%)] text-white shadow-lg"
                        : "border border-[rgba(72,57,39,0.12)] bg-white/95 shadow-[0_14px_30px_rgba(33,27,20,0.05)]"
                    }`}
                  >
                    {message.role === "assistant" ? (
                      <div className="space-y-3">
                        {message.status === "streaming" ? (
                          <div className="inline-flex items-center gap-2 rounded-full border border-teal-100 bg-teal-50 px-3 py-1 text-[11px] font-medium text-teal-700">
                            <span className="h-2 w-2 animate-pulse rounded-full bg-teal-500" />
                            Streaming
                          </div>
                        ) : null}
                        <AssistantMarkdown content={message.content || (message.status === "streaming" ? " " : "")} />
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap text-sm leading-7">{message.content}</p>
                    )}

                    {messageAttachments.length ? (
                      <div className="mt-4">
                        <AttachmentList attachments={messageAttachments} compact />
                      </div>
                    ) : null}

                    {message.role === "assistant" ? (
                      <div className="mt-5 space-y-3">
                        {message.references?.length ? (
                          <div className="flex flex-wrap gap-2">
                            {message.references.map((reference: string) => (
                              <span
                                key={reference}
                                className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-600"
                              >
                                {reference}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        <SourceCards sources={metadata?.trace?.sources} />
                        <QualityChecks
                          quality={metadata?.quality}
                          answerPacketId={metadata?.answerPacketId}
                        />
                        <TraceDetails trace={metadata?.trace ?? null} />
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}

            {loading ? (
              <div className="flex justify-start">
                <div className="w-full rounded-[20px] border border-[rgba(72,57,39,0.12)] bg-white/95 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:0.15s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:0.3s]" />
                    </div>
                    <p className="text-xs text-slate-500">{liveStatusLabel || "Working..."}</p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
          <div ref={messagesEndRef} />
        </div>

        <form
          onSubmit={handleSubmit}
          className="border-t border-[rgba(72,57,39,0.08)] bg-[rgba(255,252,246,0.92)] px-5 py-4"
        >
          {files.length ? (
            <div className="mb-3 space-y-2">
              {files.map((file, index) => (
                <div
                  key={`${file.name}-${file.size}-${index}`}
                  className="flex items-center justify-between gap-3 rounded-[18px] border border-[rgba(72,57,39,0.12)] bg-white px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{file.name}</p>
                    <p className="truncate text-xs text-slate-500">
                      {(file.type || "application/octet-stream").replace("/", " / ")} /{" "}
                      {formatFileSize(file)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))
                    }
                    className="btn-secondary px-3 py-1.5 text-[11px]"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="btn-secondary flex w-full cursor-pointer items-center justify-center px-4 py-3 sm:w-auto">
                Attach evidence
                <input
                  name="chatAttachments"
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(event) => {
                    const selected = Array.from(event.target.files ?? []);
                    if (selected.length > 0) {
                      setFiles((current) => [...current, ...selected]);
                    }
                    event.target.value = "";
                  }}
                  disabled={loading}
                />
              </label>
              <input
                name="chatInput"
                type="text"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask about risk, policy, escalation, or the attached evidence."
                className="field-input flex-1"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || (!input.trim() && files.length === 0) || !sessionId}
                className="btn-primary w-full sm:w-auto"
              >
                Send
              </button>
            </div>
          </div>
        </form>
      </aside>
    </>
  );
}

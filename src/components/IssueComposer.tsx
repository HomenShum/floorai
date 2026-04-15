"use client";

import { FormEvent, useMemo, useState } from "react";
import { useMutation } from "convex/react";

import { api } from "../../convex/_generated/api";
import { uploadFilesToConvex } from "@/lib/fileUploads";

interface IssueComposerProps {
  operatorId: string;
  storeId: string;
  regionId: string;
  reporterName: string;
  reporterRole: "store_manager" | "regional_manager";
}

const issueTypes = [
  "inventory_gap",
  "staffing",
  "equipment_failure",
  "compliance",
  "customer_escalation",
  "operational",
];

const severities = ["low", "medium", "high", "critical"];

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

export function IssueComposer({
  operatorId,
  storeId,
  regionId,
  reporterName,
  reporterRole,
}: IssueComposerProps) {
  const createIssue = useMutation(api.issues.create);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const createFileRecord = useMutation(api.files.create);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [issueType, setIssueType] = useState("operational");
  const [severity, setSeverity] = useState("medium");
  const [estimatedRevenueImpact, setEstimatedRevenueImpact] = useState("0");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(
    () => title.trim() && description.trim() && !submitting,
    [title, description, submitting]
  );

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const createdIssue = await createIssue({
        operatorId,
        storeId,
        regionId,
        title: title.trim(),
        description: description.trim(),
        issueType,
        severity,
        reporterName,
        reporterRole,
        estimatedRevenueImpact: Number(estimatedRevenueImpact) || 0,
      });

      if (files.length > 0) {
        await uploadFilesToConvex({
          files,
          generateUploadUrl,
          createFileRecord,
          context: {
            operatorId,
            issueId: createdIssue.issueId,
            storeId,
            regionId,
            uploadedBy: reporterName,
          },
        });
      }

      setTitle("");
      setDescription("");
      setIssueType("operational");
      setSeverity("medium");
      setEstimatedRevenueImpact("0");
      setFiles([]);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="glass-panel p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="section-label">Issue Intake</p>
          <h3 className="mt-1 text-xl font-semibold text-slate-900">File a new operational issue</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Capture what changed, how severe it is, the commercial impact, and the evidence
            needed for policy-backed decisions.
          </p>
        </div>
        <div className="rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-xs text-slate-500">
          {storeId}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <input
              name="issueTitle"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Short issue title"
              className="field-input"
            />
            <textarea
              name="issueDescription"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe what is happening, what is blocked, and the business impact."
              className="field-input min-h-32 resize-none"
            />
          </div>

          <div className="panel-strong p-4">
            <p className="section-label">Classification</p>
            <div className="mt-3 space-y-3">
              <select
                name="issueType"
                value={issueType}
                onChange={(event) => setIssueType(event.target.value)}
                className="field-input"
              >
                {issueTypes.map((option) => (
                  <option key={option} value={option}>
                    {option.replace("_", " ")}
                  </option>
                ))}
              </select>
              <select
                name="severity"
                value={severity}
                onChange={(event) => setSeverity(event.target.value)}
                className="field-input"
              >
                {severities.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <input
                name="estimatedRevenueImpact"
                value={estimatedRevenueImpact}
                onChange={(event) => setEstimatedRevenueImpact(event.target.value)}
                placeholder="Estimated revenue impact"
                className="field-input"
              />
            </div>
          </div>
        </div>

        <div className="panel-strong border-dashed p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="section-label">Evidence Uploads</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Add photos, video, PDFs, or supporting documents for the issue record and AI
                review.
              </p>
            </div>
            <label className="btn-secondary w-fit cursor-pointer px-4 py-2.5">
              Add files
              <input
                name="issueAttachments"
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
              />
            </label>
          </div>

          {files.length ? (
            <div className="mt-4 grid gap-2">
              {files.map((file, index) => (
                <div
                  key={`${file.name}-${file.size}-${index}`}
                  className="flex items-center justify-between gap-3 rounded-[18px] border border-[rgba(72,57,39,0.12)] bg-white px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{file.name}</p>
                    <p className="truncate text-xs text-slate-500">
                      {(file.type || "application/octet-stream").replace("/", " / ")} /{" "}
                      {formatFileSize(file.size)}
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
        </div>

        <div className="flex flex-col gap-3 border-t border-[rgba(72,57,39,0.08)] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-slate-500">
            New issues are immediately available to chat, regional review, and action-item
            generation.
          </p>
          <button type="submit" disabled={!canSubmit} className="btn-primary w-full sm:w-auto">
            {submitting ? "Creating issue..." : "Create issue"}
          </button>
        </div>
      </form>
    </section>
  );
}

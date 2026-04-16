import { v } from "convex/values";

import { api, internal } from "./_generated/api";
import { action } from "./_generated/server";

const MODEL_NAME = "gemini-3.1-pro-preview";
const PLANNER_MODEL_NAME = "gemini-3.1-flash-lite-preview";
const INLINE_ATTACHMENT_MAX_BYTES = 4 * 1024 * 1024;

function escapeForRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type ChatActionResult = {
  answer: string;
  trace: any;
  messageId: any;
  answerPacketId: string | null;
  quality: any;
};

const FUNCTION_DECLARATIONS = [
  {
    name: "search_issues",
    description:
      "Search for operational issues. Can filter by store, type, severity, status, or keyword. Use store_id='ALL' to search all stores.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        store_id: {
          type: "string",
          description: "Store ID (e.g., STR-101). Use 'ALL' for all stores.",
        },
        issue_type: {
          type: "string",
          description:
            "Filter: inventory_gap, staffing, equipment_failure, compliance, customer_escalation, operational, theft_shrinkage, strategic, cross_store_pattern",
        },
        severity: {
          type: "string",
          description: "Filter: critical, high, medium, low",
        },
        status: {
          type: "string",
          description: "Filter: open, in_progress, resolved",
        },
        keyword: {
          type: "string",
          description: "Optional keyword such as vendor, cooler, legal, or ISS-003.",
        },
      },
      required: ["store_id"],
    },
  },
  {
    name: "search_policies",
    description:
      "Search company policies by policy ID or keyword. Returns policy references that should ground the recommendation.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        policy_id: {
          type: "string",
          description: "Policy ID (e.g., POL-INV-003)",
        },
        keyword: {
          type: "string",
          description: "Search keyword, such as vendor, staffing, or legal",
        },
      },
    },
  },
  {
    name: "lookup_inventory",
    description:
      "Look up inventory levels for a store. Returns stock quantities, reorder points, supplier info, last delivery dates.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        store_id: {
          type: "string",
          description: "Store ID (e.g., STR-101)",
        },
        sku: {
          type: "string",
          description: "Optional specific product SKU (e.g., SKU-4411)",
        },
      },
      required: ["store_id"],
    },
  },
  {
    name: "search_past_resolutions",
    description:
      "Search historical resolved cases for similar operational issues and what worked previously.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        issue_type: {
          type: "string",
          description:
            "Optional issue type such as staffing, inventory_gap, equipment_failure, or customer_escalation",
        },
        query: {
          type: "string",
          description: "Free-text description of the current issue or desired precedent",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_store_metrics",
    description:
      "Get store metrics including open issues, critical issues, low-stock count, revenue impact, and latest staffing snapshot.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        store_id: {
          type: "string",
          description: "Store ID (e.g., STR-101)",
        },
      },
      required: ["store_id"],
    },
  },
  {
    name: "get_regional_summary",
    description:
      "Get aggregate operational summary for a region including critical issues, at-risk stores, open action items, and estimated revenue impact.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        region_id: {
          type: "string",
          description: "Region ID (e.g., REG-NE)",
        },
      },
      required: ["region_id"],
    },
  },
  {
    name: "create_action_item",
    description:
      "Create a tracked follow-up action item for a store or region when the recommendation requires owner and due date.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        issue_id: { type: "string" },
        store_id: { type: "string" },
        region_id: { type: "string" },
        title: { type: "string" },
        description: { type: "string" },
        assignee: { type: "string" },
        priority: {
          type: "string",
          description: "critical, high, medium, or low",
        },
        due_at: {
          type: "string",
          description: "ISO timestamp if the work is time-sensitive",
        },
      },
      required: ["title", "description", "assignee", "priority"],
    },
  },
  {
    name: "create_issue",
    description:
      "Create a new issue when the user is reporting something not already tracked.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        store_id: { type: "string" },
        region_id: { type: "string" },
        title: { type: "string" },
        description: { type: "string" },
        issue_type: { type: "string" },
        severity: { type: "string" },
        reporter_name: { type: "string" },
        reporter_role: { type: "string" },
        related_policy: { type: "string" },
        affected_sku: { type: "string" },
        estimated_revenue_impact: { type: "number" },
      },
      required: [
        "store_id",
        "region_id",
        "title",
        "description",
        "issue_type",
        "severity",
        "reporter_name",
        "reporter_role",
        "estimated_revenue_impact",
      ],
    },
  },
];

const TOOLS = [{ googleSearch: {} }, { functionDeclarations: FUNCTION_DECLARATIONS }];

function bytesToBase64(bytes: Uint8Array) {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let output = "";

  for (let index = 0; index < bytes.length; index += 3) {
    const a = bytes[index] ?? 0;
    const b = bytes[index + 1] ?? 0;
    const c = bytes[index + 2] ?? 0;
    const triple = (a << 16) | (b << 8) | c;

    output += alphabet[(triple >> 18) & 0x3f];
    output += alphabet[(triple >> 12) & 0x3f];
    output += index + 1 < bytes.length ? alphabet[(triple >> 6) & 0x3f] : "=";
    output += index + 2 < bytes.length ? alphabet[triple & 0x3f] : "=";
  }

  return output;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function safeJsonStringify(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return JSON.stringify({ error: "serialization_failed" });
  }
}

function extractUsageTelemetry(response: any) {
  const usage = response?.usageMetadata ?? {};
  return {
    tokensIn: usage.promptTokenCount ?? usage.inputTokenCount,
    tokensOut: usage.candidatesTokenCount ?? usage.outputTokenCount,
    totalTokens: usage.totalTokenCount,
  };
}

function extractGroundingUrls(response: any): string[] {
  const chunks = response?.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const urls = chunks
    .map((chunk: any) => chunk?.web?.uri)
    .filter((value: string | undefined) => Boolean(value));
  return Array.from(new Set(urls));
}

function extractGroundingSources(response: any) {
  const chunks = response?.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const deduped = new Map<string, any>();

  for (const chunk of chunks) {
    const url = chunk?.web?.uri;
    if (!url || deduped.has(url)) {
      continue;
    }
    let domain = url;
    try {
      domain = new URL(url).hostname.replace(/^www\./, "");
    } catch {
      domain = url;
    }
    deduped.set(url, {
      rawUrl: url,
      url,
      domain,
      title: chunk?.web?.title,
      snippet: chunk?.retrievedContext,
    });
  }

  return Array.from(deduped.values());
}

function extractTextParts(
  response: any,
  options?: {
    trim?: boolean;
    separator?: string;
  }
): string {
  const parts = response?.candidates?.[0]?.content?.parts ?? [];
  const text = parts
    .map((part: any) => (typeof part?.text === "string" ? part.text : ""))
    .filter(Boolean)
    .join(options?.separator ?? "\n");
  return options?.trim === false ? text : text.trim();
}

function extractAssistantText(response: any): string {
  return extractTextParts(response, {
    trim: true,
    separator: "\n",
  });
}

function extractFunctionCalls(response: any) {
  const parts = response?.candidates?.[0]?.content?.parts ?? [];
  return parts
    .map((part: any) => part?.functionCall)
    .filter((call: any) => Boolean(call));
}

function appendReference(values: Set<string>, value: unknown) {
  if (typeof value === "string" && value.trim()) {
    values.add(value.trim());
  }
}

function humanizeSummaryKey(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatSummaryValue(key: string, value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number") {
    if (/revenue|impact|cost|loss|risk|spend|value/i.test(key)) {
      return `$${value.toLocaleString()}`;
    }
    return value.toLocaleString();
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "string") {
    return value.length > 80 ? `${value.slice(0, 77)}...` : value;
  }

  return null;
}

function summarizeResult(result: unknown): string {
  if (Array.isArray(result)) {
    if (result.length === 0) {
      return "0 records returned";
    }
    const sample = result
      .slice(0, 3)
      .map((item: any) => item?.issueId || item?.policyId || item?.resolutionId || item?.actionItemId || item?.title)
      .filter(Boolean)
      .join(", ");
    return `${result.length} records returned${sample ? ` (${sample})` : ""}`;
  }

  if (!result) {
    return "No result";
  }

  if (typeof result === "string") {
    return result.slice(0, 220);
  }

  if (typeof result === "object") {
    const preview = ["issueId", "policyId", "resolutionId", "actionItemId", "title"]
      .map((field) => (result as any)[field])
      .filter(Boolean)
      .join(", ");
    if (preview) {
      return preview;
    }

    const scalarPreview = Object.entries(result as Record<string, unknown>)
      .map(([key, value]) => {
        const formatted = formatSummaryValue(key, value);
        return formatted ? `${humanizeSummaryKey(key)}: ${formatted}` : null;
      })
      .filter(Boolean)
      .slice(0, 4)
      .join(" / ");

    if (scalarPreview) {
      return scalarPreview;
    }

    const keys = Object.keys(result as Record<string, unknown>);
    if (keys.length) {
      return `Object result with ${keys.length} fields: ${keys
        .slice(0, 5)
        .map(humanizeSummaryKey)
        .join(", ")}`;
    }

    return "Object result returned";
  }

  return String(result).slice(0, 220);
}

function deriveKeywordFromQuery(query: string) {
  const cleaned = query
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3)
    .slice(0, 6)
    .join(" ");
  return cleaned || query;
}

function shouldUseWebSearch(query: string) {
  return /\b(today|latest|recent|current|vendor|regulation|osha|weather|news|legal|competitor|market|external)\b/i.test(
    query
  );
}

function extractFirstJsonBlock(text: string) {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }
  return null;
}

function buildHistoryContents(messages: any[]) {
  const sorted = [...messages].sort((a, b) => a.createdAt - b.createdAt).slice(-10);
  return sorted.map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [
      {
        text:
          message.fileIds?.length > 0
            ? `${message.content}\n\nAttached evidence: ${message.fileIds.join(", ")}`
            : message.content,
      },
    ],
  }));
}

function formatAttachmentSize(sizeBytes: number) {
  if (sizeBytes >= 1024 * 1024) {
    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (sizeBytes >= 1024) {
    return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
  }
  return `${sizeBytes} B`;
}

function supportsInlineAttachment(file: any) {
  return (
    Boolean(file.storageId) &&
    file.sizeBytes <= INLINE_ATTACHMENT_MAX_BYTES &&
    (file.mimeType.startsWith("image/") || file.mimeType === "application/pdf")
  );
}

async function buildAttachmentContext(ctx: any, files: any[]) {
  const parts: any[] = [];
  const summaries: string[] = [];

  for (const file of files) {
    let summary = `- ${file.filename} (${file.fileCategory}, ${formatAttachmentSize(file.sizeBytes)})`;
    if (supportsInlineAttachment(file)) {
      const blob = await ctx.storage.get(file.storageId);
      if (blob) {
        const bytes = bytesToBase64(new Uint8Array(await blob.arrayBuffer()));
        parts.push({
          inlineData: {
            data: bytes,
            mimeType: file.mimeType,
          },
        });
        summary += " [included for model inspection]";
      }
    } else if (
      file.storageId &&
      file.sizeBytes <= INLINE_ATTACHMENT_MAX_BYTES &&
      (file.mimeType.startsWith("text/") || file.mimeType === "application/json")
    ) {
      const blob = await ctx.storage.get(file.storageId);
      const text = blob ? (await blob.text()).slice(0, 12000) : "";
      if (text) {
        parts.push({
          text: `Attachment ${file.filename} contents:\n${text}`,
        });
        summary += " [text extracted]";
      }
    } else if (file.fileCategory === "video") {
      summary += " [video stored; not inlined]";
    }
    summaries.push(summary);
  }

  return { parts, summaries };
}

function formatIssueLine(issue: any) {
  const extras = [
    issue.storeId && issue.storeId !== "STR-ALL" ? issue.storeId : null,
    issue.severity,
    issue.status,
    issue.relatedPolicy,
    issue.affectedSku,
    typeof issue.estimatedRevenueImpact === "number" && issue.estimatedRevenueImpact > 0
      ? `$${issue.estimatedRevenueImpact}`
      : null,
  ].filter(Boolean);
  return `- ${issue.issueId}: ${issue.title}${extras.length ? ` (${extras.join(" / ")})` : ""}\n  ${issue.description}`;
}

function formatPolicyLine(policy: any) {
  return `- ${policy.policyId}: ${policy.title}\n  ${String(policy.content ?? "").slice(0, 240)}`;
}

function formatInventoryLine(item: any) {
  return `- ${item.sku}: ${item.productName} / stock ${item.currentStock} / reorder ${item.reorderPoint} / supplier ${item.supplier}`;
}

function formatResolutionLine(resolution: any) {
  return `- ${resolution.resolutionId}: ${resolution.title}\n  Outcome: ${resolution.outcome}\n  Actions: ${(resolution.actionsTaken ?? []).join("; ")}`;
}

function formatBriefForPrompt(brief: any, query?: string) {
  const lowerQuery = String(query ?? "").toLowerCase();
  const primaryIssueType = brief.matchedIssues?.[0]?.issueType;
  const includeInventory =
    primaryIssueType === "inventory_gap" ||
    /\binventory\b|\bdelivery\b|\bstock\b|\bsku\b|\bmilk\b|\bproduce\b/.test(lowerQuery);
  const includeStaffing =
    primaryIssueType === "staffing" ||
    /\bstaff|\bcall out|\bcoverage|\bovertime|\bshift\b/.test(lowerQuery);
  const includeResolutions =
    /\bbefore\b|\bresolved\b|\bwhat happened\b|\bwhat worked\b|\bprecedent\b|\bhistorical\b/.test(
      lowerQuery
    );

  return `Scope summary:
- storeId: ${brief.scope?.storeId ?? "n/a"}
- regionId: ${brief.scope?.regionId ?? "n/a"}
- openIssueCount: ${brief.scope?.openIssueCount ?? 0}
- estimatedRevenueImpact: ${brief.scope?.estimatedRevenueImpact ?? 0}

Matched issues:
${brief.matchedIssues?.length ? brief.matchedIssues.slice(0, 3).map(formatIssueLine).join("\n") : "- none"}

Cross-store related issues:
${brief.crossStoreRelatedIssues?.length ? brief.crossStoreRelatedIssues.slice(0, 3).map(formatIssueLine).join("\n") : "- none"}

Policies:
${brief.policies?.length ? brief.policies.slice(0, 3).map(formatPolicyLine).join("\n") : "- none"}

Inventory highlights:
${includeInventory && brief.inventoryHighlights?.length ? brief.inventoryHighlights.slice(0, 3).map(formatInventoryLine).join("\n") : "- omitted"}

Latest staffing:
${includeStaffing && brief.latestStaffing ? safeJsonStringify(brief.latestStaffing) : "- omitted"}

Regional staffing pressure:
${includeStaffing && brief.highRiskStaffing?.length ? brief.highRiskStaffing.map((row: any) => `- ${row.storeId}: no-shows ${row.noShowCount}, risk ${row.staffingRisk}`).join("\n") : "- omitted"}

Historical resolutions:
${includeResolutions && brief.resolutions?.length ? brief.resolutions.map(formatResolutionLine).join("\n") : "- omitted"}`;
}

function collectBriefReferences(references: Set<string>, brief: any) {
  for (const issue of [...(brief.matchedIssues ?? []), ...(brief.crossStoreRelatedIssues ?? [])]) {
    appendReference(references, issue.issueId);
    appendReference(references, issue.relatedPolicy);
    appendReference(references, issue.affectedSku);
    appendReference(references, issue.storeId);
  }
  for (const policy of brief.policies ?? []) {
    appendReference(references, policy.policyId);
  }
  for (const item of brief.inventoryHighlights ?? []) {
    appendReference(references, item.sku);
  }
}

function answerNeedsCoverageFallback(answer: string, brief: any) {
  const normalized = answer.toLowerCase();
  const primaryIssue = brief.matchedIssues?.[0];
  const primaryPolicy = brief.policies?.[0] ?? (primaryIssue?.relatedPolicy ? { policyId: primaryIssue.relatedPolicy } : null);
  const expectedCrossStore = (brief.crossStoreRelatedIssues?.length ?? 0) > 0;
  const expectedRevenue =
    typeof primaryIssue?.estimatedRevenueImpact === "number"
      ? primaryIssue.estimatedRevenueImpact > 0
      : (brief.scope?.estimatedRevenueImpact ?? 0) > 0;

  if (primaryIssue?.issueId && !new RegExp(`\\b${escapeForRegex(String(primaryIssue.issueId))}\\b`, "i").test(normalized)) {
    return true;
  }
  if (primaryPolicy?.policyId && !new RegExp(`\\b${escapeForRegex(String(primaryPolicy.policyId))}\\b`, "i").test(normalized)) {
    return true;
  }
  if (expectedCrossStore && !/\bcross-store\b|\bsystemic\b|\bmultiple stores\b|\bpattern\b/i.test(answer)) {
    return true;
  }
  if (expectedRevenue && !/\$\d|revenue impact|impact:/i.test(answer)) {
    return true;
  }
  return false;
}

function extractPolicySteps(content: string) {
  const starts = Array.from(content.matchAll(/\((\d+)\)\s*/g));
  if (starts.length === 0) {
    return [];
  }

  return starts.map((match, index) => {
    const start = match.index! + match[0].length;
    const end = index + 1 < starts.length ? starts[index + 1].index! : content.length;
    return `${match[1]}. ${content.slice(start, end).trim()}`;
  });
}

function shouldUseDeterministicIssueAnswer(query: string, brief: any, hasExternalSources: boolean) {
  if (hasExternalSources) {
    return false;
  }
  if (!brief?.matchedIssues?.length || !brief?.policies?.length) {
    return false;
  }
  return !/\bsummary\b|\beverything\b|\bcompare\b|\btrend\b|\bregional\b|\bfull picture\b/i.test(query);
}

function buildDeterministicIssueAnswer(args: any, brief: any) {
  const primaryIssue = brief.matchedIssues?.[0];
  const primaryPolicy =
    brief.policies?.find((policy: any) => policy.policyId === primaryIssue?.relatedPolicy) ??
    brief.policies?.[0];

  if (!primaryIssue || !primaryPolicy) {
    return null;
  }

  const lines: string[] = [];
  const policySteps = extractPolicySteps(String(primaryPolicy.content ?? ""));
  const relatedInventory = (brief.inventoryHighlights ?? []).find(
    (item: any) => item.sku && item.sku === primaryIssue.affectedSku
  );
  const relatedCrossStore = (brief.crossStoreRelatedIssues ?? []).slice(0, 2);
  const immediatePolicySteps =
    args.storeId && primaryIssue.issueType === "inventory_gap"
      ? policySteps.slice(0, 4)
      : policySteps;

  if (args.storeId) {
    lines.push(
      `**${primaryIssue.issueId}** is already tracking this: ${primaryIssue.title}. ${primaryIssue.description}`
    );
  } else {
    lines.push(
      `The most urgent tracked issue is **${primaryIssue.issueId}**: ${primaryIssue.title}. ${primaryIssue.description}`
    );
  }

  if (relatedInventory) {
    lines.push(
      `Current inventory signal: **${relatedInventory.sku}** is at ${relatedInventory.currentStock} units versus a reorder point of ${relatedInventory.reorderPoint}.`
    );
  }

  if (primaryIssue.issueType === "staffing" && brief.latestStaffing) {
    lines.push(
      `Latest staffing snapshot: ${brief.latestStaffing.actualCount} of ${brief.latestStaffing.scheduledCount} scheduled associates are on the floor, with ${brief.latestStaffing.noShowCount} call-outs.`
    );
  }

  lines.push(`Per **${primaryPolicy.policyId} (${primaryPolicy.title})**:`);
  lines.push(immediatePolicySteps.join("\n"));

  if (relatedCrossStore.length > 0) {
    lines.push(
      `Cross-store pattern confirmed: ${relatedCrossStore
        .map((issue: any) => `${issue.issueId} (${issue.storeId})`)
        .join(", ")} show the same pattern.`
    );
  }

  if (primaryIssue.escalatedToRegional && primaryIssue.severity === "critical") {
    lines.push("This issue has already been escalated to regional.");
  }

  if (
    typeof primaryIssue.estimatedRevenueImpact === "number" &&
    primaryIssue.estimatedRevenueImpact > 0
  ) {
    lines.push(
      `Estimated revenue impact: **$${primaryIssue.estimatedRevenueImpact.toLocaleString()}**.`
    );
  }

  return lines.join("\n\n");
}

function makeRuntimeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
}

function extractTrackedReferences(text: string) {
  return Array.from(
    new Set((text.match(/\b(?:ISS|POL|SKU|STR)-[A-Z0-9-]+\b/gi) ?? []).map((value) => value.toUpperCase()))
  );
}

function buildAllowedReferences(brief: any, references: Set<string>) {
  const allowed = new Set<string>();

  for (const reference of references) {
    appendReference(allowed, reference);
  }
  collectBriefReferences(allowed, brief);

  for (const resolution of brief.resolutions ?? []) {
    appendReference(allowed, resolution.resolutionId);
    appendReference(allowed, resolution.issueId);
  }
  for (const store of brief.stores ?? []) {
    appendReference(allowed, store.storeId);
  }

  return allowed;
}

function buildQualityReport(
  answer: string,
  query: string,
  brief: any,
  references: Set<string>,
  sourceRefs: Map<string, any>
) {
  const normalized = answer.toLowerCase();
  const primaryIssue = brief.matchedIssues?.[0];
  const primaryPolicy =
    brief.policies?.find((policy: any) => policy.policyId === primaryIssue?.relatedPolicy) ??
    brief.policies?.[0] ??
    (primaryIssue?.relatedPolicy ? { policyId: primaryIssue.relatedPolicy } : null);
  const expectedCrossStore =
    (brief.crossStoreRelatedIssues?.length ?? 0) > 0 ||
    (!brief.scope?.storeId && (brief.matchedIssues?.length ?? 0) > 1);
  const expectedRevenue =
    typeof primaryIssue?.estimatedRevenueImpact === "number"
      ? primaryIssue.estimatedRevenueImpact > 0
      : (brief.scope?.estimatedRevenueImpact ?? 0) > 0;
  const multiIssueQuestion =
    !brief.scope?.storeId ||
    /\bsummary\b|\bfull picture\b|\bpattern\b|\btrend\b|\bcompare\b|\bwhich stores\b|\bintervention\b|\bregional\b/i.test(
      query
    );
  const answerRefs = extractTrackedReferences(answer);
  const answerStores = new Set(answerRefs.filter((reference) => reference.startsWith("STR-")));
  const allowedRefs = buildAllowedReferences(brief, references);
  const unsupportedRefs = answerRefs.filter((reference) => !allowedRefs.has(reference));
  const checks: Array<{
    key: string;
    label: string;
    passed: boolean;
    severity: "error" | "warning";
    message: string;
  }> = [];

  const addCheck = (
    key: string,
    label: string,
    passed: boolean,
    message: string,
    severity: "error" | "warning"
  ) => {
    checks.push({ key, label, passed, message, severity });
  };

  addCheck(
    "primary_issue",
    "Tracked issue reference",
    !primaryIssue || new RegExp(`\\b${escapeForRegex(String(primaryIssue.issueId))}\\b`, "i").test(normalized),
    primaryIssue
      ? new RegExp(`\\b${escapeForRegex(String(primaryIssue.issueId))}\\b`, "i").test(normalized)
        ? `Final answer explicitly references ${primaryIssue.issueId}.`
        : `Final answer is missing tracked issue ${primaryIssue.issueId}.`
      : "No primary issue was required for this answer.",
    "error"
  );

  addCheck(
    "governing_policy",
    "Governing policy reference",
    !primaryPolicy || new RegExp(`\\b${escapeForRegex(String(primaryPolicy.policyId))}\\b`, "i").test(normalized),
    primaryPolicy
      ? new RegExp(`\\b${escapeForRegex(String(primaryPolicy.policyId))}\\b`, "i").test(normalized)
        ? `Final answer explicitly references ${primaryPolicy.policyId}.`
        : `Final answer is missing governing policy ${primaryPolicy.policyId}.`
      : "No governing policy was required for this answer.",
    "error"
  );

  addCheck(
    "action_steps",
    "Actionable next steps",
    /(?:^|\n)\s*(?:\d+\.|-)\s+\S/m.test(answer) || /\bnext steps?\b|\bimmediate actions?\b/i.test(answer),
    /(?:^|\n)\s*(?:\d+\.|-)\s+\S/m.test(answer) || /\bnext steps?\b|\bimmediate actions?\b/i.test(answer)
      ? "The answer includes explicit next-step structure."
      : "The answer needs clearer action sequencing for the operator.",
    multiIssueQuestion ? "warning" : "error"
  );

  addCheck(
    "revenue_impact",
    "Commercial impact",
    !expectedRevenue || /\$\d|revenue impact|at risk|loss(es)?/i.test(answer),
    expectedRevenue
      ? /\$\d|revenue impact|at risk|loss(es)?/i.test(answer)
        ? "The answer quantifies business impact."
        : "Expected commercial impact is missing from the answer."
      : "No revenue-impact mention was required.",
    "warning"
  );

  addCheck(
    "cross_store_pattern",
    "Cross-store pattern",
    !expectedCrossStore ||
      /\bcross-store\b|\bsystemic\b|\bmultiple stores\b|\bpattern\b/i.test(answer) ||
      answerStores.size >= 2,
    expectedCrossStore
      ? /\bcross-store\b|\bsystemic\b|\bmultiple stores\b|\bpattern\b/i.test(answer) ||
        answerStores.size >= 2
        ? "The answer makes the broader pattern explicit."
        : "The answer should make the cross-store pattern more explicit."
      : "No broader cross-store pattern was required.",
    "warning"
  );

  addCheck(
    "priority_order",
    "Priority ordering",
    !multiIssueQuestion ||
      /(?:^|\n)\s*\d+\.\s/m.test(answer) ||
      /\bpriority\b|\bfirst\b|\bsecond\b|\bstart with\b/i.test(answer),
    multiIssueQuestion
      ? /(?:^|\n)\s*\d+\.\s/m.test(answer) || /\bpriority\b|\bfirst\b|\bsecond\b|\bstart with\b/i.test(answer)
        ? "The answer makes prioritization explicit."
        : "Regional or multi-issue answers should spell out priority order."
      : "Priority ordering is optional for this request.",
    "warning"
  );

  addCheck(
    "unsupported_refs",
    "Reference integrity",
    unsupportedRefs.length === 0,
    unsupportedRefs.length === 0
      ? "All referenced IDs are backed by the current evidence packet."
      : `Unsupported IDs detected in the answer: ${unsupportedRefs.join(", ")}.`,
    "error"
  );

  const externalFactsQuestion = shouldUseWebSearch(query);
  addCheck(
    "external_source_backing",
    "External source backing",
    !externalFactsQuestion || sourceRefs.size > 0,
    externalFactsQuestion
      ? sourceRefs.size > 0
        ? `External-current question is backed by ${sourceRefs.size} grounded source${sourceRefs.size === 1 ? "" : "s"}.`
        : "External-current question was answered without grounded external sources."
      : "No external grounding was required.",
    "warning"
  );

  const failedErrors = checks.filter((check) => !check.passed && check.severity === "error").length;
  const failedWarnings = checks.filter((check) => !check.passed && check.severity === "warning").length;
  const status = failedErrors > 0 ? "fail" : failedWarnings > 0 ? "warning" : "pass";
  const summary =
    status === "pass"
      ? "All runtime quality checks passed."
      : status === "warning"
        ? `${failedWarnings} advisory quality check${failedWarnings === 1 ? "" : "s"} need attention.`
        : `${failedErrors} blocking quality check${failedErrors === 1 ? "" : "s"} failed.`;

  return {
    status,
    summary,
    checks,
    unsupportedRefs,
    referencedIds: answerRefs,
  };
}

function normalizeContents(contents: any) {
  if (typeof contents === "string") {
    return [
      {
        role: "user",
        parts: [{ text: contents }],
      },
    ];
  }

  if (Array.isArray(contents)) {
    return contents;
  }

  return [
    {
      role: "user",
      parts: [{ text: String(contents ?? "") }],
    },
  ];
}

function buildGenerateContentPayload(request: any) {
  const config = request?.config ?? {};
  const payload: Record<string, any> = {
    contents: normalizeContents(request.contents),
  };

  if (config.systemInstruction) {
    payload.systemInstruction = {
      parts: [{ text: config.systemInstruction }],
    };
  }

  if (config.tools) {
    payload.tools = config.tools;
  }

  if (config.toolConfig) {
    payload.toolConfig = config.toolConfig;
  }

  const generationConfig: Record<string, any> = {};
  if (config.temperature !== undefined) {
    generationConfig.temperature = config.temperature;
  }
  if (config.responseMimeType) {
    generationConfig.responseMimeType = config.responseMimeType;
  }
  if (Object.keys(generationConfig).length > 0) {
    payload.generationConfig = generationConfig;
  }

  return payload;
}

async function generateContentWithRetry(apiKey: string, request: any, maxAttempts = 3) {
  let lastError: unknown;
  const model = encodeURIComponent(request.model);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
    apiKey
  )}`;
  const payload = buildGenerateContentPayload(request);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts) {
        break;
      }
      await sleep(400 * attempt);
    }
  }

  throw lastError;
}

async function runModelCall(apiKey: string, request: any) {
  const startedAt = Date.now();
  const response = await generateContentWithRetry(apiKey, request);
  return {
    response,
    durationMs: Date.now() - startedAt,
    telemetry: extractUsageTelemetry(response),
  };
}

function chunkTextForStreaming(text: string, maxChunkLength = 80) {
  const chunks: string[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    let end = Math.min(text.length, cursor + maxChunkLength);
    if (end < text.length) {
      const breakpoint = text.lastIndexOf(" ", end);
      if (breakpoint > cursor + 20) {
        end = breakpoint + 1;
      }
    }
    chunks.push(text.slice(cursor, end));
    cursor = end;
  }

  return chunks.filter(Boolean);
}

async function streamTextToDraft(
  text: string,
  onDelta: (delta: string, fullText: string) => Promise<void>
) {
  const chunks = chunkTextForStreaming(text);
  let fullText = "";

  for (const chunk of chunks) {
    fullText += chunk;
    await onDelta(chunk, fullText);
    await sleep(18);
  }

  return { text: fullText };
}

function buildFallbackPlan(args: any) {
  const steps: any[] = [];

  if (args.storeId) {
    steps.push({
      id: "s1",
      stepIndex: 0,
      groupId: "discover",
      toolName: "get_store_metrics",
      purpose: "Load store operating context and current risk levels.",
      args: { store_id: args.storeId },
    });
  } else {
    steps.push({
      id: "s1",
      stepIndex: 0,
      groupId: "discover",
      toolName: "get_regional_summary",
      purpose: "Load regional operating context and at-risk stores.",
      args: { region_id: args.regionId || "REG-NE" },
    });
  }

  steps.push({
    id: "s2",
    stepIndex: 0,
    groupId: "discover",
    toolName: "search_issues",
    purpose: "Find tracked issues relevant to the request.",
    args: { store_id: args.storeId || "ALL", keyword: deriveKeywordFromQuery(args.query) },
  });
  steps.push({
    id: "s3",
    stepIndex: 1,
    groupId: "ground",
    toolName: "search_policies",
    purpose: "Find policies that govern the recommendation.",
    args: { keyword: deriveKeywordFromQuery(args.query) },
    dependsOn: ["s2"],
    injectPriorResults: ["s2"],
  });
  steps.push({
    id: "s4",
    stepIndex: 1,
    groupId: "ground",
    toolName: "search_past_resolutions",
    purpose: "Pull precedent from historical resolved cases.",
    args: { query: args.query },
    dependsOn: ["s2"],
    injectPriorResults: ["s2"],
  });

  if (args.storeId) {
    steps.push({
      id: "s5",
      stepIndex: 1,
      groupId: "ground",
      toolName: "lookup_inventory",
      purpose: "Inspect live inventory when stock or supplier context may change the answer.",
      args: { store_id: args.storeId },
      dependsOn: ["s2"],
      injectPriorResults: ["s2"],
    });
  }

  if (shouldUseWebSearch(args.query)) {
    steps.push({
      id: `s${steps.length + 1}`,
      stepIndex: 1,
      groupId: "external",
      toolName: "web_search",
      purpose: "Collect fresh external context when the question depends on current outside facts.",
      args: { query: args.query },
      model: PLANNER_MODEL_NAME,
      dependsOn: ["s2"],
      injectPriorResults: ["s2"],
    });
  }

  steps.push({
    id: `s${steps.length + 1}`,
    stepIndex: 2,
    groupId: "synthesize",
    toolName: "synthesize_report",
    purpose: "Combine all gathered evidence into an operator-ready answer.",
    args: {},
    dependsOn: steps.map((step) => step.id),
    injectPriorResults: steps.map((step) => step.id),
    model: MODEL_NAME,
  });

  return {
    summary: "Fallback plan created from scope, query intent, and known operational data sources.",
    plan: steps,
    telemetry: {
      model: "fallback_planner",
      durationMs: 0,
    },
  };
}

async function buildHarnessPlan(apiKey: string, args: any, attachedFiles: any[], brief: any) {
  const attachmentSummary =
    attachedFiles.length > 0
      ? attachedFiles
          .map((file) => `${file.filename} (${file.fileCategory}, ${formatAttachmentSize(file.sizeBytes)})`)
          .join("; ")
      : "none";

  const prompt = `You are planning a retail operations agent run.

Return JSON only with this shape:
{
  "summary": "short sentence",
  "steps": [
    {
      "id": "s1",
      "stepIndex": 0,
      "groupId": "discover",
      "toolName": "search_issues",
      "args": { "store_id": "CURRENT", "keyword": "milk supplier delay" },
      "purpose": "Find the tracked issue."
    }
  ]
}

Rules:
- Available toolName values: web_search, search_issues, search_policies, lookup_inventory, search_past_resolutions, get_store_metrics, get_regional_summary, create_action_item, create_issue
- Do not include synthesize_report; it is added automatically after execution.
- Use CURRENT for store_id or region_id when the current scope should be used.
- Prefer internal tools first.
- Use web_search only when current external facts would materially improve the answer.
- Only use create_action_item or create_issue when the user is explicitly asking to create or track something.
- Keep the plan compact: 2 to 5 execution steps before synthesis.

Scope:
- storeId: ${args.storeId || "none"}
- regionId: ${args.regionId || "none"}
- query: ${args.query}
- attachments: ${attachmentSummary}

Structured Convex brief:
${formatBriefForPrompt(brief, args.query)}`;

  try {
    const { response, durationMs, telemetry } = await runModelCall(apiKey, {
      model: PLANNER_MODEL_NAME,
      contents: prompt,
      config: {
        temperature: 0.1,
        responseMimeType: "application/json",
      },
    });

    const rawText = extractAssistantText(response);
    const jsonBlock = extractFirstJsonBlock(rawText);
    if (!jsonBlock) {
      return buildFallbackPlan(args);
    }

    const parsed = JSON.parse(jsonBlock);
    const plan = Array.isArray(parsed?.steps) ? parsed.steps : [];
    if (plan.length === 0) {
      return buildFallbackPlan(args);
    }

    const normalized = plan
      .map((step: any, index: number) => ({
        id: typeof step?.id === "string" ? step.id : `s${index + 1}`,
        stepIndex: Number.isFinite(step?.stepIndex) ? step.stepIndex : 0,
        groupId: typeof step?.groupId === "string" ? step.groupId : "discover",
        toolName: step?.toolName,
        purpose:
          typeof step?.purpose === "string" && step.purpose.trim()
            ? step.purpose.trim()
            : `Run ${step?.toolName || "tool"}.`,
        args: {
          ...(step?.args ?? {}),
          store_id:
            step?.args?.store_id === "CURRENT" || step?.args?.store_id === "current"
              ? args.storeId
              : step?.args?.store_id,
          region_id:
            step?.args?.region_id === "CURRENT" || step?.args?.region_id === "current"
              ? args.regionId || "REG-NE"
              : step?.args?.region_id,
        },
        dependsOn: Array.isArray(step?.dependsOn) ? step.dependsOn.filter(Boolean) : undefined,
        injectPriorResults: Array.isArray(step?.injectPriorResults)
          ? step.injectPriorResults.filter(Boolean)
          : undefined,
        model: typeof step?.model === "string" ? step.model : undefined,
      }))
      .filter((step: any) => typeof step.toolName === "string");

    if (!normalized.some((step: any) => step.toolName === "synthesize_report")) {
      normalized.push({
        id: `s${normalized.length + 1}`,
        stepIndex: Math.max(...normalized.map((step: any) => step.stepIndex), 0) + 1,
        groupId: "synthesize",
        toolName: "synthesize_report",
        purpose: "Combine all gathered evidence into an operator-ready answer.",
        args: {},
        dependsOn: normalized.map((step: any) => step.id),
        injectPriorResults: normalized.map((step: any) => step.id),
        model: MODEL_NAME,
      });
    }

    return {
      summary:
        typeof parsed?.summary === "string" && parsed.summary.trim()
          ? parsed.summary.trim()
          : "Planner generated a compact harness run for this request.",
      plan: normalized,
      telemetry: {
        model: PLANNER_MODEL_NAME,
        durationMs,
        ...telemetry,
      },
    };
  } catch {
    return buildFallbackPlan(args);
  }
}

async function generateFallbackAnswer(
  _ctx: any,
  args: any,
  apiKey: string,
  attachedFiles: any[],
  brief: any
) {
  const prompt = `You are producing an operationally grounded answer for a retail manager.

User query:
${args.query}

Context:
- Scope: ${args.storeId ? `store ${args.storeId}` : `region ${args.regionId || "REG-NE"}`}
- Structured Convex brief:
${formatBriefForPrompt(brief, args.query)}
- Attached evidence: ${
    attachedFiles.length
      ? attachedFiles
          .map(
            (file) =>
              `${file.filename} (${file.fileCategory}, ${formatAttachmentSize(file.sizeBytes)})`
          )
          .join("; ")
      : "none"
  }

Instructions:
- Answer with direct operational guidance.
- Reference exact issue IDs, policy IDs, SKUs, dates, and revenue impact when present.
- Use numbered steps in 1. 2. 3. form whenever action is needed.
- If there is a cross-store pattern, say so explicitly.
- If the brief contains a primary tracked issue, lead with that issue ID first.
- If the brief contains policy-backed actions, quote the concrete limits or thresholds from the policy context when available.
- Only mention IDs, policies, stores, SKUs, timelines, and thresholds that appear in the structured brief.
- Do not mention historical resolution IDs unless the user explicitly asked for precedent or prior resolution history.
- Do not invent facts beyond the provided context.`;

  const { response, durationMs, telemetry } = await runModelCall(apiKey, {
    model: MODEL_NAME,
    contents: prompt,
    config: {
      temperature: 0.3,
    },
  });

  return {
    text: extractAssistantText(response),
    issues: brief.matchedIssues ?? [],
    policies: brief.policies ?? [],
    resolutions: brief.resolutions ?? [],
    metrics: brief.scope ?? {},
    telemetry: {
      model: MODEL_NAME,
      durationMs,
      ...telemetry,
    },
  };
}

export const chat = action({
  args: {
    operatorId: v.string(),
    query: v.string(),
    storeId: v.optional(v.string()),
    regionId: v.optional(v.string()),
    sessionId: v.string(),
    senderName: v.optional(v.string()),
    fileIds: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args): Promise<ChatActionResult> => {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error("Set GEMINI_API_KEY or GOOGLE_API_KEY in the Convex environment.");
    }

    let draftMessageId: any = null;
    let eventSequence = 0;
    const references = new Set<string>();
    const sourceUrls = new Set<string>();
    const sourceRefs = new Map<string, any>();
    const toolTrace: Array<any> = [];
    const modelTurns: Array<any> = [];
    let plannerResult: any = {
      summary: "",
      telemetry: {},
      plan: [],
    };
    let fallbackTelemetry: any = null;
    let qualityBrief: any = null;
    let qualityReport: any = null;
    let answerPacketId: string | null = null;

    const buildTracePayload = () => ({
      planner: {
        summary: plannerResult.summary,
        telemetry: plannerResult.telemetry,
        plan: plannerResult.plan,
      },
      execution: {
        steps: toolTrace,
        modelTurns,
        totalDurationMs:
          toolTrace.reduce((sum, step) => sum + (step.durationMs ?? 0), 0) +
          modelTurns.reduce((sum, turn) => sum + (turn.durationMs ?? 0), 0),
        fallbackUsed: Boolean(fallbackTelemetry),
      },
      sources: Array.from(sourceRefs.values()),
      telemetry: {
        planning: plannerResult.telemetry,
        modelTurns,
        fallback: fallbackTelemetry,
      },
    });

    const buildMessageMetadata = () => ({
      model: MODEL_NAME,
      operatorId: args.operatorId,
      answerPacketId,
      quality: qualityReport
        ? {
            status: qualityReport.status,
            summary: qualityReport.summary,
            checks: qualityReport.checks,
          }
        : undefined,
      trace: buildTracePayload(),
    });

    const syncDraft = async (options?: {
      content?: string;
      appendText?: string;
      status?: string;
    }) => {
      if (!draftMessageId) {
        return;
      }
      await ctx.runMutation(api.messages.updateAssistantDraft, {
        messageId: draftMessageId,
        updatedAt: Date.now(),
        content: options?.content,
        appendText: options?.appendText,
        status: options?.status,
        references: Array.from(references),
        sourceUrls: Array.from(sourceUrls),
        metadataJson: safeJsonStringify(buildMessageMetadata()),
      });
    };

    const appendStreamEvent = async (
      eventType: string,
      summary: string,
      payload?: Record<string, unknown>
    ) => {
      if (!draftMessageId) {
        return;
      }
      eventSequence += 1;
      await ctx.runMutation(api.messages.appendEvent, {
        messageId: draftMessageId,
        sessionId: args.sessionId,
        storeId: args.storeId,
        regionId: args.regionId,
        eventType,
        sequence: eventSequence,
        summary,
        payloadJson: payload ? safeJsonStringify(payload) : undefined,
        createdAt: Date.now(),
      });
    };

    try {
      if (args.storeId) {
        await ctx.runQuery(api.stores.getById, {
          operatorId: args.operatorId,
          storeId: args.storeId,
        });
      } else if (args.regionId) {
        await ctx.runQuery(api.stores.getByRegion, {
          operatorId: args.operatorId,
          regionId: args.regionId,
        });
      }

      const existingMessages = await ctx.runQuery(api.messages.getBySession, {
        operatorId: args.operatorId,
        sessionId: args.sessionId,
        storeId: args.storeId,
        regionId: args.regionId,
      });
      const attachedFiles =
        args.fileIds && args.fileIds.length > 0
          ? await ctx.runQuery(api.files.getByIds, {
              operatorId: args.operatorId,
              fileIds: args.fileIds,
              storeId: args.storeId,
              regionId: args.regionId,
            })
          : [];
      qualityBrief = await ctx.runQuery(api.briefs.getAgentBrief, {
        operatorId: args.operatorId,
        query: args.query,
        storeId: args.storeId,
        regionId: args.regionId,
      });
      collectBriefReferences(references, qualityBrief);
      const userTimestamp = Date.now();

      await ctx.runMutation(api.messages.send, {
        role: "user",
        content: args.query,
        senderName: args.senderName,
        status: "completed",
        storeId: args.storeId,
        regionId: args.regionId,
        sessionId: args.sessionId,
        createdAt: userTimestamp,
        updatedAt: userTimestamp,
        fileIds: args.fileIds,
        metadataJson: JSON.stringify({
          operatorId: args.operatorId,
        }),
      });

      draftMessageId = await ctx.runMutation(api.messages.createDraftAssistant, {
        sessionId: args.sessionId,
        storeId: args.storeId,
        regionId: args.regionId,
        createdAt: Date.now(),
        metadataJson: safeJsonStringify({
          model: MODEL_NAME,
          operatorId: args.operatorId,
          trace: buildTracePayload(),
        }),
      });

      await appendStreamEvent("run.started", "Run started", {
        query: args.query,
      });

      const systemPrompt = args.storeId
        ? `You are a Store Operations Assistant for a retail grocery chain. The user is the store manager for store ${args.storeId}. Prefer internal tools for store data, staffing, resolutions, and policies. Use Google Search only when current external information materially improves the answer. Reference exact issue IDs, policy IDs, SKUs, dates, and concrete next steps. Distinguish immediate actions from follow-up actions. Create action items when the answer clearly requires tracked execution. ALWAYS check search_past_resolutions when handling an issue that has been resolved before or is similar to a past issue. Proactively suggest what worked last time. When referencing vendor contacts, phone numbers, or email addresses from policies, format them prominently so the operator can act immediately.`
        : `You are a Regional Operations Assistant. The user is the regional manager for region ${args.regionId || "REG-NE"}. Prefer internal tools for store data, staffing, resolutions, and policies. Use Google Search only when current external information materially improves the answer. Identify cross-store patterns, quantify risk, recommend immediate actions first, and create action items when multi-store follow-up is needed. ALWAYS check search_past_resolutions when handling an issue that has been resolved before or is similar to a past issue. Proactively suggest what worked last time. When referencing vendor contacts, phone numbers, or email addresses from policies, format them prominently so the operator can act immediately.`;

      plannerResult = await buildHarnessPlan(apiKey, args, attachedFiles, qualityBrief);
      await appendStreamEvent("plan.created", `Planned ${plannerResult.plan.length} steps`, {
        summary: plannerResult.summary,
        steps: plannerResult.plan,
      });
      await syncDraft({ status: "streaming" });
      const historyContents = buildHistoryContents(existingMessages);
      const attachmentContext = await buildAttachmentContext(ctx, attachedFiles);
      const currentUserText =
        attachedFiles.length > 0
          ? `${args.query}\n\nAttached evidence:\n${attachmentContext.summaries.join("\n")}\nUse attached evidence when it changes the recommendation.`
          : args.query;
      const contents: any[] = [
        ...historyContents,
        {
          role: "user",
          parts: [{ text: currentUserText }, ...attachmentContext.parts],
        },
      ];

      let assistantMessage = "";
      const plannedLookup = new Map<string, any>(
        plannerResult.plan
          .filter((step: any) => step.toolName !== "synthesize_report")
          .map((step: any) => [step.toolName, step])
      );

      if (attachedFiles.length > 0) {
        toolTrace.push({
          id: "attachments",
          stepIndex: -1,
          groupId: "input",
          tool: "attachments",
          purpose: "Attach uploaded evidence to the run context.",
          durationMs: 0,
          success: true,
          summary: attachmentContext.summaries.join(" | ").slice(0, 220),
          telemetry: {},
        });
        await appendStreamEvent("attachments.bound", `Bound ${attachedFiles.length} attachments`, {
          summaries: attachmentContext.summaries,
        });
        await syncDraft();
      }

      for (let i = 0; i < 5; i++) {
        const { response, durationMs, telemetry } = await runModelCall(apiKey, {
          model: MODEL_NAME,
          contents,
          config: {
            systemInstruction: systemPrompt,
            tools: TOOLS,
            temperature: 0.4,
            toolConfig: {
              includeServerSideToolInvocations: true,
            },
          },
        });

        modelTurns.push({
          turn: i + 1,
          durationMs,
          model: MODEL_NAME,
          ...telemetry,
        });
        await appendStreamEvent("model.turn.completed", `Completed reasoning turn ${i + 1}`, {
          turn: i + 1,
          durationMs,
          telemetry,
        });

        assistantMessage = extractAssistantText(response);
        const groundedSources = extractGroundingSources(response);
        if (groundedSources.length) {
          for (const source of groundedSources) {
            sourceUrls.add(source.url);
            sourceRefs.set(source.url, source);
          }
          toolTrace.push({
            id: `google-search-${i + 1}`,
            stepIndex: 1,
            groupId: "external",
            tool: "web_search",
            purpose: "Gathered externally grounded sources through Gemini Google Search.",
            durationMs,
            success: true,
            summary: `${groundedSources.length} grounded sources`,
            telemetry: {
              model: MODEL_NAME,
              ...telemetry,
            },
            sources: groundedSources,
          });
          await appendStreamEvent("sources.updated", `Captured ${groundedSources.length} grounded sources`, {
            sources: groundedSources,
          });
          await syncDraft();
        }

        const functionCalls = extractFunctionCalls(response);
        const candidateContent = response.candidates?.[0]?.content;

        if (functionCalls.length === 0) {
          break;
        }

        if (candidateContent) {
          contents.push(candidateContent);
        }

        const functionResponses = [];

        for (const call of functionCalls) {
          const toolName = call.name;
          const toolArgs = (call.args ?? {}) as Record<string, any>;
          let result: unknown;
          const toolStartedAt = Date.now();
          await appendStreamEvent("step.started", `Running ${toolName ?? "tool"}`, {
            toolName,
            args: toolArgs,
          });

          try {
            switch (toolName) {
              case "search_issues":
                result = await ctx.runQuery(api.issues.search, {
                  operatorId: args.operatorId,
                  storeId: toolArgs.store_id === "ALL" ? undefined : toolArgs.store_id,
                  issueType: toolArgs.issue_type,
                  severity: toolArgs.severity,
                  status: toolArgs.status,
                  keyword: toolArgs.keyword,
                });
                break;
              case "search_policies":
                result = await ctx.runQuery(api.policies.search, {
                  policyId: toolArgs.policy_id,
                  keyword: toolArgs.keyword,
                });
                break;
              case "lookup_inventory":
                result = await ctx.runQuery(api.inventory.getByStore, {
                  storeId: toolArgs.store_id,
                  sku: toolArgs.sku,
                });
                break;
              case "search_past_resolutions":
                result = await ctx.runQuery(api.resolutions.search, {
                  issueType: toolArgs.issue_type,
                  query: toolArgs.query,
                  limit: 5,
                });
                break;
              case "get_store_metrics":
                result = await ctx.runQuery(api.operations.getStoreMetrics, {
                  operatorId: args.operatorId,
                  storeId: toolArgs.store_id,
                });
                break;
              case "get_regional_summary":
                result = await ctx.runQuery(api.operations.getRegionalSummary, {
                  operatorId: args.operatorId,
                  regionId: toolArgs.region_id,
                });
                break;
              case "create_action_item":
                result = await ctx.runMutation(api.actionItems.create, {
                  operatorId: args.operatorId,
                  issueId: toolArgs.issue_id,
                  storeId: toolArgs.store_id,
                  regionId: toolArgs.region_id,
                  title: toolArgs.title,
                  description: toolArgs.description,
                  assignee: toolArgs.assignee,
                  priority: toolArgs.priority,
                  status: "open",
                  source: "agent",
                  dueAt: toolArgs.due_at,
                });
                break;
              case "create_issue":
                result = await ctx.runMutation(api.issues.create, {
                  operatorId: args.operatorId,
                  storeId: toolArgs.store_id,
                  regionId: toolArgs.region_id,
                  title: toolArgs.title,
                  description: toolArgs.description,
                  issueType: toolArgs.issue_type,
                  severity: toolArgs.severity,
                  reporterName: toolArgs.reporter_name,
                  reporterRole: toolArgs.reporter_role,
                  relatedPolicy: toolArgs.related_policy,
                  affectedSku: toolArgs.affected_sku,
                  estimatedRevenueImpact: toolArgs.estimated_revenue_impact,
                });
                break;
              default:
                result = { error: `Unknown tool: ${toolName}` };
            }
          } catch (error: any) {
            result = { error: error.message };
          }

          if (Array.isArray(result)) {
            for (const item of result) {
              appendReference(references, item.issueId);
              appendReference(references, item.relatedPolicy);
              appendReference(references, item.policyId);
              appendReference(references, item.resolutionId);
              appendReference(references, item.actionItemId);
              appendReference(references, item.affectedSku);
            }
          } else if (result && typeof result === "object") {
            appendReference(references, (result as any).issueId);
            appendReference(references, (result as any).policyId);
            appendReference(references, (result as any).resolutionId);
            appendReference(references, (result as any).actionItemId);
            appendReference(references, (result as any).affectedSku);
          }

          const plannedStep = plannedLookup.get(toolName ?? "");
          toolTrace.push({
            id: call.id || `${toolName}-${i + 1}-${toolTrace.length + 1}`,
            stepIndex: plannedStep?.stepIndex ?? i,
            groupId: plannedStep?.groupId ?? "execute",
            tool: toolName ?? "unknown_tool",
            purpose: plannedStep?.purpose ?? `Run ${toolName ?? "tool"}.`,
            plannedArgs: plannedStep?.args,
            actualArgs: toolArgs,
            dependsOn: plannedStep?.dependsOn,
            injectPriorResults: plannedStep?.injectPriorResults,
            durationMs: Date.now() - toolStartedAt,
            success: !(result && typeof result === "object" && "error" in (result as any)),
            summary: summarizeResult(result),
            telemetry: {},
          });
          await appendStreamEvent(
            "step.completed",
            `${toolName ?? "tool"} ${result && typeof result === "object" && "error" in (result as any) ? "failed" : "completed"}`,
            {
              step: toolTrace[toolTrace.length - 1],
            }
          );
          await syncDraft();

          functionResponses.push({
            functionResponse: {
              name: toolName,
              id: call.id,
              response: { output: result },
            },
          });
        }

        contents.push({
          role: "user",
          parts: functionResponses,
        });
      }

      let finalAnswer = "";
      const deterministicAnswer = buildDeterministicIssueAnswer(args, qualityBrief);
      if (!assistantMessage.trim()) {
        if (shouldUseDeterministicIssueAnswer(args.query, qualityBrief, sourceRefs.size > 0) && deterministicAnswer) {
          assistantMessage = deterministicAnswer;
          finalAnswer = deterministicAnswer;
          toolTrace.push({
            id: "deterministic_synthesis",
            stepIndex: plannerResult.plan.length,
            groupId: "synthesize",
            tool: "deterministic_synthesis",
            purpose: "Generate a policy-backed answer directly from the structured Convex brief for high-confidence internal issues.",
            durationMs: 0,
            success: true,
            summary: "Rendered deterministic issue answer from tracked issue and linked policy.",
            telemetry: { mode: "deterministic" },
          });
          await appendStreamEvent(
            "synthesis.completed",
            "Completed deterministic synthesis",
            { mode: "deterministic" }
          );
        } else {
          const fallback = await generateFallbackAnswer(
            ctx,
            args,
            apiKey,
            attachedFiles,
            qualityBrief
          );
          assistantMessage = fallback.text;
          finalAnswer = fallback.text;
          fallbackTelemetry = fallback.telemetry;
          for (const issue of fallback.issues ?? []) {
            appendReference(references, issue.issueId);
            appendReference(references, issue.relatedPolicy);
            appendReference(references, issue.affectedSku);
          }
          for (const policy of fallback.policies ?? []) {
            appendReference(references, policy.policyId);
          }
          for (const resolution of fallback.resolutions ?? []) {
            appendReference(references, resolution.resolutionId);
          }
          toolTrace.push({
            id: "fallback_synthesis",
            stepIndex: plannerResult.plan.length,
            groupId: "synthesize",
            tool: "fallback_synthesis",
            purpose: "Produce a final answer from internal data when the main generation path returns no text.",
            durationMs: fallback.telemetry?.durationMs ?? 0,
            success: true,
            summary: `issues=${fallback.issues.length}, policies=${fallback.policies.length}, resolutions=${fallback.resolutions.length}`,
            telemetry: fallback.telemetry,
          });
          await appendStreamEvent("synthesis.completed", "Completed fallback synthesis", {
            telemetry: fallback.telemetry,
          });
        }
        await syncDraft({
          content: finalAnswer,
          status: "completed",
        });
      } else {
        const synthesisPrompt = `${
          args.storeId
            ? `You are finalizing a streaming answer for the store manager of ${args.storeId}.`
            : `You are finalizing a streaming answer for the regional manager of ${args.regionId || "REG-NE"}.`
        }

Use the draft answer and execution evidence below to produce the final operator-ready response.
- Keep all claims grounded in the provided evidence.
- Prefer concise markdown with headings or bullets only when helpful.
- Mention internal references such as issue IDs, policy IDs, and SKUs when relevant.
- If external sources were gathered, rely only on those source summaries for current external claims.
- Lead with the most relevant tracked issue or cross-store pattern when one exists in the Convex brief.
- Mention concrete revenue impact, dates, staffing counts, or inventory quantities when they exist in the brief.
- Only mention IDs, policies, SKUs, stores, and thresholds that appear in the Convex brief or execution evidence below.
- When action is required, format the immediate response as a numbered list using 1. 2. 3.
- Do not mention hidden system mechanics or internal metadata structures.

Original user request:
${args.query}

Planner summary:
${plannerResult.summary || "n/a"}

Structured Convex brief:
${formatBriefForPrompt(qualityBrief, args.query)}

Execution summary:
${toolTrace
  .map(
    (step) =>
      `- ${step.tool}: ${step.summary}${step.success === false ? " (failed)" : ""}`
  )
  .join("\n")}

External sources:
${Array.from(sourceRefs.values())
  .map((source: any) => `- ${source.title || source.domain} (${source.domain})`)
  .join("\n") || "- none"}

Draft answer to refine:
${assistantMessage}`;

        await appendStreamEvent("synthesis.started", "Streaming final answer", {
          seedLength: assistantMessage.length,
        });
        await syncDraft({ content: "", status: "streaming" });

        const synthesis = await runModelCall(apiKey, {
          model: MODEL_NAME,
          contents: synthesisPrompt,
          config: {
            temperature: 0.3,
          },
        });

        modelTurns.push({
          turn: modelTurns.length + 1,
          durationMs: synthesis.durationMs,
          model: MODEL_NAME,
          phase: "synthesis",
          ...synthesis.telemetry,
        });
        finalAnswer =
          shouldUseDeterministicIssueAnswer(args.query, qualityBrief, sourceRefs.size > 0) &&
          deterministicAnswer
            ? deterministicAnswer
            : extractAssistantText(synthesis.response).trim() || assistantMessage;
        if (!deterministicAnswer && answerNeedsCoverageFallback(finalAnswer, qualityBrief)) {
          const fallback = await generateFallbackAnswer(
            ctx,
            args,
            apiKey,
            attachedFiles,
            qualityBrief
          );
          finalAnswer = fallback.text;
          fallbackTelemetry = fallback.telemetry;
          toolTrace.push({
            id: "coverage_fallback_synthesis",
            stepIndex: plannerResult.plan.length + 1,
            groupId: "synthesize",
            tool: "coverage_fallback_synthesis",
            purpose: "Regenerate the answer from the structured Convex brief when the drafted answer omits required grounded details.",
            durationMs: fallback.telemetry?.durationMs ?? 0,
            success: true,
            summary: `issues=${fallback.issues.length}, policies=${fallback.policies.length}, resolutions=${fallback.resolutions.length}`,
            telemetry: fallback.telemetry,
          });
          await appendStreamEvent(
            "coverage.fallback",
            "Upgraded answer from structured Convex brief",
            {
              telemetry: fallback.telemetry,
            }
          );
        }
        await streamTextToDraft(finalAnswer, async (delta) => {
          await ctx.runMutation(api.messages.updateAssistantDraft, {
            messageId: draftMessageId,
            appendText: delta,
            updatedAt: Date.now(),
          });
        });
        await appendStreamEvent("synthesis.completed", "Completed streamed synthesis", {
          durationMs: synthesis.durationMs,
          telemetry: synthesis.telemetry,
        });
        await syncDraft({
          content: finalAnswer,
          status: "completed",
        });
      }

      const tracePayload = buildTracePayload();
      qualityReport = buildQualityReport(
        finalAnswer,
        args.query,
        qualityBrief,
        references,
        sourceRefs
      );

      await appendStreamEvent("quality.checked", `Quality status: ${qualityReport.status}`, {
        quality: qualityReport,
      });

      const answerPacket: { answerPacketId: string } = await ctx.runMutation(internal.answerPackets.create, {
        answerPacketId: makeRuntimeId("ANS"),
        messageId: draftMessageId,
        sessionId: args.sessionId,
        operatorId: args.operatorId,
        storeId: args.storeId,
        regionId: args.regionId,
        query: args.query,
        answer: finalAnswer,
        references: Array.from(references),
        sourceUrls: Array.from(sourceUrls),
        qualityStatus: qualityReport.status,
        qualitySummary: qualityReport.summary,
        qualityChecksJson: safeJsonStringify(qualityReport.checks),
        briefJson: safeJsonStringify(qualityBrief),
        traceJson: safeJsonStringify(tracePayload),
        model: MODEL_NAME,
        createdAt: Date.now(),
      });
      answerPacketId = answerPacket.answerPacketId;

      await appendStreamEvent("answer.packet.created", `Stored ${answerPacketId}`, {
        answerPacketId,
        qualityStatus: qualityReport.status,
      });

      await appendStreamEvent("run.completed", "Run completed", {
        planStepCount: plannerResult.plan.length,
        sourceUrlCount: sourceUrls.size,
        answerPacketId,
        qualityStatus: qualityReport.status,
      });

      // ── attrition.sh: push real cost telemetry (fire-and-forget) ────────
      try {
        const planTelemetry = plannerResult.telemetry ?? {};
        const planTokensIn = planTelemetry.tokensIn ?? 0;
        const planTokensOut = planTelemetry.tokensOut ?? 0;
        const mainTokensIn = modelTurns.reduce((s: number, t: any) => s + (t.tokensIn ?? 0), 0);
        const mainTokensOut = modelTurns.reduce((s: number, t: any) => s + (t.tokensOut ?? 0), 0);
        const fallbackIn = fallbackTelemetry?.tokensIn ?? 0;
        const fallbackOut = fallbackTelemetry?.tokensOut ?? 0;

        // Gemini pricing: Flash Lite $0.075/$0.30, Pro $1.25/$5.00 per M tokens
        const plannerCost = (planTokensIn / 1e6) * 0.075 + (planTokensOut / 1e6) * 0.30;
        const mainCost = (mainTokensIn / 1e6) * 1.25 + (mainTokensOut / 1e6) * 5.00;
        const fallbackCost = (fallbackIn / 1e6) * 1.25 + (fallbackOut / 1e6) * 5.00;

        const attritionPacket = {
          type: "advisor.session",
          subject: `FloorAI: ${(args.query ?? "").substring(0, 80)}`,
          summary: `Pro: ${mainTokensIn + mainTokensOut} tok ($${(mainCost).toFixed(6)}), Flash: ${planTokensIn + planTokensOut} tok ($${(plannerCost).toFixed(6)})`,
          data: {
            session_id: args.sessionId,
            started_at: new Date(Date.now() - (tracePayload.execution?.totalDurationMs ?? 0)).toISOString(),
            ended_at: new Date().toISOString(),
            duration_ms: tracePayload.execution?.totalDurationMs ?? 0,
            // Correct roles per Anthropic advisor pattern:
            // - Expensive model (Pro) = ADVISOR (plans, reasons, guides)
            // - Cheap model (Flash) = EXECUTOR (calls tools, produces output)
            // FloorAI currently inverts this: Flash plans, Pro executes everything.
            // The optimization opportunity: route simple queries to Flash as executor
            // and only escalate to Pro as advisor for complex reasoning.
            planner_model: PLANNER_MODEL_NAME,
            agent_model: MODEL_NAME,
            planner_stats: {
              total_tokens: planTokensIn + planTokensOut,
              total_cost_usd: plannerCost,
              calls: 1,
              role: "planner",
            },
            agent_stats: {
              total_tokens: mainTokensIn + mainTokensOut + fallbackIn + fallbackOut,
              total_cost_usd: mainCost + fallbackCost,
              calls: modelTurns.length,
              role: "executor_and_reasoner",
            },
            combined: {
              total_cost_usd: plannerCost + mainCost + fallbackCost,
              pro_cost_share_pct: mainCost + fallbackCost > 0
                ? Math.round(((mainCost + fallbackCost) / (plannerCost + mainCost + fallbackCost)) * 1000) / 10
                : 0,
              pattern: "inverted",  // Flash plans, Pro executes — opposite of Anthropic advisor pattern
              optimization: "Route simple queries (policy lookup, issue status) to Flash as full executor. Reserve Pro for complex reasoning (multi-step action plans, cross-store analysis).",
              user_corrections: 0,
              task_completed: true,
            },
            // FloorAI-specific context
            app: "floorai",
            store_id: args.storeId ?? null,
            region_id: args.regionId ?? null,
            operator_id: args.operatorId,
            query: (args.query ?? "").substring(0, 200),
            quality_status: qualityReport.status,
            plan_steps: plannerResult.plan.length,
            tool_calls: toolTrace.length,
            sources_cited: sourceUrls.size,
            answer_packet_id: answerPacketId,
          },
        };
        await Promise.race([
          fetch("https://attrition-7xtb75zi5q-uc.a.run.app/api/retention/push-packet", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(attritionPacket),
          }),
          new Promise((resolve) => setTimeout(resolve, 5000)),
        ]).catch(() => {});
      } catch { /* attrition telemetry is best-effort */ }
      // ── end attrition push ──────────────────────────────────────────────

      await syncDraft({
        content: finalAnswer,
        status: "completed",
      });

      await ctx.runMutation(internal.audit.record, {
        actorId: args.operatorId,
        eventType: "agent.chat.completed",
        status: "success",
        storeId: args.storeId,
        regionId: args.regionId,
        entityId: args.sessionId,
        summary: `Completed assistant response for ${args.storeId ?? args.regionId ?? "global"} scope.`,
        detailsJson: safeJsonStringify({
          references: Array.from(references),
          sourceUrlCount: sourceUrls.size,
          planStepCount: plannerResult.plan.length,
          answerPacketId,
          qualityStatus: qualityReport.status,
          qualitySummary: qualityReport.summary,
          toolTrace,
        }),
      });

      return {
        answer: finalAnswer,
        trace: tracePayload,
        messageId: draftMessageId,
        answerPacketId,
        quality: qualityReport,
      };
    } catch (error: any) {
      if (draftMessageId) {
        await appendStreamEvent("run.failed", "Run failed", {
          message: error?.message ?? "Unknown agent failure",
        });
        await syncDraft({
          status: "failed",
        });
      }
      await ctx.runMutation(internal.audit.record, {
        actorId: args.operatorId,
        eventType: "agent.chat.completed",
        status: "failure",
        storeId: args.storeId,
        regionId: args.regionId,
        entityId: args.sessionId,
        summary: `Assistant request failed for ${args.storeId ?? args.regionId ?? "global"} scope.`,
        detailsJson: safeJsonStringify({
          message: error?.message ?? "Unknown agent failure",
        }),
      });
      throw error;
    }
  },
});

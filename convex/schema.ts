import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    operatorId: v.string(),
    name: v.string(),
    email: v.string(),
    role: v.string(),
    storeIds: v.array(v.string()),
    regionIds: v.array(v.string()),
  }).index("by_operatorId", ["operatorId"])
    .index("by_role", ["role"]),

  stores: defineTable({
    storeId: v.string(),
    name: v.string(),
    address: v.string(),
    regionId: v.string(),
    regionName: v.string(),
    managerName: v.string(),
  }).index("by_region", ["regionId"])
    .index("by_storeId", ["storeId"]),

  issues: defineTable({
    issueId: v.string(),
    storeId: v.string(),
    issueType: v.string(),
    severity: v.string(),
    title: v.string(),
    description: v.string(),
    category: v.string(),
    status: v.string(),
    createdAt: v.string(),
    resolvedAt: v.optional(v.string()),
    resolutionNotes: v.optional(v.string()),
    escalatedToRegional: v.boolean(),
    relatedPolicy: v.optional(v.string()),
    affectedSku: v.optional(v.string()),
    estimatedRevenueImpact: v.number(),
    reportedByRole: v.string(),
    reporterName: v.string(),
  }).index("by_store", ["storeId"])
    .index("by_status", ["status"])
    .index("by_severity", ["severity"])
    .index("by_type", ["issueType"])
    .index("by_issueId", ["issueId"]),

  inventory: defineTable({
    storeId: v.string(),
    sku: v.string(),
    productName: v.string(),
    category: v.string(),
    currentStock: v.number(),
    reorderPoint: v.number(),
    lastDelivery: v.string(),
    supplier: v.string(),
  }).index("by_store", ["storeId"])
    .index("by_sku", ["sku"])
    .index("by_store_sku", ["storeId", "sku"]),

  policies: defineTable({
    policyId: v.string(),
    title: v.string(),
    content: v.string(),
    category: v.string(),
    effectiveDate: v.string(),
  }).index("by_policyId", ["policyId"])
    .index("by_category", ["category"])
    .searchIndex("search_content", {
      searchField: "content",
      filterFields: ["category"],
    }),

  staffing: defineTable({
    storeId: v.string(),
    date: v.string(),
    scheduledCount: v.number(),
    actualCount: v.number(),
    noShowCount: v.number(),
    overtimeHours: v.number(),
    staffingRisk: v.string(),
    notes: v.optional(v.string()),
  }).index("by_store_date", ["storeId", "date"])
    .index("by_date", ["date"]),

  resolutions: defineTable({
    resolutionId: v.string(),
    issueId: v.optional(v.string()),
    storeId: v.optional(v.string()),
    issueType: v.string(),
    title: v.string(),
    content: v.string(),
    actionsTaken: v.array(v.string()),
    outcome: v.string(),
    policyIds: v.array(v.string()),
    createdAt: v.string(),
  }).index("by_issueType", ["issueType"])
    .index("by_issueId", ["issueId"])
    .searchIndex("search_content", {
      searchField: "content",
      filterFields: ["issueType"],
    }),

  actionItems: defineTable({
    actionItemId: v.string(),
    issueId: v.optional(v.string()),
    storeId: v.optional(v.string()),
    regionId: v.optional(v.string()),
    title: v.string(),
    description: v.string(),
    assignee: v.string(),
    priority: v.string(),
    status: v.string(),
    source: v.string(),
    dueAt: v.optional(v.string()),
    createdAt: v.string(),
    completedAt: v.optional(v.string()),
  }).index("by_store", ["storeId"])
    .index("by_region", ["regionId"])
    .index("by_status", ["status"])
    .index("by_priority", ["priority"])
    .index("by_issue", ["issueId"]),

  files: defineTable({
    fileId: v.string(),
    issueId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    storeId: v.optional(v.string()),
    regionId: v.optional(v.string()),
    filename: v.string(),
    mimeType: v.string(),
    fileCategory: v.string(),
    sizeBytes: v.number(),
    storageId: v.optional(v.id("_storage")),
    uploadedBy: v.string(),
    uploadedAt: v.string(),
    analysisStatus: v.optional(v.string()),
    summary: v.optional(v.string()),
  }).index("by_issue", ["issueId"])
    .index("by_session", ["sessionId"])
    .index("by_store", ["storeId"])
    .index("by_region", ["regionId"])
    .index("by_fileId", ["fileId"]),

  messages: defineTable({
    role: v.string(),
    content: v.string(),
    status: v.optional(v.string()),
    storeId: v.optional(v.string()),
    regionId: v.optional(v.string()),
    sessionId: v.string(),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
    references: v.optional(v.array(v.string())),
    sourceUrls: v.optional(v.array(v.string())),
    fileIds: v.optional(v.array(v.string())),
    metadataJson: v.optional(v.string()),
  }).index("by_session", ["sessionId"]),

  messageEvents: defineTable({
    messageId: v.id("messages"),
    sessionId: v.string(),
    storeId: v.optional(v.string()),
    regionId: v.optional(v.string()),
    eventType: v.string(),
    sequence: v.number(),
    summary: v.string(),
    payloadJson: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_session", ["sessionId"])
    .index("by_message", ["messageId"])
    .index("by_session_sequence", ["sessionId", "sequence"]),

  answerPackets: defineTable({
    answerPacketId: v.string(),
    messageId: v.optional(v.id("messages")),
    sessionId: v.string(),
    operatorId: v.string(),
    storeId: v.optional(v.string()),
    regionId: v.optional(v.string()),
    query: v.string(),
    answer: v.string(),
    references: v.array(v.string()),
    sourceUrls: v.array(v.string()),
    qualityStatus: v.string(),
    qualitySummary: v.optional(v.string()),
    qualityChecksJson: v.string(),
    briefJson: v.optional(v.string()),
    traceJson: v.optional(v.string()),
    model: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_answerPacketId", ["answerPacketId"])
    .index("by_message", ["messageId"])
    .index("by_session", ["sessionId"])
    .index("by_session_createdAt", ["sessionId", "createdAt"])
    .index("by_store", ["storeId"])
    .index("by_region", ["regionId"]),

  evalRuns: defineTable({
    evalRunId: v.string(),
    dataset: v.string(),
    model: v.string(),
    limit: v.number(),
    status: v.string(),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    summaryJson: v.optional(v.string()),
  }).index("by_evalRunId", ["evalRunId"])
    .index("by_status", ["status"])
    .index("by_startedAt", ["startedAt"]),

  evalCases: defineTable({
    evalRunId: v.string(),
    caseId: v.string(),
    scenario: v.string(),
    query: v.string(),
    responsePreview: v.string(),
    refScore: v.number(),
    foundRefs: v.array(v.string()),
    missingRefs: v.array(v.string()),
    criteriaResultsJson: v.string(),
    judgeScoresJson: v.string(),
    sessionId: v.optional(v.string()),
    messageId: v.optional(v.id("messages")),
    answerPacketId: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_evalRunId", ["evalRunId"])
    .index("by_evalRun_caseId", ["evalRunId", "caseId"]),

  eventLogs: defineTable({
    eventId: v.string(),
    eventType: v.string(),
    status: v.string(),
    actorId: v.string(),
    actorName: v.string(),
    actorRole: v.string(),
    storeId: v.optional(v.string()),
    regionId: v.optional(v.string()),
    entityId: v.optional(v.string()),
    summary: v.string(),
    detailsJson: v.optional(v.string()),
    createdAt: v.string(),
  }).index("by_eventId", ["eventId"])
    .index("by_store", ["storeId"])
    .index("by_region", ["regionId"])
    .index("by_actor", ["actorId"]),
});

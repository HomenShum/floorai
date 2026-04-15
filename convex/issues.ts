import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requireIssueAccess, requireRegionAccess, requireStoreAccess } from "./access";

export const getById = query({
  args: { operatorId: v.string(), issueId: v.string() },
  handler: async (ctx, args) => {
    await requireIssueAccess(ctx, args.operatorId, args.issueId);
    return await ctx.db
      .query("issues")
      .withIndex("by_issueId", (q: any) => q.eq("issueId", args.issueId))
      .first();
  },
});

export const getByStore = query({
  args: { operatorId: v.string(), storeId: v.string() },
  handler: async (ctx, args) => {
    await requireStoreAccess(ctx, args.operatorId, args.storeId);
    return await ctx.db
      .query("issues")
      .withIndex("by_store", (q: any) => q.eq("storeId", args.storeId))
      .collect();
  },
});

export const getAll = query({
  args: { operatorId: v.string() },
  handler: async (ctx, args) => {
    await requireRegionAccess(ctx, args.operatorId, "REG-NE");
    return await ctx.db.query("issues").collect();
  },
});

export const getByRegion = query({
  args: { operatorId: v.string(), regionId: v.string() },
  handler: async (ctx, args) => {
    await requireRegionAccess(ctx, args.operatorId, args.regionId);
    const stores = await ctx.db
      .query("stores")
      .withIndex("by_region", (q: any) => q.eq("regionId", args.regionId))
      .collect();
    const storeIds = new Set(stores.map((s: any) => s.storeId));
    const allIssues = await ctx.db.query("issues").collect();
    return allIssues.filter(
      (i: any) => storeIds.has(i.storeId) || i.storeId === "STR-ALL"
    );
  },
});

export const search = query({
  args: {
    operatorId: v.string(),
    storeId: v.optional(v.string()),
    issueType: v.optional(v.string()),
    severity: v.optional(v.string()),
    status: v.optional(v.string()),
    keyword: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.storeId && args.storeId !== "STR-ALL") {
      await requireStoreAccess(ctx, args.operatorId, args.storeId);
    } else {
      await requireRegionAccess(ctx, args.operatorId, "REG-NE");
    }
    let results = await ctx.db.query("issues").collect();
    if (args.storeId) {
      results = results.filter(
        (i: any) => i.storeId === args.storeId || i.storeId === "STR-ALL"
      );
    }
    if (args.issueType) {
      results = results.filter((i: any) => i.issueType === args.issueType);
    }
    if (args.severity) {
      results = results.filter((i: any) => i.severity === args.severity);
    }
    if (args.status) {
      results = results.filter((i: any) => i.status === args.status);
    }
    if (args.keyword) {
      const needle = args.keyword.toLowerCase();
      results = results.filter(
        (i: any) =>
          i.title.toLowerCase().includes(needle) ||
          i.description.toLowerCase().includes(needle) ||
          i.issueId.toLowerCase().includes(needle) ||
          (i.relatedPolicy?.toLowerCase().includes(needle) ?? false) ||
          (i.affectedSku?.toLowerCase().includes(needle) ?? false)
      );
    }
    return results;
  },
});

export const create = mutation({
  args: {
    operatorId: v.string(),
    storeId: v.string(),
    regionId: v.string(),
    title: v.string(),
    description: v.string(),
    issueType: v.string(),
    severity: v.string(),
    reporterName: v.string(),
    reporterRole: v.string(),
    relatedPolicy: v.optional(v.string()),
    affectedSku: v.optional(v.string()),
    estimatedRevenueImpact: v.number(),
  },
  handler: async (ctx, args) => {
    await requireStoreAccess(ctx, args.operatorId, args.storeId);
    const existing = await ctx.db.query("issues").collect();
    const nextNumber =
      existing
        .map((issue: any) => Number(String(issue.issueId).replace("ISS-", "")))
        .filter((value) => !Number.isNaN(value))
        .reduce((max, value) => Math.max(max, value), 0) + 1;
    const issueId = `ISS-${String(nextNumber).padStart(3, "0")}`;
    await ctx.db.insert("issues", {
      issueId,
      storeId: args.storeId,
      issueType: args.issueType,
      severity: args.severity,
      title: args.title,
      description: args.description,
      category: args.issueType,
      status: "open",
      createdAt: new Date().toISOString(),
      escalatedToRegional: args.severity === "critical",
      relatedPolicy: args.relatedPolicy,
      affectedSku: args.affectedSku,
      estimatedRevenueImpact: args.estimatedRevenueImpact,
      reportedByRole: args.reporterRole,
      reporterName: args.reporterName,
    });
    await ctx.runMutation(internal.audit.record, {
      actorId: args.operatorId,
      eventType: "issue.created",
      status: "success",
      storeId: args.storeId,
      entityId: issueId,
      summary: `Created issue ${issueId} for ${args.storeId}.`,
      detailsJson: JSON.stringify({
        severity: args.severity,
        issueType: args.issueType,
        estimatedRevenueImpact: args.estimatedRevenueImpact,
      }),
    });
    return { issueId };
  },
});

export const updateStatus = mutation({
  args: {
    operatorId: v.string(),
    issueId: v.string(),
    status: v.string(),
    resolutionNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const issue = await requireIssueAccess(ctx, args.operatorId, args.issueId);
    const result = await ctx.db.patch(issue._id, {
      status: args.status,
      resolvedAt: args.status === "resolved" ? new Date().toISOString() : undefined,
      resolutionNotes: args.resolutionNotes,
    });
    await ctx.runMutation(internal.audit.record, {
      actorId: args.operatorId,
      eventType: "issue.status_updated",
      status: "success",
      storeId: issue.storeId === "STR-ALL" ? undefined : issue.storeId,
      regionId: issue.storeId === "STR-ALL" ? "REG-NE" : undefined,
      entityId: issue.issueId,
      summary: `Changed ${issue.issueId} to ${args.status}.`,
    });
    return result;
  },
});

export const escalate = mutation({
  args: {
    operatorId: v.string(),
    issueId: v.string(),
  },
  handler: async (ctx, args) => {
    const issue = await requireIssueAccess(ctx, args.operatorId, args.issueId);
    const result = await ctx.db.patch(issue._id, {
      escalatedToRegional: true,
      severity: issue.severity === "critical" ? issue.severity : "high",
    });
    await ctx.runMutation(internal.audit.record, {
      actorId: args.operatorId,
      eventType: "issue.escalated",
      status: "success",
      storeId: issue.storeId === "STR-ALL" ? undefined : issue.storeId,
      regionId: "REG-NE",
      entityId: issue.issueId,
      summary: `Escalated ${issue.issueId} to regional review.`,
    });
    return result;
  },
});

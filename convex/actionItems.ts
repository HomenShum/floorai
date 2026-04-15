import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requireIssueAccess, requireRegionAccess, requireStoreAccess } from "./access";

export const list = query({
  args: {
    operatorId: v.string(),
    storeId: v.optional(v.string()),
    regionId: v.optional(v.string()),
    issueId: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.storeId) {
      await requireStoreAccess(ctx, args.operatorId, args.storeId);
    }
    if (args.regionId) {
      await requireRegionAccess(ctx, args.operatorId, args.regionId);
    }
    let rows = await ctx.db.query("actionItems").collect();
    if (args.storeId) {
      rows = rows.filter((row: any) => row.storeId === args.storeId);
    }
    if (args.regionId) {
      rows = rows.filter((row: any) => row.regionId === args.regionId);
    }
    if (args.issueId) {
      rows = rows.filter((row: any) => row.issueId === args.issueId);
    }
    if (args.status) {
      rows = rows.filter((row: any) => row.status === args.status);
    }
    return rows.sort((a: any, b: any) => b.createdAt.localeCompare(a.createdAt));
  },
});

export const create = mutation({
  args: {
    operatorId: v.string(),
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
  },
  handler: async (ctx, args) => {
    const { operatorId, ...recordArgs } = args;
    if (args.issueId) {
      await requireIssueAccess(ctx, operatorId, args.issueId);
    } else if (args.storeId) {
      await requireStoreAccess(ctx, operatorId, args.storeId);
    } else if (args.regionId) {
      await requireRegionAccess(ctx, operatorId, args.regionId);
    }
    const existing = await ctx.db.query("actionItems").collect();
    const nextNumber =
      existing
        .map((item: any) => Number(String(item.actionItemId).replace("ACT-", "")))
        .filter((value) => !Number.isNaN(value))
        .reduce((max, value) => Math.max(max, value), 0) + 1;
    const inserted = await ctx.db.insert("actionItems", {
      ...recordArgs,
      actionItemId: `ACT-${String(nextNumber).padStart(3, "0")}`,
      createdAt: new Date().toISOString(),
      completedAt: undefined,
    });
    await ctx.runMutation(internal.audit.record, {
      actorId: operatorId,
      eventType: "action_item.created",
      status: "success",
      storeId: args.storeId,
      regionId: args.regionId,
      entityId: `ACT-${String(nextNumber).padStart(3, "0")}`,
      summary: `Created action item ${args.title}.`,
    });
    return inserted;
  },
});

export const updateStatus = mutation({
  args: {
    operatorId: v.string(),
    actionItemId: v.string(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("actionItems")
      .collect()
      .then((rows: any[]) =>
        rows.find((row) => row.actionItemId === args.actionItemId)
      );
    if (!existing) {
      throw new Error(`Action item ${args.actionItemId} not found.`);
    }
    if (existing.storeId) {
      await requireStoreAccess(ctx, args.operatorId, existing.storeId);
    } else if (existing.regionId) {
      await requireRegionAccess(ctx, args.operatorId, existing.regionId);
    }
    const result = await ctx.db.patch(existing._id, {
      status: args.status,
      completedAt: args.status === "completed" ? new Date().toISOString() : undefined,
    });
    await ctx.runMutation(internal.audit.record, {
      actorId: args.operatorId,
      eventType: "action_item.status_updated",
      status: "success",
      storeId: existing.storeId,
      regionId: existing.regionId,
      entityId: existing.actionItemId,
      summary: `Changed ${existing.actionItemId} to ${args.status}.`,
    });
    return result;
  },
});

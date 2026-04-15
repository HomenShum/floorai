import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireStoreAccess } from "./access";
import { internal } from "./_generated/api";

export const getLatestByStore = query({
  args: { operatorId: v.string(), storeId: v.string() },
  handler: async (ctx, args) => {
    await requireStoreAccess(ctx, args.operatorId, args.storeId);
    const rows = await ctx.db
      .query("staffing")
      .withIndex("by_store_date", (q: any) => q.eq("storeId", args.storeId))
      .collect();
    return rows.sort((a: any, b: any) => b.date.localeCompare(a.date))[0] ?? null;
  },
});

export const getByStore = query({
  args: { operatorId: v.string(), storeId: v.string() },
  handler: async (ctx, args) => {
    await requireStoreAccess(ctx, args.operatorId, args.storeId);
    const rows = await ctx.db
      .query("staffing")
      .withIndex("by_store_date", (q: any) => q.eq("storeId", args.storeId))
      .collect();
    return rows.sort((a: any, b: any) => b.date.localeCompare(a.date));
  },
});

export const upsertDaily = mutation({
  args: {
    operatorId: v.string(),
    storeId: v.string(),
    date: v.string(),
    scheduledCount: v.number(),
    actualCount: v.number(),
    noShowCount: v.number(),
    overtimeHours: v.number(),
    staffingRisk: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { operatorId, ...recordArgs } = args;
    await requireStoreAccess(ctx, operatorId, args.storeId);
    const existing = await ctx.db
      .query("staffing")
      .withIndex("by_store_date", (q: any) =>
        q.eq("storeId", args.storeId).eq("date", args.date)
      )
      .first();
    if (existing) {
      const result = await ctx.db.patch(existing._id, recordArgs);
      await ctx.runMutation(internal.audit.record, {
        actorId: operatorId,
        eventType: "staffing.updated",
        status: "success",
        storeId: args.storeId,
        summary: `Updated staffing snapshot for ${args.storeId}.`,
      });
      return result;
    }
    const inserted = await ctx.db.insert("staffing", recordArgs);
    await ctx.runMutation(internal.audit.record, {
      actorId: operatorId,
      eventType: "staffing.created",
      status: "success",
      storeId: args.storeId,
      summary: `Created staffing snapshot for ${args.storeId}.`,
    });
    return inserted;
  },
});

import { v } from "convex/values";

import { requireOperator, requireRegionAccess, requireStoreAccess } from "./access";
import { internalMutation, mutation, query } from "./_generated/server";

async function nextEventId(ctx: any) {
  const rows = await ctx.db.query("eventLogs").collect();
  const nextNumber =
    rows
      .map((row: any) => Number(String(row.eventId).replace("EVT-", "")))
      .filter((value: number) => !Number.isNaN(value))
      .reduce((max: number, value: number) => Math.max(max, value), 0) + 1;
  return `EVT-${String(nextNumber).padStart(4, "0")}`;
}

export const record = internalMutation({
  args: {
    actorId: v.string(),
    eventType: v.string(),
    status: v.string(),
    summary: v.string(),
    storeId: v.optional(v.string()),
    regionId: v.optional(v.string()),
    entityId: v.optional(v.string()),
    detailsJson: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const operator = await requireOperator(ctx, args.actorId);
    const eventId = await nextEventId(ctx);
    await ctx.db.insert("eventLogs", {
      eventId,
      eventType: args.eventType,
      status: args.status,
      actorId: operator.operatorId,
      actorName: operator.name,
      actorRole: operator.role,
      storeId: args.storeId,
      regionId: args.regionId,
      entityId: args.entityId,
      summary: args.summary,
      detailsJson: args.detailsJson,
      createdAt: new Date().toISOString(),
    });
    return { eventId };
  },
});

export const listRecent = query({
  args: {
    operatorId: v.string(),
    storeId: v.optional(v.string()),
    regionId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (args.storeId) {
      await requireStoreAccess(ctx, args.operatorId, args.storeId);
    }
    if (args.regionId) {
      await requireRegionAccess(ctx, args.operatorId, args.regionId);
    }
    const rows = await ctx.db.query("eventLogs").collect();
    return rows
      .filter((row: any) => {
        if (args.storeId) return row.storeId === args.storeId;
        if (args.regionId) return row.regionId === args.regionId || row.storeId === "STR-ALL";
        return row.actorId === args.operatorId;
      })
      .sort((a: any, b: any) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, args.limit ?? 12);
  },
});

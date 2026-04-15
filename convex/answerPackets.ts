import { v } from "convex/values";

import { query, internalMutation } from "./_generated/server";
import { requireRegionAccess, requireStoreAccess } from "./access";

export const create = internalMutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("answerPackets", args);
    return { answerPacketId: args.answerPacketId };
  },
});

export const getLatestBySession = query({
  args: {
    operatorId: v.string(),
    sessionId: v.string(),
    storeId: v.optional(v.string()),
    regionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.storeId) {
      await requireStoreAccess(ctx, args.operatorId, args.storeId);
    }
    if (args.regionId) {
      await requireRegionAccess(ctx, args.operatorId, args.regionId);
    }

    const packets = await ctx.db
      .query("answerPackets")
      .withIndex("by_session_createdAt", (q: any) => q.eq("sessionId", args.sessionId))
      .collect();

    return packets.sort((a: any, b: any) => b.createdAt - a.createdAt)[0] ?? null;
  },
});

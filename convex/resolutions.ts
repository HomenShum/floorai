import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireOperator } from "./access";

function rankResolution(resolution: any, needle: string) {
  const haystack = `${resolution.title} ${resolution.content} ${resolution.outcome}`.toLowerCase();
  let score = 0;
  if (haystack.includes(needle)) score += 4;
  if (resolution.issueType.toLowerCase().includes(needle)) score += 2;
  for (const action of resolution.actionsTaken) {
    if (String(action).toLowerCase().includes(needle)) score += 1;
  }
  return score;
}

export const search = query({
  args: {
    operatorId: v.optional(v.string()),
    issueType: v.optional(v.string()),
    query: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (args.operatorId) await requireOperator(ctx, args.operatorId);
    let rows = await ctx.db.query("resolutions").collect();
    if (args.issueType) {
      rows = rows.filter((row: any) => row.issueType === args.issueType);
    }
    if (args.query) {
      const needle = args.query.toLowerCase();
      rows = rows
        .map((row: any) => ({ row, score: rankResolution(row, needle) }))
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((item) => item.row);
    }
    return rows.slice(0, args.limit ?? 5);
  },
});

export const create = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("resolutions", args);
  },
});

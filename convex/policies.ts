import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireOperator } from "./access";

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("policies").collect();
  },
});

export const search = query({
  args: {
    operatorId: v.optional(v.string()),
    policyId: v.optional(v.string()),
    keyword: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.operatorId) await requireOperator(ctx, args.operatorId);
    if (args.policyId) {
      const result = await ctx.db
        .query("policies")
        .withIndex("by_policyId", (q: any) => q.eq("policyId", args.policyId!))
        .first();
      return result ? [result] : [];
    }
    if (args.keyword) {
      const all = await ctx.db.query("policies").collect();
      const kw = args.keyword.toLowerCase();
      return all.filter(
        (p: any) =>
          p.title.toLowerCase().includes(kw) ||
          p.content.toLowerCase().includes(kw) ||
          p.category.toLowerCase().includes(kw)
      );
    }
    return await ctx.db.query("policies").collect();
  },
});

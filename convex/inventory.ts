import { query } from "./_generated/server";
import { v } from "convex/values";

export const getByStore = query({
  args: {
    storeId: v.string(),
    sku: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.sku) {
      return await ctx.db
        .query("inventory")
        .withIndex("by_store_sku", (q: any) =>
          q.eq("storeId", args.storeId).eq("sku", args.sku!)
        )
        .collect();
    }
    return await ctx.db
      .query("inventory")
      .withIndex("by_store", (q: any) => q.eq("storeId", args.storeId))
      .collect();
  },
});

export const getLowStock = query({
  args: { storeId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let items = await ctx.db.query("inventory").collect();
    if (args.storeId) {
      items = items.filter((i: any) => i.storeId === args.storeId);
    }
    return items.filter((i: any) => i.currentStock <= i.reorderPoint);
  },
});

import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireRegionAccess, requireStoreAccess } from "./access";

export const getAll = query({
  args: { operatorId: v.string() },
  handler: async (ctx, args) => {
    await requireRegionAccess(ctx, args.operatorId, "REG-NE");
    return await ctx.db.query("stores").collect();
  },
});

export const getByRegion = query({
  args: { operatorId: v.string(), regionId: v.string() },
  handler: async (ctx, args) => {
    await requireRegionAccess(ctx, args.operatorId, args.regionId);
    return await ctx.db
      .query("stores")
      .withIndex("by_region", (q: any) => q.eq("regionId", args.regionId))
      .collect();
  },
});

export const getById = query({
  args: { operatorId: v.string(), storeId: v.string() },
  handler: async (ctx, args) => {
    await requireStoreAccess(ctx, args.operatorId, args.storeId);
    return await ctx.db
      .query("stores")
      .withIndex("by_storeId", (q: any) => q.eq("storeId", args.storeId))
      .first();
  },
});

import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireRegionAccess, requireStoreAccess } from "./access";

export const getStoreMetrics = query({
  args: { operatorId: v.string(), storeId: v.string() },
  handler: async (ctx, args) => {
    await requireStoreAccess(ctx, args.operatorId, args.storeId);
    const issues = await ctx.db
      .query("issues")
      .withIndex("by_store", (q: any) => q.eq("storeId", args.storeId))
      .collect();
    const inventory = await ctx.db
      .query("inventory")
      .withIndex("by_store", (q: any) => q.eq("storeId", args.storeId))
      .collect();
    const staffing = await ctx.db
      .query("staffing")
      .withIndex("by_store_date", (q: any) => q.eq("storeId", args.storeId))
      .collect();
    const openIssues = issues.filter((issue: any) => issue.status !== "resolved");
    const lowStock = inventory.filter(
      (item: any) => item.currentStock <= item.reorderPoint
    );
    const latestStaffing =
      staffing.sort((a: any, b: any) => b.date.localeCompare(a.date))[0] ?? null;

    return {
      storeId: args.storeId,
      openIssueCount: openIssues.length,
      criticalIssueCount: openIssues.filter((issue: any) => issue.severity === "critical")
        .length,
      lowStockCount: lowStock.length,
      estimatedRevenueImpact: openIssues.reduce(
        (sum: number, issue: any) => sum + issue.estimatedRevenueImpact,
        0
      ),
      staffing: latestStaffing,
    };
  },
});

export const getRegionalSummary = query({
  args: { operatorId: v.string(), regionId: v.string() },
  handler: async (ctx, args) => {
    await requireRegionAccess(ctx, args.operatorId, args.regionId);
    const stores = await ctx.db
      .query("stores")
      .withIndex("by_region", (q: any) => q.eq("regionId", args.regionId))
      .collect();
    const storeIds = new Set(stores.map((store: any) => store.storeId));
    const issues = (await ctx.db.query("issues").collect()).filter(
      (issue: any) => storeIds.has(issue.storeId) || issue.storeId === "STR-ALL"
    );
    const actionItems = (await ctx.db.query("actionItems").collect()).filter(
      (item: any) => item.regionId === args.regionId
    );
    const staffing = (await ctx.db.query("staffing").collect()).filter((row: any) =>
      storeIds.has(row.storeId)
    );
    const openIssues = issues.filter((issue: any) => issue.status !== "resolved");
    const issueTypeCounts = openIssues.reduce((acc: Record<string, number>, issue: any) => {
      acc[issue.issueType] = (acc[issue.issueType] ?? 0) + 1;
      return acc;
    }, {});
    const atRiskStores = staffing.filter(
      (row: any) => row.staffingRisk === "high" || row.noShowCount >= 2
    ).length;

    return {
      regionId: args.regionId,
      storeCount: stores.length,
      openIssueCount: openIssues.length,
      escalatedIssueCount: openIssues.filter((issue: any) => issue.escalatedToRegional)
        .length,
      criticalIssueCount: openIssues.filter((issue: any) => issue.severity === "critical")
        .length,
      actionItemCount: actionItems.filter((item: any) => item.status !== "completed").length,
      estimatedRevenueImpact: openIssues.reduce(
        (sum: number, issue: any) => sum + issue.estimatedRevenueImpact,
        0
      ),
      issueTypeCounts,
      atRiskStores,
    };
  },
});

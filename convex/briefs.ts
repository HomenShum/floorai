import { v } from "convex/values";

import { query } from "./_generated/server";
import { requireRegionAccess, requireStoreAccess } from "./access";

function tokenizeQuery(query: string) {
  return Array.from(
    new Set(
      query
        .toLowerCase()
        .replace(/[^\w\s-]/g, " ")
        .split(/\s+/)
        .filter((token) => token.length >= 3)
    )
  );
}

function extractReferenceMatches(query: string) {
  const refs = query.match(/\b(?:ISS|POL|SKU|STR)-[A-Z0-9-]+\b/gi) ?? [];
  return new Set(refs.map((ref) => ref.toUpperCase()));
}

function rankIssue(issue: any, tokens: string[], refs: Set<string>) {
  const haystack = [
    issue.issueId,
    issue.storeId,
    issue.title,
    issue.description,
    issue.relatedPolicy,
    issue.affectedSku,
    issue.issueType,
    issue.category,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  let score = 0;
  if (refs.has(String(issue.issueId).toUpperCase())) score += 20;
  if (refs.has(String(issue.relatedPolicy ?? "").toUpperCase())) score += 12;
  if (refs.has(String(issue.affectedSku ?? "").toUpperCase())) score += 12;
  if (refs.has(String(issue.storeId ?? "").toUpperCase())) score += 8;
  if (issue.status !== "resolved") score += 3;
  if (issue.escalatedToRegional) score += 2;
  if (issue.severity === "critical") score += 6;
  if (issue.severity === "high") score += 4;

  for (const token of tokens) {
    if (haystack.includes(token)) {
      score += 2;
    }
  }

  return score;
}

function rankPolicy(policy: any, tokens: string[], refs: Set<string>) {
  const haystack = [policy.policyId, policy.title, policy.content, policy.category]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  let score = 0;
  if (refs.has(String(policy.policyId).toUpperCase())) score += 20;
  for (const token of tokens) {
    if (haystack.includes(token)) {
      score += 2;
    }
  }
  return score;
}

function rankInventory(item: any, tokens: string[], refs: Set<string>) {
  const haystack = [item.sku, item.productName, item.category, item.supplier]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  let score = item.currentStock <= item.reorderPoint ? 3 : 0;
  if (refs.has(String(item.sku).toUpperCase())) score += 15;
  for (const token of tokens) {
    if (haystack.includes(token)) {
      score += 2;
    }
  }
  return score;
}

export const getAgentBrief = query({
  args: {
    operatorId: v.string(),
    query: v.string(),
    storeId: v.optional(v.string()),
    regionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.storeId) {
      await requireStoreAccess(ctx, args.operatorId, args.storeId);
    } else {
      await requireRegionAccess(ctx, args.operatorId, args.regionId ?? "REG-NE");
    }

    const tokens = tokenizeQuery(args.query);
    const refs = extractReferenceMatches(args.query);
    const includeResolutions =
      /\bbefore\b|\bresolved\b|\bwhat happened\b|\bwhat worked\b|\bprecedent\b|\bhistorical\b/i.test(
        args.query
      );
    const regionId = args.regionId ?? "REG-NE";

    const stores = args.storeId
      ? [
          await ctx.db
            .query("stores")
            .withIndex("by_storeId", (q: any) => q.eq("storeId", args.storeId))
            .first(),
        ].filter(Boolean)
      : await ctx.db
          .query("stores")
          .withIndex("by_region", (q: any) => q.eq("regionId", regionId))
          .collect();

    const storeIds = new Set(stores.map((store: any) => store.storeId));
    let issues = await ctx.db.query("issues").collect();
    issues = issues.filter(
      (issue: any) =>
        (args.storeId ? issue.storeId === args.storeId || issue.storeId === "STR-ALL" : storeIds.has(issue.storeId) || issue.storeId === "STR-ALL")
    );

    const rankedIssues = issues
      .map((issue: any) => ({ issue, score: rankIssue(issue, tokens, refs) }))
      .filter((entry: any) => entry.score > 0)
      .sort((a: any, b: any) => b.score - a.score);

    const matchedIssues = rankedIssues.slice(0, 5).map((entry: any) => entry.issue);
    const matchedIssueIds = new Set(matchedIssues.map((issue: any) => issue.issueId));
    const affectedSkus = new Set(
      matchedIssues.map((issue: any) => issue.affectedSku).filter(Boolean)
    );
    const relatedPolicyIds = new Set(
      matchedIssues.map((issue: any) => issue.relatedPolicy).filter(Boolean)
    );

    const crossStoreRelatedIssues = issues
      .filter((issue: any) => !matchedIssueIds.has(issue.issueId))
      .filter(
        (issue: any) =>
          (issue.affectedSku && affectedSkus.has(issue.affectedSku)) ||
          (issue.relatedPolicy && relatedPolicyIds.has(issue.relatedPolicy))
      )
      .slice(0, 6);

    const allPolicies = await ctx.db.query("policies").collect();
    const policies = allPolicies
      .map((policy: any) => ({
        policy,
        score:
          (relatedPolicyIds.has(policy.policyId) ? 18 : 0) + rankPolicy(policy, tokens, refs),
      }))
      .filter((entry: any) => entry.score > 0)
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 6)
      .map((entry: any) => entry.policy);

    const inventory = args.storeId
      ? await ctx.db
          .query("inventory")
          .withIndex("by_store", (q: any) => q.eq("storeId", args.storeId))
          .collect()
      : [];
    const inventoryHighlights = inventory
      .map((item: any) => ({ item, score: rankInventory(item, tokens, refs) }))
      .filter((entry: any) => entry.score > 0)
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 5)
      .map((entry: any) => entry.item);

    const latestStaffing = args.storeId
      ? (
          await ctx.db
            .query("staffing")
            .withIndex("by_store_date", (q: any) => q.eq("storeId", args.storeId))
            .collect()
        ).sort((a: any, b: any) => b.date.localeCompare(a.date))[0] ?? null
      : null;

    const highRiskStaffing = args.storeId
      ? []
      : (await ctx.db.query("staffing").collect())
          .filter(
            (row: any) =>
              storeIds.has(row.storeId) &&
              (row.staffingRisk === "high" || row.noShowCount >= 2)
          )
          .slice(0, 5);

    const resolutions = includeResolutions
      ? (await ctx.db.query("resolutions").collect())
          .filter((resolution: any) => {
            if (matchedIssues.length === 0) {
              return tokens.some((token) =>
                `${resolution.title} ${resolution.content} ${resolution.outcome}`
                  .toLowerCase()
                  .includes(token)
              );
            }
            return matchedIssues.some(
              (issue: any) =>
                resolution.issueType === issue.issueType ||
                resolution.policyIds?.includes(issue.relatedPolicy)
            );
          })
          .slice(0, 4)
      : [];

    const openIssueCount = issues.filter((issue: any) => issue.status !== "resolved").length;
    const estimatedRevenueImpact = issues
      .filter((issue: any) => issue.status !== "resolved")
      .reduce((sum: number, issue: any) => sum + (issue.estimatedRevenueImpact ?? 0), 0);

    return {
      scope: {
        storeId: args.storeId,
        regionId,
        openIssueCount,
        estimatedRevenueImpact,
      },
      stores,
      matchedIssues,
      crossStoreRelatedIssues,
      policies,
      inventoryHighlights,
      latestStaffing,
      highRiskStaffing,
      resolutions,
    };
  },
});

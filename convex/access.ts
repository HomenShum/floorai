export async function requireOperator(ctx: any, operatorId: string) {
  const operator = await ctx.db
    .query("users")
    .withIndex("by_operatorId", (q: any) => q.eq("operatorId", operatorId))
    .first();

  if (!operator) {
    throw new Error("Operator session is missing or invalid.");
  }

  return operator;
}

export async function requireStoreAccess(ctx: any, operatorId: string, storeId: string) {
  const operator = await requireOperator(ctx, operatorId);

  if (operator.role === "regional_manager") {
    const store = await ctx.db
      .query("stores")
      .withIndex("by_storeId", (q: any) => q.eq("storeId", storeId))
      .first();
    if (!store || !operator.regionIds.includes(store.regionId)) {
      throw new Error(`Operator ${operator.name} cannot access store ${storeId}.`);
    }
    return operator;
  }

  if (!operator.storeIds.includes(storeId)) {
    throw new Error(`Operator ${operator.name} cannot access store ${storeId}.`);
  }

  return operator;
}

export async function requireRegionAccess(ctx: any, operatorId: string, regionId: string) {
  const operator = await requireOperator(ctx, operatorId);
  if (operator.role !== "regional_manager" || !operator.regionIds.includes(regionId)) {
    throw new Error(`Operator ${operator.name} cannot access region ${regionId}.`);
  }
  return operator;
}

export async function requireIssueAccess(ctx: any, operatorId: string, issueId: string) {
  const issue = await ctx.db
    .query("issues")
    .withIndex("by_issueId", (q: any) => q.eq("issueId", issueId))
    .first();

  if (!issue) {
    throw new Error(`Issue ${issueId} not found.`);
  }

  if (issue.storeId === "STR-ALL") {
    await requireRegionAccess(ctx, operatorId, "REG-NE");
  } else {
    await requireStoreAccess(ctx, operatorId, issue.storeId);
  }

  return issue;
}

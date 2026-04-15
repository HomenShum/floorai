import { mutation } from "./_generated/server";

export const seedAll = mutation({
  args: {},
  handler: async (ctx) => {
    const hasUsers = Boolean(await ctx.db.query("users").first());
    const hasStores = Boolean(await ctx.db.query("stores").first());
    const hasIssues = Boolean(await ctx.db.query("issues").first());
    const hasInventory = Boolean(await ctx.db.query("inventory").first());
    const hasStaffing = Boolean(await ctx.db.query("staffing").first());
    const hasPolicies = Boolean(await ctx.db.query("policies").first());
    const hasResolutions = Boolean(await ctx.db.query("resolutions").first());
    const hasActionItems = Boolean(await ctx.db.query("actionItems").first());

    const users = [
      {
        operatorId: "OP-STR-101",
        name: "Maria Chen",
        email: "maria.chen@corp.local",
        role: "store_manager",
        storeIds: ["STR-101"],
        regionIds: ["REG-NE"],
      },
      {
        operatorId: "OP-STR-102",
        name: "David Park",
        email: "david.park@corp.local",
        role: "store_manager",
        storeIds: ["STR-102"],
        regionIds: ["REG-NE"],
      },
      {
        operatorId: "OP-STR-103",
        name: "Lisa Nguyen",
        email: "lisa.nguyen@corp.local",
        role: "store_manager",
        storeIds: ["STR-103"],
        regionIds: ["REG-NE"],
      },
      {
        operatorId: "OP-STR-104",
        name: "James Wright",
        email: "james.wright@corp.local",
        role: "store_manager",
        storeIds: ["STR-104"],
        regionIds: ["REG-NE"],
      },
      {
        operatorId: "OP-STR-105",
        name: "Priya Sharma",
        email: "priya.sharma@corp.local",
        role: "store_manager",
        storeIds: ["STR-105"],
        regionIds: ["REG-NE"],
      },
      {
        operatorId: "OP-STR-106",
        name: "Robert Kim",
        email: "robert.kim@corp.local",
        role: "store_manager",
        storeIds: ["STR-106"],
        regionIds: ["REG-NE"],
      },
      {
        operatorId: "OP-STR-107",
        name: "Angela Torres",
        email: "angela.torres@corp.local",
        role: "store_manager",
        storeIds: ["STR-107"],
        regionIds: ["REG-NE"],
      },
      {
        operatorId: "OP-STR-108",
        name: "Carlos Mendez",
        email: "carlos.mendez@corp.local",
        role: "store_manager",
        storeIds: ["STR-108"],
        regionIds: ["REG-NE"],
      },
      {
        operatorId: "OP-REG-NE",
        name: "Sandra Williams",
        email: "sandra.williams@corp.local",
        role: "regional_manager",
        storeIds: [],
        regionIds: ["REG-NE"],
      },
    ];
    if (!hasUsers) {
      for (const user of users) await ctx.db.insert("users", user);
    }

    // === STORES ===
    const stores = [
      { storeId: "STR-101", name: "Greenfield Plaza", address: "142 Greenfield Ave, Hartford, CT", regionId: "REG-NE", regionName: "Northeast", managerName: "Maria Chen" },
      { storeId: "STR-102", name: "Elm Street Market", address: "78 Elm St, New Haven, CT", regionId: "REG-NE", regionName: "Northeast", managerName: "David Park" },
      { storeId: "STR-103", name: "Harbor View", address: "310 Harbor Rd, Bridgeport, CT", regionId: "REG-NE", regionName: "Northeast", managerName: "Lisa Nguyen" },
      { storeId: "STR-104", name: "Riverside Commons", address: "55 River Rd, Stamford, CT", regionId: "REG-NE", regionName: "Northeast", managerName: "James Wright" },
      { storeId: "STR-105", name: "College Town Express", address: "201 College St, New Haven, CT", regionId: "REG-NE", regionName: "Northeast", managerName: "Priya Sharma" },
      { storeId: "STR-106", name: "Downtown Central", address: "400 Main St, Hartford, CT", regionId: "REG-NE", regionName: "Northeast", managerName: "Robert Kim" },
      { storeId: "STR-107", name: "Lakeside Fresh", address: "88 Lake Ave, West Hartford, CT", regionId: "REG-NE", regionName: "Northeast", managerName: "Angela Torres" },
      { storeId: "STR-108", name: "Westfield Junction", address: "120 Westfield Rd, Meriden, CT", regionId: "REG-NE", regionName: "Northeast", managerName: "Carlos Mendez" },
    ];
    if (!hasStores) {
      for (const s of stores) await ctx.db.insert("stores", s);
    }

    // === ISSUES (all 20 from synthetic dataset) ===
    const issues = [
      {
        issueId: "ISS-001", storeId: "STR-101", issueType: "inventory_gap", severity: "high",
        title: "Organic milk shortage — supplier missed 2 deliveries",
        description: "Horizon Organic 64oz whole milk (SKU-4411) out of stock 3 days. DairyFresh Co missed deliveries on 4/10 and 4/12. ~120 units/week demand. Neighboring store (Elm Street) also affected.",
        category: "inventory", status: "open", createdAt: "2026-04-12T09:15:00Z",
        escalatedToRegional: true, relatedPolicy: "POL-INV-003", affectedSku: "SKU-4411",
        estimatedRevenueImpact: 480, reportedByRole: "store_manager", reporterName: "Maria Chen",
      },
      {
        issueId: "ISS-002", storeId: "STR-102", issueType: "inventory_gap", severity: "medium",
        title: "Same organic milk supplier delay — DairyFresh Co",
        description: "Confirming same issue as Greenfield Plaza. DairyFresh Co no-showed twice. 8 units left, ~1 day of stock. Need emergency substitute supplier authorization.",
        category: "inventory", status: "open", createdAt: "2026-04-12T10:30:00Z",
        escalatedToRegional: true, relatedPolicy: "POL-INV-003", affectedSku: "SKU-4411",
        estimatedRevenueImpact: 360, reportedByRole: "store_manager", reporterName: "David Park",
      },
      {
        issueId: "ISS-003", storeId: "STR-103", issueType: "staffing", severity: "critical",
        title: "3 call-outs on Saturday — cannot cover floor",
        description: "Three associates called out for Saturday shift. Only 4 of 7 showed. Bakery and deli unstaffed. Need overtime approval + emergency temp staffing.",
        category: "staffing", status: "in_progress", createdAt: "2026-04-12T06:45:00Z",
        escalatedToRegional: true, relatedPolicy: "POL-HR-007", affectedSku: undefined,
        estimatedRevenueImpact: 2200, reportedByRole: "store_manager", reporterName: "Lisa Nguyen",
      },
      {
        issueId: "ISS-004", storeId: "STR-104", issueType: "equipment_failure", severity: "critical",
        title: "Walk-in cooler temperature alarm — perishables at risk",
        description: "Walk-in cooler #2 at 52°F (should be 35-38°F). Compressor noise. ~$8K dairy/produce at risk. HVAC vendor (CoolTech) earliest Monday. Need emergency vendor authorization.",
        category: "equipment", status: "open", createdAt: "2026-04-12T04:20:00Z",
        escalatedToRegional: true, relatedPolicy: "POL-MAINT-001", affectedSku: undefined,
        estimatedRevenueImpact: 8000, reportedByRole: "store_manager", reporterName: "James Wright",
      },
      {
        issueId: "ISS-005", storeId: "STR-101", issueType: "compliance", severity: "medium",
        title: "Health inspection scheduled for next week — prep checklist incomplete",
        description: "County health inspector visit confirmed 4/18. Three items open: handwashing log gaps 4/8-4/10, thermometer calibration overdue in deli, March pest control report not filed.",
        category: "compliance", status: "in_progress", createdAt: "2026-04-11T14:00:00Z",
        escalatedToRegional: false, relatedPolicy: "POL-COMP-002", affectedSku: undefined,
        estimatedRevenueImpact: 0, reportedByRole: "store_manager", reporterName: "Maria Chen",
      },
      {
        issueId: "ISS-006", storeId: "STR-105", issueType: "operational", severity: "low",
        title: "Planogram reset delayed — seasonal endcap transition",
        description: "Spring seasonal endcap transition due 4/7, still showing winter clearance. Team lacks bandwidth due to inventory counts. Requesting 3-day extension or regional merchandising support.",
        category: "operational", status: "open", createdAt: "2026-04-11T11:00:00Z",
        escalatedToRegional: false, relatedPolicy: "POL-MERCH-004", affectedSku: undefined,
        estimatedRevenueImpact: 150, reportedByRole: "store_manager", reporterName: "Priya Sharma",
      },
      {
        issueId: "ISS-007", storeId: "STR-106", issueType: "customer_escalation", severity: "high",
        title: "Customer slip-and-fall incident — legal documentation needed",
        description: "Customer slip near produce wet floor at 2:15 PM. Incident report filed. Customer mentioned contacting attorney. Security footage preserved. Need corporate legal notification timeline.",
        category: "safety", status: "open", createdAt: "2026-04-11T14:30:00Z",
        escalatedToRegional: true, relatedPolicy: "POL-SAFETY-001", affectedSku: undefined,
        estimatedRevenueImpact: 0, reportedByRole: "store_manager", reporterName: "Robert Kim",
      },
      {
        issueId: "ISS-008", storeId: "STR-102", issueType: "inventory_gap", severity: "low",
        title: "Seasonal allergy medicine display empty — vendor managed",
        description: "Claritin and Zyrtec vendor-managed display empty. Vendor (Johnson Distribution) usually restocks Wednesdays, last restock skipped. Allergy season peak.",
        category: "inventory", status: "open", createdAt: "2026-04-10T16:00:00Z",
        escalatedToRegional: false, relatedPolicy: "POL-INV-005", affectedSku: "SKU-7823",
        estimatedRevenueImpact: 320, reportedByRole: "store_manager", reporterName: "David Park",
      },
      {
        issueId: "ISS-009", storeId: "STR-103", issueType: "staffing", severity: "medium",
        title: "New hire onboarding delayed — POS training backlog",
        description: "Two new hires started 4/7 but can't operate registers. Training module system down 4/7-4/9. Bagging only. Need register-certified before weekend.",
        category: "staffing", status: "in_progress", createdAt: "2026-04-10T09:00:00Z",
        escalatedToRegional: false, relatedPolicy: "POL-HR-012", affectedSku: undefined,
        estimatedRevenueImpact: 0, reportedByRole: "store_manager", reporterName: "Lisa Nguyen",
      },
      {
        issueId: "ISS-010", storeId: "STR-107", issueType: "theft_shrinkage", severity: "high",
        title: "Organized retail theft — cosmetics section hit 3 times this week",
        description: "Third coordinated grab-and-run in cosmetics. ~$1,200 losses this week. LP camera caught 2 individuals. Police reports filed. Requesting anti-theft fixture budget.",
        category: "shrinkage", status: "open", createdAt: "2026-04-12T08:00:00Z",
        escalatedToRegional: true, relatedPolicy: "POL-LP-003", affectedSku: undefined,
        estimatedRevenueImpact: 1200, reportedByRole: "store_manager", reporterName: "Angela Torres",
      },
      {
        issueId: "ISS-011", storeId: "STR-104", issueType: "operational", severity: "medium",
        title: "Self-checkout lane 3 and 5 error loops — customer frustration",
        description: "Two of six SCO lanes throwing card reader errors intermittently. Customers abandoning SCO for staffed lanes. IT ticket #IT-88421 open since 4/8, no response.",
        category: "equipment", status: "open", createdAt: "2026-04-10T13:00:00Z",
        escalatedToRegional: false, relatedPolicy: "POL-IT-002", affectedSku: undefined,
        estimatedRevenueImpact: 0, reportedByRole: "store_manager", reporterName: "James Wright",
      },
      {
        issueId: "ISS-012", storeId: "STR-108", issueType: "inventory_gap", severity: "critical",
        title: "Warehouse delivery 6 hours late — fresh produce wilting on truck",
        description: "Scheduled 5AM delivery arrived 11AM. Truck refrigeration marginal. Lettuce, berries, cut fruit borderline. Need quality inspection guidance — accept partial, reject all, or document with discount claim?",
        category: "inventory", status: "open", createdAt: "2026-04-12T11:15:00Z",
        escalatedToRegional: true, relatedPolicy: "POL-INV-008", affectedSku: "SKU-MULTI",
        estimatedRevenueImpact: 3500, reportedByRole: "store_manager", reporterName: "Carlos Mendez",
      },
      {
        issueId: "ISS-013", storeId: "STR-105", issueType: "customer_escalation", severity: "medium",
        title: "Online order pickup — 4 orders unfulfillable due to out-of-stock",
        description: "Four BOPIS orders can't be fulfilled — items show in-stock in system but shelf empty. Customers arriving expecting orders. Inventory vs physical count mismatch.",
        category: "operational", status: "in_progress", createdAt: "2026-04-11T15:30:00Z",
        escalatedToRegional: false, relatedPolicy: "POL-ECOM-001", affectedSku: "SKU-MULTI",
        estimatedRevenueImpact: 280, reportedByRole: "store_manager", reporterName: "Priya Sharma",
      },
      {
        issueId: "ISS-014", storeId: "STR-106", issueType: "compliance", severity: "high",
        title: "Fire exit blocked by delivery pallets — code violation",
        description: "Morning delivery crew left 4 pallets blocking rear fire exit. Second time in 30 days. Need formal vendor warning + fire marshal documentation.",
        category: "compliance", status: "resolved", createdAt: "2026-04-09T07:00:00Z",
        resolvedAt: "2026-04-09T07:45:00Z",
        resolutionNotes: "Pallets cleared in 45 min. Vendor (QuickShip Logistics) issued written warning. Photo documentation filed. Added to delivery SOP checklist.",
        escalatedToRegional: false, relatedPolicy: "POL-SAFETY-005", affectedSku: undefined,
        estimatedRevenueImpact: 0, reportedByRole: "store_manager", reporterName: "Robert Kim",
      },
      {
        issueId: "ISS-015", storeId: "STR-101", issueType: "staffing", severity: "low",
        title: "Employee requesting ADA accommodation — ergonomic equipment",
        description: "Long-term associate (12 years) submitted ADA accommodation request for standing desk mat and modified lifting restrictions. Need HR guidance on approval process.",
        category: "staffing", status: "open", createdAt: "2026-04-10T10:00:00Z",
        escalatedToRegional: false, relatedPolicy: "POL-HR-015", affectedSku: undefined,
        estimatedRevenueImpact: 0, reportedByRole: "store_manager", reporterName: "Maria Chen",
      },
      {
        issueId: "ISS-016", storeId: "STR-107", issueType: "operational", severity: "medium",
        title: "Competitor opened across the street — pricing intelligence needed",
        description: "New discount grocery (FreshMart) opened 4/5. 10-15% foot traffic drop. Price comparison on 20 staples shows we're 8-22% higher on 14 items. Requesting competitive response guidance.",
        category: "competitive", status: "open", createdAt: "2026-04-10T12:00:00Z",
        escalatedToRegional: true, relatedPolicy: "POL-PRICING-001", affectedSku: undefined,
        estimatedRevenueImpact: 5000, reportedByRole: "store_manager", reporterName: "Angela Torres",
      },
      {
        issueId: "ISS-017", storeId: "STR-108", issueType: "equipment_failure", severity: "low",
        title: "Shopping cart corral — 12 carts with broken wheels",
        description: "12 carts with locked/broken wheels. Customers grab and return immediately. Cart vendor minimum replacement is 20. Requesting approval or interim solution.",
        category: "equipment", status: "open", createdAt: "2026-04-08T09:00:00Z",
        escalatedToRegional: false, relatedPolicy: "POL-MAINT-006", affectedSku: undefined,
        estimatedRevenueImpact: 0, reportedByRole: "store_manager", reporterName: "Carlos Mendez",
      },
      {
        issueId: "ISS-018", storeId: "STR-ALL", issueType: "cross_store_pattern", severity: "high",
        title: "Regional pattern: DairyFresh Co affecting 4+ stores — vendor review",
        description: "DairyFresh Co delivery failures across Greenfield (ISS-001), Elm Street (ISS-002), and 2 stores in adjacent region. Systemic vendor issue. Initiating 30-day vendor performance review.",
        category: "vendor_management", status: "in_progress", createdAt: "2026-04-12T11:00:00Z",
        escalatedToRegional: false, relatedPolicy: "POL-VENDOR-001", affectedSku: "SKU-4411",
        estimatedRevenueImpact: 4200, reportedByRole: "regional_manager", reporterName: "Sandra Williams",
      },
      {
        issueId: "ISS-019", storeId: "STR-ALL", issueType: "strategic", severity: "medium",
        title: "Q2 shrinkage trending 15% above target — action plan needed",
        description: "Regional shrinkage at 2.3% vs 2.0% target. Lakeside (STR-107) outlier at 3.1%. Need store-by-store breakdown, accelerated LP audits for top 3 stores, region comparison.",
        category: "shrinkage", status: "open", createdAt: "2026-04-11T08:00:00Z",
        escalatedToRegional: false, relatedPolicy: "POL-LP-001", affectedSku: undefined,
        estimatedRevenueImpact: 45000, reportedByRole: "regional_manager", reporterName: "Sandra Williams",
      },
      {
        issueId: "ISS-020", storeId: "STR-ALL", issueType: "strategic", severity: "low",
        title: "Summer hiring pipeline — seasonal staffing forecast",
        description: "Summer volume starts mid-May. Need 40-50 seasonal hires across 8 stores. Last year started recruiting 4/15, still had June gaps. Need headcount forecast, job fair coordination, training schedule.",
        category: "staffing", status: "open", createdAt: "2026-04-09T10:00:00Z",
        escalatedToRegional: false, relatedPolicy: "POL-HR-020", affectedSku: undefined,
        estimatedRevenueImpact: 0, reportedByRole: "regional_manager", reporterName: "Sandra Williams",
      },
    ];
    if (!hasIssues) {
      for (const i of issues) await ctx.db.insert("issues", i as any);
    }

    // === INVENTORY (representative items per store) ===
    const baseInventory = [
      { sku: "SKU-4411", productName: "Horizon Organic Whole Milk 64oz", category: "dairy", reorderPoint: 30, supplier: "DairyFresh Co" },
      { sku: "SKU-4412", productName: "Organic Valley 2% Milk 64oz", category: "dairy", reorderPoint: 25, supplier: "DairyFresh Co" },
      { sku: "SKU-7823", productName: "Claritin 24hr 30ct", category: "otc_health", reorderPoint: 10, supplier: "Johnson Distribution" },
      { sku: "SKU-1001", productName: "Bananas (bunch)", category: "produce", reorderPoint: 50, supplier: "FreshHarvest LLC" },
      { sku: "SKU-2005", productName: "Sourdough Bread Loaf", category: "bakery", reorderPoint: 20, supplier: "Local Bakery Co" },
    ];

    const storeStockLevels: Record<string, Record<string, { stock: number; lastDelivery: string }>> = {
      "STR-101": { "SKU-4411": { stock: 0, lastDelivery: "2026-04-08" }, "SKU-4412": { stock: 5, lastDelivery: "2026-04-08" }, "SKU-7823": { stock: 15, lastDelivery: "2026-04-09" }, "SKU-1001": { stock: 65, lastDelivery: "2026-04-12" }, "SKU-2005": { stock: 18, lastDelivery: "2026-04-12" } },
      "STR-102": { "SKU-4411": { stock: 8, lastDelivery: "2026-04-08" }, "SKU-4412": { stock: 3, lastDelivery: "2026-04-08" }, "SKU-7823": { stock: 0, lastDelivery: "2026-04-03" }, "SKU-1001": { stock: 42, lastDelivery: "2026-04-11" }, "SKU-2005": { stock: 22, lastDelivery: "2026-04-12" } },
      "STR-103": { "SKU-4411": { stock: 35, lastDelivery: "2026-04-11" }, "SKU-4412": { stock: 28, lastDelivery: "2026-04-11" }, "SKU-7823": { stock: 12, lastDelivery: "2026-04-09" }, "SKU-1001": { stock: 55, lastDelivery: "2026-04-12" }, "SKU-2005": { stock: 8, lastDelivery: "2026-04-11" } },
      "STR-104": { "SKU-4411": { stock: 22, lastDelivery: "2026-04-10" }, "SKU-4412": { stock: 18, lastDelivery: "2026-04-10" }, "SKU-7823": { stock: 9, lastDelivery: "2026-04-09" }, "SKU-1001": { stock: 30, lastDelivery: "2026-04-11" }, "SKU-2005": { stock: 25, lastDelivery: "2026-04-12" } },
      "STR-105": { "SKU-4411": { stock: 40, lastDelivery: "2026-04-11" }, "SKU-4412": { stock: 32, lastDelivery: "2026-04-11" }, "SKU-7823": { stock: 14, lastDelivery: "2026-04-10" }, "SKU-1001": { stock: 48, lastDelivery: "2026-04-12" }, "SKU-2005": { stock: 15, lastDelivery: "2026-04-11" } },
      "STR-106": { "SKU-4411": { stock: 28, lastDelivery: "2026-04-10" }, "SKU-4412": { stock: 20, lastDelivery: "2026-04-10" }, "SKU-7823": { stock: 11, lastDelivery: "2026-04-09" }, "SKU-1001": { stock: 70, lastDelivery: "2026-04-12" }, "SKU-2005": { stock: 19, lastDelivery: "2026-04-12" } },
      "STR-107": { "SKU-4411": { stock: 15, lastDelivery: "2026-04-09" }, "SKU-4412": { stock: 12, lastDelivery: "2026-04-09" }, "SKU-7823": { stock: 6, lastDelivery: "2026-04-08" }, "SKU-1001": { stock: 38, lastDelivery: "2026-04-11" }, "SKU-2005": { stock: 21, lastDelivery: "2026-04-12" } },
      "STR-108": { "SKU-4411": { stock: 30, lastDelivery: "2026-04-10" }, "SKU-4412": { stock: 25, lastDelivery: "2026-04-10" }, "SKU-7823": { stock: 13, lastDelivery: "2026-04-10" }, "SKU-1001": { stock: 10, lastDelivery: "2026-04-12" }, "SKU-2005": { stock: 5, lastDelivery: "2026-04-11" } },
    };

    if (!hasInventory) {
      for (const [storeId, skus] of Object.entries(storeStockLevels)) {
        for (const base of baseInventory) {
          const override = skus[base.sku];
          await ctx.db.insert("inventory", {
            storeId,
            sku: base.sku,
            productName: base.productName,
            category: base.category,
            currentStock: override?.stock ?? 20,
            reorderPoint: base.reorderPoint,
            lastDelivery: override?.lastDelivery ?? "2026-04-10",
            supplier: base.supplier,
          });
        }
      }
    }

    // === STAFFING ===
    const staffing = [
      { storeId: "STR-101", date: "2026-04-14", scheduledCount: 9, actualCount: 8, noShowCount: 1, overtimeHours: 2, staffingRisk: "medium", notes: "Front end covered with one overtime cashier." },
      { storeId: "STR-102", date: "2026-04-14", scheduledCount: 8, actualCount: 8, noShowCount: 0, overtimeHours: 1, staffingRisk: "low", notes: "Stable coverage despite allergy aisle vendor issue." },
      { storeId: "STR-103", date: "2026-04-14", scheduledCount: 7, actualCount: 4, noShowCount: 3, overtimeHours: 8, staffingRisk: "high", notes: "Bakery and deli coverage below target. Temp support requested." },
      { storeId: "STR-104", date: "2026-04-14", scheduledCount: 10, actualCount: 9, noShowCount: 1, overtimeHours: 3, staffingRisk: "medium", notes: "Cooler incident pulling labor into emergency response." },
      { storeId: "STR-105", date: "2026-04-14", scheduledCount: 7, actualCount: 7, noShowCount: 0, overtimeHours: 0, staffingRisk: "low", notes: "Normal staffing." },
      { storeId: "STR-106", date: "2026-04-14", scheduledCount: 11, actualCount: 10, noShowCount: 1, overtimeHours: 2, staffingRisk: "medium", notes: "Service desk tied up on legal documentation." },
      { storeId: "STR-107", date: "2026-04-14", scheduledCount: 8, actualCount: 8, noShowCount: 0, overtimeHours: 1, staffingRisk: "low", notes: "Loss prevention walk added to afternoon schedule." },
      { storeId: "STR-108", date: "2026-04-14", scheduledCount: 8, actualCount: 7, noShowCount: 1, overtimeHours: 2, staffingRisk: "medium", notes: "Receiving team handling delayed produce inspection." },
    ];
    if (!hasStaffing) {
      for (const row of staffing) await ctx.db.insert("staffing", row);
    }

    // === POLICIES ===
    const policies = [
      { policyId: "POL-INV-003", title: "Vendor Non-Compliance Escalation", category: "inventory", effectiveDate: "2025-01-15",
        content: "When a vendor misses 2+ scheduled deliveries within 7 days: (1) Document each missed delivery with date/time. (2) Contact vendor account rep within 24 hours. (3) If no resolution in 48 hours, escalate to Regional Manager. (4) Regional Manager may authorize emergency substitute supplier. (5) Issue formal written warning via vendor portal. (6) After 3 warnings in 90 days, initiate vendor performance review per POL-VENDOR-001." },
      { policyId: "POL-HR-007", title: "Emergency Staffing Protocol", category: "hr", effectiveDate: "2025-03-01",
        content: "When 30%+ of scheduled shift calls out: (1) Store Manager authorized to approve up to 8 hours overtime per remaining associate. (2) Contact neighboring stores for voluntary coverage. (3) If still short, contact regional temp staffing agency (StaffNow: 800-555-0147). (4) Minimum floor coverage: 1 associate per department. (5) If bakery/deli cannot be staffed, close those service counters and post signage. (6) File incident report within 24 hours." },
      { policyId: "POL-MAINT-001", title: "Emergency Equipment Failure", category: "maintenance", effectiveDate: "2025-02-01",
        content: "For equipment failures affecting food safety (coolers, freezers, ovens): (1) Check temperature logs immediately. (2) If temperature exceeds safe range (41°F+ for cold, below 135°F for hot), begin product evaluation. (3) Products above safe temp for 2+ hours must be discarded — document and photograph. (4) Authorized to call any licensed HVAC vendor if primary vendor unavailable within 4 hours. Emergency spend limit: $5,000 without regional approval, $15,000 with regional approval. (5) File insurance claim for product loss exceeding $2,000." },
      { policyId: "POL-COMP-002", title: "Health Inspection Readiness", category: "compliance", effectiveDate: "2025-01-01",
        content: "Pre-inspection checklist (complete 72 hours before scheduled visit): (1) Verify all employee food handler certifications current. (2) Check handwashing logs — no gaps exceeding 4 hours. (3) Calibrate all food thermometers — document results. (4) Verify pest control service reports filed monthly. (5) Walk all storage areas for proper FIFO labeling. (6) Check all cleaning schedules signed off. (7) Verify chemical storage separated from food. (8) Regional support available — request merchandising team for deep clean assistance." },
      { policyId: "POL-MERCH-004", title: "Seasonal Transition Windows", category: "merchandising", effectiveDate: "2025-01-15",
        content: "Seasonal endcap transitions must complete within 5 business days of scheduled date. Extensions up to 3 days may be approved by Store Manager without regional involvement. Beyond 3 days requires Regional Manager approval. All clearance items must be marked down minimum 50% during transition. New planogram sets must be photographed and uploaded to compliance portal within 24 hours of completion." },
      { policyId: "POL-SAFETY-001", title: "Incident Response Protocol", category: "safety", effectiveDate: "2025-01-01",
        content: "For customer injury incidents: (1) Provide immediate first aid if trained. (2) Call 911 if injury appears serious. (3) Complete incident report form IR-200 within 1 hour. (4) Preserve security camera footage — minimum 30-day hold. (5) Do NOT admit fault or liability. (6) Notify corporate legal within 4 hours at legal@corp.com. (7) If customer mentions attorney, escalate immediately to Regional Manager AND corporate legal. (8) Photograph scene before cleanup." },
      { policyId: "POL-INV-005", title: "Vendor-Managed Inventory Gaps", category: "inventory", effectiveDate: "2025-02-15",
        content: "For vendor-managed displays (DSD items): (1) Check vendor restock schedule in vendor portal. (2) If vendor misses scheduled visit, wait 48 hours then contact vendor rep. (3) Store team may NOT restock vendor-managed displays. (4) If display empty 3+ days during peak season, escalate to vendor account manager. (5) Document lost sales estimate based on avg daily units." },
      { policyId: "POL-HR-012", title: "New Hire Certification Timeline", category: "hr", effectiveDate: "2025-03-15",
        content: "All new hires must complete: (1) POS/register certification within 5 business days of start. (2) Food safety certification within 10 business days. (3) Department-specific training within 15 business days. If training systems are unavailable, contact IT help desk (#IT-HELP) and document the outage. Manager may extend deadlines by up to 3 days for system issues. New hires may not work independently until POS-certified." },
      { policyId: "POL-LP-003", title: "Organized Retail Crime Response", category: "loss_prevention", effectiveDate: "2025-04-01",
        content: "For suspected organized retail theft (ORC): (1) Do NOT confront suspects. (2) Activate camera recording on affected areas. (3) File police report within 24 hours — note report number. (4) Submit LP incident report to regional LP manager. (5) After 2+ incidents in 30 days, request anti-theft fixture assessment. Budget for fixtures: up to $3,000 per department with LP manager approval. (6) Share suspect descriptions with neighboring stores via LP network." },
      { policyId: "POL-IT-002", title: "POS System Escalation", category: "it", effectiveDate: "2025-01-15",
        content: "POS/SCO system issues: (1) Restart terminal — fixes 60% of issues. (2) If restart fails, submit IT ticket via portal (Priority: High for payment processing, Medium for peripherals). (3) SLA: 4-hour response for High, 24-hour for Medium. (4) If no response within SLA, call IT escalation line: 800-555-0199. (5) For widespread outage (3+ terminals), activate manual backup procedures." },
      { policyId: "POL-INV-008", title: "Delivery Quality Rejection", category: "inventory", effectiveDate: "2025-02-01",
        content: "When delivery arrives with quality concerns: (1) Temperature-check perishables immediately using calibrated thermometer. (2) Reject items exceeding safe temperature thresholds. (3) For partial acceptance: document accepted vs rejected items on BOL, photograph rejected items. (4) Driver must sign amended BOL. (5) Submit quality claim to vendor within 24 hours with photos. (6) If truck was 4+ hours late, check all perishable temps regardless of appearance. (7) Store Manager authorized to accept with discount claim up to $5,000." },
      { policyId: "POL-ECOM-001", title: "BOPIS Fulfillment Failures", category: "ecommerce", effectiveDate: "2025-03-01",
        content: "When online orders cannot be fulfilled: (1) Contact customer within 2 hours of discovering stock-out. (2) Offer substitution or refund. (3) If customer declines substitution, process full refund + issue $5 digital coupon. (4) Update inventory system to reflect actual count. (5) If phantom inventory detected (system says in-stock, shelf empty), file inventory variance report. (6) For 3+ phantom inventory incidents in 7 days, request cycle count for affected categories." },
      { policyId: "POL-SAFETY-005", title: "Emergency Exit Compliance", category: "safety", effectiveDate: "2025-01-01",
        content: "Emergency exits must be clear at all times. (1) Check all exits during opening and closing walks. (2) No materials within 3 feet of exit doors. (3) Delivery vendors briefed on exit locations — signed acknowledgment required annually. (4) First violation: verbal warning to responsible party. (5) Second violation within 90 days: written warning + vendor notification. (6) Third violation: vendor contract review. (7) Photo-document any violations for fire marshal compliance file." },
      { policyId: "POL-HR-015", title: "ADA Accommodation Process", category: "hr", effectiveDate: "2025-01-15",
        content: "ADA accommodation requests: (1) Accept all requests in writing — do not evaluate merit at store level. (2) Forward to HR within 48 hours via accommodation@corp.com. (3) HR will initiate interactive process with employee within 5 business days. (4) Interim accommodations (if reasonable) may be provided immediately by Store Manager. (5) Ergonomic equipment requests under $500 may be approved at store level. (6) Modified duty assignments require HR approval." },
      { policyId: "POL-PRICING-001", title: "Competitive Response Protocol", category: "pricing", effectiveDate: "2025-04-01",
        content: "When significant competitor opens nearby: (1) Conduct price comparison on top 50 KVI (Known Value Items) within 7 days. (2) Submit comparison to Regional Manager with revenue impact estimate. (3) Regional Manager may authorize targeted price matches on up to 20 items. (4) Monitor foot traffic weekly for 90 days. (5) If traffic drops exceed 10%, escalate to district pricing committee. (6) Do NOT match below cost — loss-leader pricing requires VP approval." },
      { policyId: "POL-VENDOR-001", title: "Vendor Performance Review", category: "vendor_management", effectiveDate: "2025-02-01",
        content: "30-day vendor performance review process: (1) Compile delivery reliability data (on-time %, fill rate, quality rejections). (2) Issue formal performance notification to vendor. (3) Vendor has 15 days to submit corrective action plan. (4) If performance does not improve within 60 days, begin backup vendor qualification. (5) Contract termination requires VP Supply Chain approval. (6) Emergency backup supplier activation: Regional Manager may authorize temporary alternative sourcing." },
      { policyId: "POL-LP-001", title: "Shrinkage Management", category: "loss_prevention", effectiveDate: "2025-01-01",
        content: "Shrinkage target: 2.0% of sales. (1) Monthly shrinkage reporting by department. (2) Stores exceeding target by 0.5%+ require action plan within 14 days. (3) LP audit frequency: quarterly for stores at/below target, monthly for stores above. (4) Top shrinkage categories get priority for fixture investment. (5) Regional LP manager reviews all stores exceeding 2.5% quarterly. (6) Inventory accuracy audits (cycle counts) required monthly for high-shrink departments." },
      { policyId: "POL-HR-020", title: "Seasonal Hiring Playbook", category: "hr", effectiveDate: "2025-03-01",
        content: "Summer seasonal hiring timeline: (1) Submit headcount forecast to Regional Manager by April 15. (2) Job postings live by April 20. (3) Coordinate regional job fairs — minimum 2 events by May 1. (4) Target: all seasonal hires onboarded by May 15. (5) Training batch schedule: POS certification week 1, department training weeks 2-3. (6) Seasonal associates eligible for permanent conversion after 90 days with manager recommendation." },
      { policyId: "POL-MAINT-006", title: "Equipment Replacement Thresholds", category: "maintenance", effectiveDate: "2025-02-15",
        content: "Equipment replacement approval levels: (1) Under $500: Store Manager approved. (2) $500-$2,000: Store Manager + Regional Manager. (3) Over $2,000: VP Operations approval. (4) For batch replacements (e.g., shopping carts), vendor minimum order requirements may be combined across stores to meet thresholds. (5) Submit capital request form CR-100 for items over $1,000. (6) Interim solutions (repairs, rentals) authorized at store level up to $300." },
    ];
    if (!hasPolicies) {
      for (const p of policies) await ctx.db.insert("policies", p);
    }

    // === HISTORICAL RESOLUTIONS ===
    const resolutions = [
      {
        resolutionId: "RES-001",
        issueId: "ISS-001",
        storeId: "STR-101",
        issueType: "inventory_gap",
        title: "Vendor non-compliance resolved through substitute supplier",
        content: "Repeated dairy vendor misses were mitigated by documenting missed deliveries, escalating to regional, and temporarily sourcing from an approved backup vendor while formal vendor review began.",
        actionsTaken: [
          "Logged two missed deliveries with timestamps",
          "Called vendor account representative within 24 hours",
          "Escalated to regional manager for substitute supplier approval",
          "Activated temporary backup supplier for high-demand SKUs",
        ],
        outcome: "Recovered in-stock position within 48 hours and triggered vendor performance review.",
        policyIds: ["POL-INV-003", "POL-VENDOR-001"],
        createdAt: "2026-03-08T14:00:00Z",
      },
      {
        resolutionId: "RES-002",
        issueId: "ISS-003",
        storeId: "STR-103",
        issueType: "staffing",
        title: "Emergency staffing coverage for multi-callout weekend shift",
        content: "A store with three same-day callouts stabilized weekend operations by approving overtime, borrowing coverage from a nearby store, and temporarily closing one service counter until staffing normalized.",
        actionsTaken: [
          "Approved 8 hours overtime for remaining associates",
          "Borrowed one cashier and one deli associate from neighboring store",
          "Closed bakery service counter and posted signage",
          "Filed staffing incident report within 24 hours",
        ],
        outcome: "Store maintained minimum department coverage and reopened full service next day.",
        policyIds: ["POL-HR-007"],
        createdAt: "2026-02-17T18:30:00Z",
      },
      {
        resolutionId: "RES-003",
        issueId: "ISS-004",
        storeId: "STR-104",
        issueType: "equipment_failure",
        title: "Perishable loss contained during cooler outage",
        content: "A walk-in cooler event was contained by moving salvageable product, documenting unsafe temperature exposure, and authorizing an emergency HVAC vendor after the primary vendor missed the response window.",
        actionsTaken: [
          "Checked temperature logs immediately",
          "Discarded exposed product above safe thresholds",
          "Photographed loss for insurance claim",
          "Authorized alternate HVAC vendor under emergency spend policy",
        ],
        outcome: "Food safety risk closed within six hours and claim submitted for product loss.",
        policyIds: ["POL-MAINT-001"],
        createdAt: "2026-01-22T09:10:00Z",
      },
      {
        resolutionId: "RES-004",
        issueType: "customer_escalation",
        title: "Slip-and-fall escalation routed to legal with preserved evidence",
        content: "A customer injury case was handled by preserving footage, avoiding liability admission, notifying legal within four hours, and documenting the scene before cleanup.",
        actionsTaken: [
          "Completed incident report IR-200 within one hour",
          "Placed 30-day hold on security footage",
          "Escalated to legal and regional immediately",
          "Photographed scene before cleanup",
        ],
        outcome: "Case packet was complete for legal review with no evidence gap.",
        policyIds: ["POL-SAFETY-001"],
        createdAt: "2026-02-03T12:20:00Z",
      },
    ];
    if (!hasResolutions) {
      for (const resolution of resolutions) await ctx.db.insert("resolutions", resolution);
    }

    // === ACTION ITEMS ===
    const actionItems = [
      {
        actionItemId: "ACT-001",
        issueId: "ISS-001",
        storeId: "STR-101",
        regionId: "REG-NE",
        title: "Escalate DairyFresh delivery misses to regional",
        description: "Document missed deliveries and request substitute supplier approval.",
        assignee: "Maria Chen",
        priority: "high",
        status: "open",
        source: "seed",
        dueAt: "2026-04-14T18:00:00Z",
        createdAt: "2026-04-14T09:00:00Z",
      },
      {
        actionItemId: "ACT-002",
        issueId: "ISS-003",
        storeId: "STR-103",
        regionId: "REG-NE",
        title: "Secure emergency Saturday staffing coverage",
        description: "Approve overtime, call neighboring stores, and contact StaffNow if gaps remain.",
        assignee: "Lisa Nguyen",
        priority: "critical",
        status: "in_progress",
        source: "seed",
        dueAt: "2026-04-14T17:00:00Z",
        createdAt: "2026-04-14T06:50:00Z",
      },
      {
        actionItemId: "ACT-003",
        issueId: "ISS-018",
        regionId: "REG-NE",
        title: "Run DairyFresh vendor performance review",
        description: "Compile delivery reliability across stores and issue formal vendor notice.",
        assignee: "Sandra Williams",
        priority: "high",
        status: "open",
        source: "seed",
        dueAt: "2026-04-15T17:00:00Z",
        createdAt: "2026-04-14T10:00:00Z",
      },
    ];
    if (!hasActionItems) {
      for (const item of actionItems) await ctx.db.insert("actionItems", item);
    }

    return `Seed checked: stores=${hasStores ? "existing" : stores.length}, issues=${hasIssues ? "existing" : issues.length}, inventory=${hasInventory ? "existing" : Object.keys(storeStockLevels).length * baseInventory.length}, staffing=${hasStaffing ? "existing" : staffing.length}, policies=${hasPolicies ? "existing" : policies.length}, resolutions=${hasResolutions ? "existing" : resolutions.length}, actionItems=${hasActionItems ? "existing" : actionItems.length}`;
  },
});

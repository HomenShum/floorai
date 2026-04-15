/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as access from "../access.js";
import type * as actionItems from "../actionItems.js";
import type * as agent from "../agent.js";
import type * as answerPackets from "../answerPackets.js";
import type * as audit from "../audit.js";
import type * as briefs from "../briefs.js";
import type * as eval from "../eval.js";
import type * as evalRuns from "../evalRuns.js";
import type * as files from "../files.js";
import type * as inventory from "../inventory.js";
import type * as issues from "../issues.js";
import type * as messages from "../messages.js";
import type * as operations from "../operations.js";
import type * as policies from "../policies.js";
import type * as resolutions from "../resolutions.js";
import type * as seed from "../seed.js";
import type * as staffing from "../staffing.js";
import type * as stores from "../stores.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  access: typeof access;
  actionItems: typeof actionItems;
  agent: typeof agent;
  answerPackets: typeof answerPackets;
  audit: typeof audit;
  briefs: typeof briefs;
  eval: typeof eval;
  evalRuns: typeof evalRuns;
  files: typeof files;
  inventory: typeof inventory;
  issues: typeof issues;
  messages: typeof messages;
  operations: typeof operations;
  policies: typeof policies;
  resolutions: typeof resolutions;
  seed: typeof seed;
  staffing: typeof staffing;
  stores: typeof stores;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  agent: import("@convex-dev/agent/_generated/component.js").ComponentApi<"agent">;
};

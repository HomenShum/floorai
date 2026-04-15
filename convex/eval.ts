import { GoogleGenAI } from "@google/genai";
import { v } from "convex/values";

import goldenDataset from "../data/golden_dataset.json";
import { api, internal } from "./_generated/api";
import { action } from "./_generated/server";

const MODEL_NAME = "gemini-3.1-pro-preview";

interface GoldenCase {
  id: string;
  scenario: string;
  role: string;
  storeId?: string;
  regionId?: string;
  query: string;
  required_references: string[];
  preferred_response: string;
  criteria: Record<string, boolean>;
}

interface JudgeScores {
  accuracy: number;
  actionability: number;
  policy_compliance: number;
  completeness: number;
  groundedness: number;
  reasoning: string;
}

interface EvalResult {
  id: string;
  scenario: string;
  query: string;
  refScore: number;
  foundRefs: string[];
  missingRefs: string[];
  criteriaResults: Record<string, { expected: boolean; passed: boolean }>;
  judgeScores: JudgeScores;
  responsePreview: string;
}

function makeRuntimeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
}

function operatorIdForCase(testCase: GoldenCase) {
  if (testCase.role === "regional_manager") {
    return "OP-REG-NE";
  }
  if (testCase.storeId) {
    return `OP-${testCase.storeId}`;
  }
  return "OP-REG-NE";
}

function extractResponseText(response: any): string {
  const parts = response?.candidates?.[0]?.content?.parts ?? [];
  return parts
    .map((part: any) => (typeof part?.text === "string" ? part.text : ""))
    .filter(Boolean)
    .join("\n")
    .trim();
}

function automatedRefCheck(
  response: string,
  requiredRefs: string[]
): { score: number; found: string[]; missing: string[] } {
  const found = requiredRefs.filter((ref) =>
    response.toLowerCase().includes(ref.toLowerCase())
  );
  const missing = requiredRefs.filter(
    (ref) => !response.toLowerCase().includes(ref.toLowerCase())
  );
  return {
    score: requiredRefs.length === 0 ? 1 : found.length / requiredRefs.length,
    found,
    missing,
  };
}

function automatedCriteriaCheck(
  response: string,
  criteria: Record<string, boolean>
): Record<string, { expected: boolean; passed: boolean }> {
  const results: Record<string, { expected: boolean; passed: boolean }> = {};

  if ("must_mention_issue_id" in criteria) {
    results.must_mention_issue_id = {
      expected: criteria.must_mention_issue_id,
      passed: criteria.must_mention_issue_id ? /ISS-\d{3}/.test(response) : true,
    };
  }
  if ("must_reference_policy" in criteria) {
    results.must_reference_policy = {
      expected: criteria.must_reference_policy,
      passed: criteria.must_reference_policy ? /POL-[A-Z]+-\d{3}/.test(response) : true,
    };
  }
  if ("must_provide_action_steps" in criteria) {
    results.must_provide_action_steps = {
      expected: criteria.must_provide_action_steps,
      passed: criteria.must_provide_action_steps ? /\(?\d\)|\d\.\s/.test(response) : true,
    };
  }
  if ("must_mention_cross_store_pattern" in criteria) {
    results.must_mention_cross_store_pattern = {
      expected: criteria.must_mention_cross_store_pattern,
      passed: criteria.must_mention_cross_store_pattern
        ? /STR-\d{3}.*STR-\d{3}|cross.store|pattern|multiple stores/i.test(response)
        : true,
    };
  }
  if ("must_mention_revenue_impact" in criteria) {
    results.must_mention_revenue_impact = {
      expected: criteria.must_mention_revenue_impact,
      passed: criteria.must_mention_revenue_impact ? /\$\d|impact/i.test(response) : true,
    };
  }

  return results;
}

async function judgeResponse(
  ai: GoogleGenAI,
  testCase: GoldenCase,
  actualResponse: string
): Promise<JudgeScores> {
  const judgePrompt = `You are evaluating a retail operations AI assistant.

Score the ACTUAL response against the EXPECTED response on a 1-5 scale for:
- accuracy
- actionability
- policy_compliance
- completeness
- groundedness

Return ONLY valid JSON with this shape:
{"accuracy":0,"actionability":0,"policy_compliance":0,"completeness":0,"groundedness":0,"reasoning":"one sentence"}

TEST QUERY: ${testCase.query}
EXPECTED RESPONSE: ${testCase.preferred_response}
REQUIRED REFERENCES: ${testCase.required_references.join(", ")}
ACTUAL RESPONSE: ${actualResponse}`;

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: judgePrompt,
    config: {
      temperature: 1,
      responseMimeType: "application/json",
    },
  });
  const responseText = extractResponseText(response);

  try {
    return JSON.parse(responseText) as JudgeScores;
  } catch {
    return {
      accuracy: 0,
      actionability: 0,
      policy_compliance: 0,
      completeness: 0,
      groundedness: 0,
      reasoning: `Failed to parse judge output: ${responseText.slice(0, 120)}`,
    };
  }
}

export const runEval: any = action({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (
    ctx: any,
    args: { limit?: number }
  ): Promise<{
    summary: {
      totalTests: number;
      avgReferenceScore: string;
      avgAccuracy: string;
      avgActionability: string;
      avgPolicyCompliance: string;
      avgCompleteness: string;
      avgGroundedness: string;
    };
    details: EvalResult[];
  }> => {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error("Set GEMINI_API_KEY or GOOGLE_API_KEY in the Convex environment.");
    }

    const ai = new GoogleGenAI({ apiKey });
    const cases = (goldenDataset as GoldenCase[]).slice(
      0,
      args.limit ?? goldenDataset.length
    );
    const evalRunId = makeRuntimeId("EVALRUN");
    const startedAt = Date.now();

    const results: EvalResult[] = [];

    await ctx.runMutation(internal.evalRuns.startRun, {
      evalRunId,
      dataset: "data/golden_dataset.json",
      model: MODEL_NAME,
      limit: cases.length,
      status: "running",
      startedAt,
    });

    try {
      for (const testCase of cases) {
        const sessionId = `eval-${testCase.id}-${Date.now()}`;
        const response: unknown = await ctx.runAction(api.agent.chat, {
          operatorId: operatorIdForCase(testCase),
          query: testCase.query,
          storeId: testCase.storeId,
          regionId: testCase.regionId,
          sessionId,
        });

        const actualResponse =
          typeof response === "string"
            ? response
            : typeof response === "object" &&
                response !== null &&
                typeof (response as { answer?: unknown }).answer === "string"
              ? (response as { answer: string }).answer
              : JSON.stringify(response);
        const responseEnvelope =
          typeof response === "object" && response !== null
            ? (response as { messageId?: string; answerPacketId?: string })
            : {};
        const refCheck = automatedRefCheck(actualResponse, testCase.required_references);
        const criteriaCheck = automatedCriteriaCheck(actualResponse, testCase.criteria);
        const judgeScores = await judgeResponse(ai, testCase, actualResponse);

        const result = {
          id: testCase.id,
          scenario: testCase.scenario,
          query: testCase.query,
          refScore: refCheck.score,
          foundRefs: refCheck.found,
          missingRefs: refCheck.missing,
          criteriaResults: criteriaCheck,
          judgeScores,
          responsePreview: actualResponse.slice(0, 300),
        };

        results.push(result);
        await ctx.runMutation(internal.evalRuns.recordCase, {
          evalRunId,
          caseId: testCase.id,
          scenario: testCase.scenario,
          query: testCase.query,
          responsePreview: result.responsePreview,
          refScore: result.refScore,
          foundRefs: result.foundRefs,
          missingRefs: result.missingRefs,
          criteriaResultsJson: JSON.stringify(result.criteriaResults),
          judgeScoresJson: JSON.stringify(result.judgeScores),
          sessionId,
          messageId: responseEnvelope.messageId as any,
          answerPacketId: responseEnvelope.answerPacketId,
          createdAt: Date.now(),
        });
      }

      const total = results.length || 1;
      const avgRefScore = results.reduce((sum, result) => sum + result.refScore, 0) / total;
      const avgJudge = {
        accuracy:
          results.reduce((sum, result) => sum + (result.judgeScores.accuracy || 0), 0) / total,
        actionability:
          results.reduce((sum, result) => sum + (result.judgeScores.actionability || 0), 0) /
          total,
        policy_compliance:
          results.reduce(
            (sum, result) => sum + (result.judgeScores.policy_compliance || 0),
            0
          ) / total,
        completeness:
          results.reduce((sum, result) => sum + (result.judgeScores.completeness || 0), 0) /
          total,
        groundedness:
          results.reduce((sum, result) => sum + (result.judgeScores.groundedness || 0), 0) /
          total,
      };

      const summary = {
        totalTests: results.length,
        avgReferenceScore: `${Math.round(avgRefScore * 100)}%`,
        avgAccuracy: `${avgJudge.accuracy.toFixed(1)}/5`,
        avgActionability: `${avgJudge.actionability.toFixed(1)}/5`,
        avgPolicyCompliance: `${avgJudge.policy_compliance.toFixed(1)}/5`,
        avgCompleteness: `${avgJudge.completeness.toFixed(1)}/5`,
        avgGroundedness: `${avgJudge.groundedness.toFixed(1)}/5`,
      };

      await ctx.runMutation(internal.evalRuns.completeRun, {
        evalRunId,
        status: "completed",
        completedAt: Date.now(),
        summaryJson: JSON.stringify(summary),
      });

      return {
        summary,
        details: results,
      };
    } catch (error: any) {
      await ctx.runMutation(internal.evalRuns.completeRun, {
        evalRunId,
        status: "failed",
        completedAt: Date.now(),
        summaryJson: JSON.stringify({
          message: error?.message ?? "Eval run failed.",
          completedCases: results.length,
        }),
      });
      throw error;
    }
  },
});

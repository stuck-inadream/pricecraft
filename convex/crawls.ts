import { api } from "./_generated/api";
import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";

/** internal mutations used by the action */

export const _insertRun = mutation({
  args: { targetId: v.id("crawlTargets") },
  handler: async (ctx, { targetId }) => {
    const runId = await ctx.db.insert("crawlRuns", {
      targetId,
      startedAt: Date.now(),
      extracts: {},
    });
    return runId;
  },
});

export const _insertFinding = mutation({
  args: { runId: v.id("crawlRuns"), findings: v.any() },
  handler: async (ctx, { runId, findings }) => {
    const findingId = await ctx.db.insert("priceFindings", { runId, findings });
    return findingId;
  },
});

/** public api */

export const addTarget = mutation({
  args: { orgId: v.id("orgs"), url: v.string(), label: v.string() },
  handler: async (ctx, { orgId, url, label }) => {
    const id = await ctx.db.insert("crawlTargets", {
      orgId,
      url,
      label,
      createdAt: Date.now(),
    });
    return await ctx.db.get(id);
  },
});

export const fetchAndParse = action({
  args: { url: v.string() },
  handler: async (_ctx, { url }) => {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 PricecraftBot" },
      });
      const html = await res.text();

      const matches = Array.from(
        html.matchAll(/(?:\$|USD\s*\$?)?\s*(\d{2,3})(?:\.\d{2})?/gi)
      ).map((m) => Number(m[1]));
      const uniq = Array.from(new Set(matches)).filter((n) => n >= 5 && n <= 999);

      const lower = html.toLowerCase();
      const labelGuess =
        lower.includes("pro") ? "Pro" :
        lower.includes("team") ? "Team" :
        lower.includes("starter") ? "Starter" : "";

      return { ok: true, prices: uniq.slice(0, 6), labelGuess };
    } catch (err) {
      console.log("fetchAndParse error", err);
      return { ok: false, prices: [], labelGuess: "" };
    }
  },
});

export const listTargetById = query({
  args: { targetId: v.id("crawlTargets") },
  handler: async (ctx, { targetId }) => ctx.db.get(targetId),
});

export const runCrawl = action({
  args: { targetId: v.id("crawlTargets") },
  handler: async (
    ctx,
    { targetId }
  ): Promise<{ ok: true; runId: Id<"crawlRuns">; findingId: Id<"priceFindings"> }> => {
    const target = (await ctx.runQuery(
      api.crawls.listTargetById as any,
      { targetId } as any
    )) as Doc<"crawlTargets"> | null;
    if (!target) throw new Error("Target not found");

    const runId: Id<"crawlRuns"> = await ctx.runMutation(
      api.crawls._insertRun as any,
      { targetId }
    );

    const parsed: { ok: boolean; prices: number[]; labelGuess: string } =
      await ctx.runAction(api.crawls.fetchAndParse as any, { url: target.url });

    const findingsPayload: {
      parsedAt: number;
      source: string;
      prices: number[];
      labelGuess: string;
    } = {
      parsedAt: Date.now(),
      source: target.url,
      prices: parsed.ok ? parsed.prices : [],
      labelGuess: parsed.ok ? parsed.labelGuess : "",
    };

    const findingId: Id<"priceFindings"> = await ctx.runMutation(
      api.crawls._insertFinding as any,
      {
        runId,
        findings: findingsPayload,
      }
    );

    return { ok: true as const, runId, findingId };
  },
});

/** aggregate findings for an org into simple cards */
export const listFindings = query({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, { orgId }) => {
    const targets = (await ctx.db
      .query("crawlTargets")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .collect()) as Doc<"crawlTargets">[];

    const targetIds = new Set(targets.map(t => t._id as Id<"crawlTargets">));
    const runs = (await ctx.db.query("crawlRuns").collect()) as Doc<"crawlRuns">[];
    const runById = new Map<Id<"crawlRuns">, Doc<"crawlRuns">>(
      runs
        .filter(r => targetIds.has(r.targetId))
        .map((r) => [r._id, r])
    );

    const findings = (await ctx.db
      .query("priceFindings")
      .collect()) as Doc<"priceFindings">[];

    const byTargetId = new Map<Id<"crawlTargets">, Doc<"crawlTargets">>(
      targets.map((t) => [t._id, t])
    );

    return findings
      .map((f) => {
        const run = runById.get(f.runId);
        const target = run ? byTargetId.get(run.targetId) : undefined;
        return {
          _id: (f._id as unknown) as string,
          url: target?.url ?? "",
          label: target?.label ?? "",
          findings: f.findings,
          startedAt: run?.startedAt ?? 0,
        };
      })
      .filter((row) => row.startedAt)
      .sort((a, b) => Number(b.startedAt) - Number(a.startedAt));
  },
});

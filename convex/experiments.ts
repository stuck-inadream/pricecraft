import { action, mutation, query } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";

/**
 * Generate up to three proposals based on the latest finding.
 * Uses OpenAI if a key exists, otherwise returns a safe fallback.
 */
export const generateProposals = action({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, { orgId }): Promise<{ proposals: any[]; used: "openai" | "fallback" }> => {
    let latest: any = null;
    try {
      const findings = (await ctx.runQuery(api.crawls.listFindings as any, { orgId } as any)) as any[];
      latest = findings?.[0] ?? null;
    } catch {
      latest = null;
    }

    let plans: any[] = [];
    try {
      // Optional context, only if you have a plans module
      plans = (await ctx.runQuery(api.plans.listPlans as any, { orgId } as any)) as any[];
    } catch {
      plans = [];
    }

    const fallback = [
      {
        title: "Price anchor at 29",
        hypothesis: "Anchoring at 29 increases Pro signup conversion",
        metric: "signup_conversion_rate",
        action: "Highlight Pro 29 as primary for half of pricing traffic",
      },
      {
        title: "Competitor parity banner",
        hypothesis: "Parity banner lowers bounce for specific referrers",
        metric: "bounce_rate",
        action: "Show same features as X at better price to X referrers",
      },
      {
        title: "Annual nudge",
        hypothesis: "Annual two months free increases ARPU",
        metric: "annual_plan_mix",
        action: "Add gentle annual nudge and preselect annual for returning visitors",
      },
    ];

    const key = process.env.OPENAI_API_KEY;
    if (!key) return { proposals: fallback, used: "fallback" };

    try {
      const prompt = [
        "You are a pricing experiment generator for a SaaS app.",
        "Given recent competitor findings and current plans, return one to three JSON proposals.",
        "Each item: {title, hypothesis, metric, action}.",
        "Keep titles short and select measurable metrics.",
        "",
        `Finding: ${JSON.stringify(latest ?? {})}`,
        `Plans: ${JSON.stringify(
          plans.map((p: any) => ({ name: p?.name, monthlyPrice: p?.monthlyPrice ?? null }))
        )}`,
      ].join("\n");

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "Return only a JSON array. No commentary." },
            { role: "user", content: prompt },
          ],
          temperature: 0.4,
        }),
      });

      const json = await res.json();
      const text =
        json?.choices?.[0]?.message?.content?.trim?.() ?? JSON.stringify(fallback);

      let parsed: any[] = [];
      try {
        parsed = JSON.parse(text);
        if (!Array.isArray(parsed)) parsed = [parsed];
      } catch {
        parsed = fallback;
      }

      const proposals = parsed.slice(0, 3).map((p: any) => ({
        title: String(p.title ?? ""),
        hypothesis: String(p.hypothesis ?? ""),
        metric: String(p.metric ?? "conversion_rate"),
        action: String(p.action ?? ""),
      }));

      return { proposals, used: "openai" };
    } catch (e) {
      console.log("openai error", e);
      return { proposals: fallback, used: "fallback" };
    }
  },
});

export const insertExperiment = mutation({
  args: {
    orgId: v.id("orgs"),
    name: v.string(),
    status: v.string(),
    payload: v.any(),
  },
  handler: async (
    ctx,
    { orgId, name, status, payload }
  ): Promise<Id<"experiments">> => {
    const id = await ctx.db.insert("experiments", {
      orgId,
      name,
      status,
      payload,
      createdAt: Date.now(),
    });
    return id;
  },
});

export const proposeExperiment = action({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, { orgId }): Promise<{ _id: Id<"experiments">; proposals: any[] }> => {
    const gen = (await ctx.runAction(api.experiments.generateProposals as any, { orgId } as any)) as
      { proposals: any[]; used: "openai" | "fallback" };

    const id = (await ctx.runMutation(api.experiments.insertExperiment as any, {
      orgId,
      name: gen.used === "openai" ? "AI proposals" : "Auto proposals",
      status: "proposed",
      payload: { proposals: gen.proposals },
    })) as Id<"experiments">;

    return { _id: id, proposals: gen.proposals };
  },
});

export const acceptProposal = mutation({
  args: { experimentId: v.id("experiments"), index: v.number() },
  handler: async (ctx, { experimentId, index }): Promise<{ ok: true }> => {
    const exp = await ctx.db.get(experimentId);
    if (!exp) throw new Error("Experiment not found");
    const proposals = (exp.payload as any)?.proposals ?? [];
    const chosen = proposals[index];
    if (!chosen) throw new Error("Invalid proposal index");

    await ctx.db.patch(experimentId, {
      status: "accepted",
      name: chosen.title || (exp as any).name,
      payload: chosen,
    });

    return { ok: true };
  },
});

export const listByOrg = query({
  args: { orgId: v.id("orgs"), limit: v.optional(v.number()) },
  handler: async (ctx, { orgId, limit }): Promise<Doc<"experiments">[]> => {
    const rows = (await ctx.db
      .query("experiments")
      .withIndex("by_org", q => q.eq("orgId", orgId))
      .collect()) as Doc<"experiments">[];

    const sorted = rows.sort((a: any, b: any) => {
      const aT = Number(a.createdAt ?? a._creationTime ?? 0);
      const bT = Number(b.createdAt ?? b._creationTime ?? 0);
      return bT - aT;
    });

    return typeof limit === "number" ? sorted.slice(0, Math.max(0, limit)) : sorted;
  },
});

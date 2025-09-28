import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import type { Id, Doc } from "./_generated/dataModel";
import { api } from "./_generated/api";

// helper type for entitlement
type Entitlement =
  | { ok: false }
  | { ok: true; featureId: Id<"features">; limit: number };

async function checkEntitlement(
  ctx: any,
  userId: Id<"users">,
  featureName: string
): Promise<Entitlement> {
  const ents = (await ctx.db
    .query("entitlements")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .collect()) as Doc<"entitlements">[];

  if (ents.length === 0) return { ok: false };

  const features = (await ctx.db.query("features").collect()) as Doc<"features">[];
  const byId = new Map<Id<"features">, Doc<"features">>(features.map(f => [f._id, f]));
  for (const e of ents) {
    const f = byId.get(e.featureId);
    if (f && f.name === featureName) return { ok: true, featureId: f._id, limit: f.limit };
  }
  return { ok: false };
}

/** List plans for an org */
export const listPlans = query({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, { orgId }) => {
    return await ctx.db
      .query("plans")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();
  },
});

/** Create a plan */
export const createPlan = mutation({
  args: {
    orgId: v.id("orgs"),
    autumnId: v.string(),
    name: v.string(),
    monthlyPrice: v.number(),
  },
  handler: async (ctx, { orgId, autumnId, name, monthlyPrice }) => {
    const id = await ctx.db.insert("plans", { orgId, autumnId, name, monthlyPrice });

    // schedule Autumn sync using api ref
    await ctx.scheduler.runAfter(0, api.plans.syncPlanToAutumn, { planId: id });

    return await ctx.db.get(id);
  },
});

/** Create a feature for a plan */
export const createFeature = mutation({
  args: { planId: v.id("plans"), name: v.string(), limit: v.number() },
  handler: async (ctx, { planId, name, limit }) => {
    const id = await ctx.db.insert("features", { planId, name, limit });
    return await ctx.db.get(id);
  },
});

/** Grant a feature entitlement to a user */
export const grantEntitlement = mutation({
  args: { userId: v.id("users"), featureId: v.id("features") },
  handler: async (ctx, { userId, featureId }) => {
    const id = await ctx.db.insert("entitlements", {
      userId,
      featureId,
      createdAt: Date.now(),
    });
    return await ctx.db.get(id);
  },
});

/** Check entitlement for a feature name */
export const isEntitled = query({
  args: { userId: v.id("users"), featureName: v.string() },
  handler: async (ctx, { userId, featureName }) => {
    return await checkEntitlement(ctx, userId, featureName);
  },
});

/** Record usage if entitled */
export const useFeature = mutation({
  args: { orgId: v.id("orgs"), userId: v.id("users"), featureName: v.string() },
  handler: async (
    ctx,
    { orgId, userId, featureName }
  ): Promise<{ ok: boolean; reason?: string; remaining?: number }> => {
    const ent = await checkEntitlement(ctx, userId, featureName);
    if (!ent.ok) return { ok: false, reason: "not_entitled" };
    await ctx.db.insert("usageEvents", {
      orgId,
      userId,
      featureId: ent.featureId,
      count: 1,
      at: Date.now(),
    });
    return { ok: true, remaining: ent.limit };
  },
});

/** helper to read a plan */
export const getById = query({
  args: { planId: v.id("plans") },
  handler: async (ctx, { planId }) => ctx.db.get(planId),
});

/** update stored Autumn id */
export const updateAutumnId = mutation({
  args: { planId: v.id("plans"), autumnId: v.string() },
  handler: async (ctx, { planId, autumnId }) => {
    await ctx.db.patch(planId, { autumnId });
    return { ok: true };
  },
});

/** action to upsert a plan to Autumn and store returned id */
type SyncResult = { ok: boolean; id?: string | null };

export const syncPlanToAutumn = action({
  args: { planId: v.id("plans") },
  handler: async (ctx, { planId }): Promise<SyncResult> => {
    const key = process.env.AUTUMN_API_KEY;
    if (!key) {
      console.log("AUTUMN_API_KEY missing");
      return { ok: false };
    }

    // be explicit about types to avoid implicit any warnings
    const plan = (await ctx.runQuery(api.plans.getById as any, { planId } as any)) as
      | Doc<"plans">
      | null;
    if (!plan) return { ok: false };

    const res = await fetch("https://api.autumn.example.com/plans/upsert", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        externalId: String(plan._id),
        name: plan.name,
        monthlyPrice: plan.monthlyPrice,
        autumnId: plan.autumnId || null,
      }),
    });

    if (!res.ok) return { ok: false };

    const data = (await res.json()) as { id?: string | number | null } | null;

    if (data?.id && String(data.id) !== (plan.autumnId ?? "")) {
      await ctx.runMutation(api.plans.updateAutumnId as any, {
        planId,
        autumnId: String(data.id),
      } as any);
    }

    return { ok: true, id: data?.id ? String(data.id) : null };
  },
});

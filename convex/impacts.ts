// convex/impacts.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listRecent = query({
  args: { orgId: v.id("orgs"), limit: v.optional(v.number()) },
  handler: async (ctx, { orgId, limit }) => {
    const rows = await ctx.db
      .query("impactSnapshots")
      .withIndex("by_org", q => q.eq("orgId", orgId))
      .collect();
    const sorted = rows.sort((a, b) => (b.at ?? 0) - (a.at ?? 0));
    return (limit ? sorted.slice(0, limit) : sorted) as typeof rows;
  },
});

export const recordSnapshot = mutation({
  args: {
    orgId: v.id("orgs"),
    experimentId: v.id("experiments"),
    mrrDelta: v.number(),
    notes: v.string(),
  },
  handler: async (ctx, { orgId, experimentId, mrrDelta, notes }) => {
    await ctx.db.insert("impactSnapshots", {
      orgId,
      experimentId,
      mrrDelta,
      notes,
      at: Date.now(),
    });
    return { ok: true };
  },
});

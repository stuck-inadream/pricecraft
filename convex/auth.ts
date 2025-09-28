// convex/auth.ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";

/**
 * Return the current user row.
 * In dev you can pass { email } from the client.
 * If there are multiple rows for the same email, keep the newest.
 */
export const me = query({
  args: {
    email: v.optional(v.string()),
    // bump is ignored server side, used only to force the client hook to refetch
    bump: v.optional(v.number()),
  },
  handler: async (ctx, { email }) => {
    const ident = await ctx.auth.getUserIdentity();
    const em = email ?? ident?.email ?? null;
    if (!em) return null;

    // Be robust to accidental duplicates
    const rows = await ctx.db
      .query("users")
      .withIndex("by_email", q => q.eq("email", em))
      .collect();

    if (rows.length === 0) return null;

    // Pick the newest by _creationTime as the canonical user
    const picked = rows
      .slice()
      .sort((a, b) => Number(b._creationTime ?? 0) - Number(a._creationTime ?? 0))[0];

    return picked as Doc<"users">;
  },
});

/**
 * Dev helper to ensure an org and user exist for a given email.
 * Safe for local demos. Not for production.
 */
export const ensureDevUser = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, { email, name }) => {
    // If any user exists for this email, return the newest one
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", q => q.eq("email", email))
      .collect();

    if (existing.length > 0) {
      const newest = existing
        .slice()
        .sort((a, b) => Number(b._creationTime ?? 0) - Number(a._creationTime ?? 0))[0];
      return newest;
    }

    // Reuse any org if present, else create a new one
    const anyOrg = await ctx.db.query("orgs").first();
    let orgId: Id<"orgs">;
    if (anyOrg) {
      orgId = anyOrg._id;
    } else {
      orgId = await ctx.db.insert("orgs", {
        name: "Dev Org",
        createdAt: Date.now(),
      });
    }

    const userId = await ctx.db.insert("users", {
      orgId,
      email,
      name: name ?? "Dev User",
    });

    const user = await ctx.db.get(userId);
    return user!;
  },
});

/**
 * Optional cleanup helper:
 * keeps the newest user row for the email and deletes the rest.
 */
export const cleanDuplicateUsers = mutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const rows = await ctx.db
      .query("users")
      .withIndex("by_email", q => q.eq("email", email))
      .collect();

    if (rows.length <= 1) {
      return { kept: rows[0]?._id ?? null, removed: [] as Id<"users">[] };
    }

    const sorted = rows
      .slice()
      .sort((a, b) => Number(b._creationTime ?? 0) - Number(a._creationTime ?? 0));

    const keep = sorted[0];
    const toRemove = sorted.slice(1);

    for (const r of toRemove) {
      await ctx.db.delete(r._id);
    }

    return { kept: keep._id, removed: toRemove.map(r => r._id) };
  },
});

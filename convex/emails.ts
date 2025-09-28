import { action, mutation } from "./_generated/server";
import { v } from "convex/values";

export const sendFindingDigest = action({
  args: { to: v.string(), subject: v.string(), body: v.string() },
  handler: async (ctx, { to, subject, body }) => {
    const key = process.env.RESEND_API_KEY;
    if (!key) {
      console.log("RESEND_API_KEY missing");
      return { ok: false };
    }
    const from = process.env.RESEND_FROM ?? "onboarding@resend.dev";

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [to], subject, text: body }),
    });
    return { ok: res.ok };
  },
});

export const logEmail = mutation({
  args: {
    orgId: v.id("orgs"),
    to: v.string(),
    subject: v.string(),
    body: v.string(),
  },
  handler: async (ctx, { orgId, to, subject, body }) => {
    await ctx.db.insert("emails", {
      orgId,
      type: "digest",
      content: { to, subject, body },
      sentAt: Date.now(),
    });
    return { ok: true };
  },
});

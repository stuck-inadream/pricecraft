// convex/emails.ts
import { action } from "./_generated/server";
import { v } from "convex/values";

export const sendProposalAcceptedEmail = action({
  args: {
    to: v.string(),
    title: v.string(),
    metric: v.string(),
    delta: v.number(),
    appUrl: v.optional(v.string()),
  },
  handler: async (ctx, { to, title, metric, delta, appUrl }) => {
    const key = process.env.RESEND_API_KEY;
    if (!key) return { ok: false, reason: "missing_key" as const };

    const html = `
      <div style="font-family:ui-sans-serif;line-height:1.5">
        <h2 style="margin:0 0 8px">Proposal accepted</h2>
        <p style="margin:0 0 4px"><b>${title}</b></p>
        <p style="margin:0 0 4px">Metric: ${metric}</p>
        <p style="margin:0 0 12px">Seed MRR delta: $${delta}</p>
        <a href="${appUrl ?? "https://pricecraft.vercel.app"}"
           style="display:inline-block;background:#5b7cfa;color:#fff;padding:8px 12px;border-radius:6px;text-decoration:none">
           Open Pricecraft
        </a>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Pricecraft <onboarding@resend.dev>",
        to: [to],
        subject: `Proposal accepted: ${title}`,
        html,
      }),
    });

    if (!res.ok) return { ok: false as const, reason: "send_failed" as const };
    return { ok: true as const };
  },
});

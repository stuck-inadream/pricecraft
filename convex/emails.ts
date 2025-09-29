// convex/emails.ts
import { v } from "convex/values";
import { action } from "./_generated/server";

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
    if (!key) {
      console.log("sendProposalAcceptedEmail: missing RESEND_API_KEY");
      return { ok: false, reason: "missing_key" } as const;
    }

    const html = `
      <div style="font-family:ui-sans-serif;line-height:1.5">
        <h2 style="margin:0 0 8px">Proposal accepted</h2>
        <p style="margin:0 0 4px"><b>${title}</b></p>
        <p style="margin:0 0 4px">Metric: ${metric}</p>
        <p style="margin:0 12px">Seed MRR delta: $${delta}</p>
        <a href="${appUrl ?? "https://pricecraft.vercel.app"}"
           style="display:inline-block;background:#5b7cfa;color:#fff;padding:8px 12px;border-radius:8px;text-decoration:none">
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
        to,
        subject: "Pricecraft: proposal accepted",
        html,
      }),
    });

    const text = await res.text();
    console.log("Resend response", res.status, text);

    if (!res.ok) {
      return { ok: false, reason: `resend_${res.status}`, body: text } as const;
    }
    return { ok: true } as const;
  },
});

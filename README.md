# pricecraftPricecraft

Live: https://pricecraft.vercel.app
Demo: https://www.loom.com/share/6fd73977abf6467cb7e1f7e53133b4fb?sid=25720acf-1f96-4b60-9a23-0ab97a729e61

Demo flow: crawl → propose → accept → email → impact (60–90s)
Stack: Next.js 15 • Convex • Firecrawl • OpenAI (optional w/ fallback) • Resend (optional)

Pricecraft turns competitor pricing pages into actionable experiments for your own pricing. Paste a URL, crawl & parse it, let the app propose experiments, accept one, and seed an impact snapshot—closing the loop from external signal → internal action.


What it does

Crawl competitor pricing pages (e.g. vercel.com/pricing) and store a finding.
Parse simple signals (prices, plan names) into a finding JSON.
Propose experiments from the latest finding (OpenAI if key is present, or a deterministic fallback so the demo always works).
Accept a proposal → creates an experiments row and (optionally) emails a summary (Resend).
Record an Impact snapshot (seeded value; editable per proposal) to start the tracking loop.
Why this matters: pricing changes quickly; teams respond slowly. Pricecraft lowers the latency from “noticed a competitor move” → “ran a hypothesis in our own pricing.”


Live demo (judge notes)

The live app uses a demo user so you can click through without auth.
“Dev setup” UI only appears on localhost; the hosted app is ready-to-click.
Proposal acceptance triggers a seed Impact entry; the MRR delta is adjustable before clicking Accept.


Architecture

Next.js 15 UI (App Router), deployed on Vercel
Convex for data + functions (queries, mutations, actions)
Key Convex functions
crawls.runCrawl → fetch & parse → writes priceFindings
experiments.proposeExperiment → OpenAI (or deterministic fallback)
experiments.acceptProposal → promote chosen idea
impacts.recordSnapshot / impacts.listRecent → simple impact feed
emails.sendProposalAcceptedEmail → Resend (optional)
Firecrawl for fetching pages
OpenAI optional; deterministic proposals keep the demo working


Quick start (local)
# 1) Install
npm i

# 2) Run Convex and Next in separate terminals
npx convex dev
npm run dev


Create a .env.local at the repo root:

# Demo identity (so the app works without auth)
NEXT_PUBLIC_DEV_EMAIL=you@example.com

# Optional: enable LLM proposals (otherwise deterministic fallback is used)
OPENAI_API_KEY=sk-...

# Optional: email on acceptance (configure in Convex prod too)
RESEND_API_KEY=re_...


Local dev identity: on first load, click Create dev user. This creates a dev org/user for NEXT_PUBLIC_DEV_EMAIL if missing.


Deploy

Convex (prod):
Set NEXT_PUBLIC_CONVEX_URL in Vercel to your Convex prod URL.
Put secrets like RESEND_API_KEY in Convex → Production → Environment Variables.

Deploy your functions:
npx convex deploy

Vercel: connect the repo, set env vars in Project → Settings → Environment Variables:
NEXT_PUBLIC_CONVEX_URL=https://<your-prod>.convex.cloud
NEXT_PUBLIC_DEV_EMAIL=demo@yourdomain.com (for judge-friendly demo)
(Optional) OPENAI_API_KEY if you want LLM proposals live

Push to main → Vercel builds → live at https://pricecraft.vercel.app
 (or your domain).


How to use (judge script, 60–90s)

Add target & crawl
URL: https://vercel.com/pricing
Label: Vercel
Click Add and crawl → a finding appears.
Propose
Click Propose from latest finding → 2–3 ideas appear.
Accept
Optionally tweak MRR delta (seed value for the impact entry).
Click Accept → proposal becomes an experiment, Impact gets a snapshot, and Resend sends an email (if configured).


Configuration & behavior

No OpenAI key? The app falls back to a small, deterministic set of proposals so the demo is consistent.
Email: If RESEND_API_KEY is set (Convex env), accepting a proposal sends an email summary.
MRR delta input: lets you pick the seed impact per proposal (defaults to 100 if blank).
Findings “×” hide buttons: client-side only (for a clean demo).


Sponsor tie-ins

Convex: storage & serverless functions; simple schema & actions.
Next.js / Vercel: zero-config deploy, App Router, fast demo.
Firecrawl: pulls pricing pages.
OpenAI: proposal generation (optional).
Resend: transactional emails on acceptance (optional).


Limitations / next

Parsers are intentionally simple; richer CSS selectors and change diffs would make it production-ready.
Impact is seed-only; real ingestion (Stripe/RevenueCat) would replace the seed step.
Auth is a demo email for now; adding Better Auth + multi-org roles is straight-forward.
Slack/email nudges & experiment templates by vertical are on deck.


Troubleshooting

“Create dev user” doesn’t seem to work:
Restart both processes:

npx convex dev
npm run dev

Duplicate dev users from prior sessions? The app tolerates them. There’s a one-shot auth.cleanDuplicateUsers if you want to tidy.
Local hydration warnings? The “Debug” panel only renders after mount to avoid SSR mismatch; they go away after a refresh.


Repo hygiene

Minimal code, readable functions, tiny schema.
Works with or without OpenAI configured.
Environment variables kept in Vercel/Convex; no secrets in repo.


License

MIT
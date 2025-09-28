# Pricecraft

Pricecraft turns competitor pricing pages into actionable experiments for your own pricing.

Paste a competitor URL, crawl and parse it, auto-generate experiment ideas using OpenAI or a safe fallback, accept one with a click, and seed an impact snapshot to close the loop from external signal to internal action.

## What it shows

1. Crawl competitor pricing pages.
2. Parse simple signals such as prices and plan labels.
3. Propose experiments using OpenAI when a key is present or use a deterministic fallback.
4. Accept a proposal to create an experiment row.
5. Seed a lightweight impact snapshot to start the tracking loop.

## Why now

• Competitor pricing shifts frequently and teams respond slowly.  
• Product teams want hypotheses grounded in real external signals.  
• Convex and LLMs make this loop feasible in hours instead of weeks.

## Architecture

• Next.js 15 front end with Convex client hooks.  
• Convex functions:
  • `crawls.runCrawl` action calls `fetchAndParse` and writes `crawlRuns` plus `priceFindings`.  
  • `experiments.generateProposals` action calls OpenAI or returns a fallback.  
  • `experiments.proposeExperiment` action writes an `experiments` row.  
  • `experiments.acceptProposal` mutation promotes a chosen idea.  
  • `impacts.recordSnapshot` and `impacts.listRecent` manage the simple impact feed.  
• Optional keys keep the demo working without external services.

## Quick start

1. Clone the repo and install  
npm i

2. Start Convex and Next in separate terminals  
npx convex dev
npm run dev

3. Dev identity  
The app hardcodes `sarandahalitaj@gmail.com` during development. On first load click **Create dev user**. This creates a dev org and user if missing.

4. Optional keys in `.env.local`  
OPENAI_API_KEY=...
RESEND_API_KEY=...
RESEND_FROM=...

The app proposes experiments with a deterministic fallback when OpenAI is not configured.

## Demo script

1. Add target and crawl  
• URL: `https://vercel.com/pricing`  
• Label: Vercel  
• Click **Add and crawl**. A finding appears.

2. Propose  
• Click **Propose from latest finding**.  
• Two to three experiment ideas appear.

3. Accept  
• Click **Accept** on one idea.  
• **Recent proposals** shows the accepted experiment.  
• **Impact** shows a seeded entry.

## Screenshots to include

1. Findings list with one item expanded showing parsed prices and source.  
2. Experiment ideas list just after proposing.  
3. Recent proposals with status accepted and the Impact section with the seed.

## Notes for reviewers

• The app is intentionally tiny and readable.  
• Works without OpenAI by returning a consistent set of proposals.  
• Data model is minimal and easy to adapt for a real product.

## What is next

• Rich per-competitor parsers with CSS selectors and change diffs over time.  
• Real impact ingestion from Stripe or RevenueCat instead of a seed.  
• Multi-org auth, roles, and Slack or email nudges.  
• Experiment templates by vertical.

## Troubleshooting

• If **Create dev user** appears to do nothing, restart both processes and try again:  
`npx convex dev` and `npm run dev`.  
• If you created duplicates for the same email earlier, the app now tolerates them. There is also a one-shot cleanup mutation `auth.cleanDuplicateUsers` you can call once if you wish.


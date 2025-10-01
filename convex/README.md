# Pricecraft

**Live:** https://pricecraft.vercel.app  
**Repo:** (this repo)  
**Demo video:** 60–120s showing: crawl → propose → accept → email → impact

Pricecraft turns competitor pricing pages into **actionable experiments** for your own pricing. Paste a URL, crawl & parse it, let the LLM propose ideas, accept one, and seed an impact snapshot—closing the loop from **external signal → internal action**.

---

## What it shows

1. Crawl competitor pricing pages (e.g. `vercel.com/pricing`).
2. Parse simple signals (prices, plan labels) into findings.
3. Propose experiments via **OpenAI** (or a deterministic fallback).
4. Accept a proposal → create an experiment row.
5. Record a seed **Impact** snapshot (e.g., +$100 MRR).
6. **Email notification** via **Resend** when you accept.

---

## Stack / Sponsors

- **Convex** — DB, queries, mutations, and actions (core app logic)  
- **Next.js 15** — UI (deployed on **Vercel**)  
- **Firecrawl** — scrape competitor pricing pages  
- **OpenAI** — LLM proposal generation (optional; has fallback)  
- **Resend** — transactional email on proposal acceptance

---

## Architecture

- Next.js app uses `convex/react` hooks.
- Convex functions:
  - `crawls.runCrawl` → fetch & parse → `priceFindings`
  - `experiments.proposeExperiment` → OpenAI (or fallback) ideas
  - `experiments.acceptProposal` → promote chosen idea
  - `impacts.recordSnapshot` / `impacts.listRecent` → simple impact feed
  - `emails.sendProposalAcceptedEmail` → Resend API

---

## Quick start

```bash
# 1) deps
npm i

# 2) run dev (two terminals)
npx convex dev           # terminal 1 (Convex)
npm run dev              # terminal 2 (Next.js)
````

**Dev identity:** the app defaults to `sarandahalitaj@gmail.com` locally. On first load click **Create dev user** to create a dev org/user.

**Optional `.env.local`:**

```bash
OPENAI_API_KEY=...
NEXT_PUBLIC_DEV_EMAIL=your@email.com
```

**Convex env (Dev + Prod) — set in the Convex dashboard:**

```bash
RESEND_API_KEY=...
```

The app still works without OpenAI (deterministic proposals).

---

## Demo script (what judges will see)

1. **Add target and crawl**

* URL: `https://vercel.com/pricing`
* Label: `Vercel`
* Click **Add and crawl** → a finding appears.

2. **Propose**

* Click **Propose from latest finding**
* 2–3 experiment ideas appear.

3. **Accept**

* Click **Accept** on one idea
* **Recent proposals** shows it
* **Impact** shows a seeded entry
* **Email** delivered via **Resend**

---

## Screenshots (optional)

* Findings list (expanded with parsed prices & source)
* Experiment ideas (after Propose)
* Recent proposals + Impact section
* Resend dashboard showing delivered email

---

## Notes for reviewers

* Tiny, readable code; minimal schema.
* Works without OpenAI via fallback proposals.
* Easy to extend with richer parsers or real revenue sources.

---

## What’s next

* Diffing & alerts on competitor price changes
* Real impact ingestion (Stripe/RevenueCat)
* Multi-org auth & Slack/email nudges
* Experiment templates by vertical

---

## Troubleshooting

* If **Create dev user** seems stuck, restart both processes:

  * `npx convex dev` and `npm run dev`
* Duplicates from old dev sessions are tolerated; a one-shot cleanup `auth.cleanDuplicateUsers` exists if needed.

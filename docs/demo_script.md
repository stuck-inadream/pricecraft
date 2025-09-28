# Pricecraft demo script

Goal
Show the loop: add target and crawl → propose → accept → impact seed

Prep
• Run `npx convex dev` in one terminal
• Run `npm run dev` in another
• Open http://localhost:3000
• If Dev setup appears, click Create dev user

Flow
1) Add and crawl
   • URL: https://vercel.com/pricing
   • Label: Vercel
   • Click Add and crawl
   • In Findings, open Details to show parsed prices and source

2) Propose from latest finding
   • Click Propose from latest finding
   • Two to three ideas appear with title, hypothesis, metric, action

3) Accept and seed impact
   • Click Accept on one idea
   • Recent proposals shows the accepted item
   • Impact shows a seeded entry with mrr delta and the note Seed

Screenshots to take
1) Findings with Details open
2) Experiment ideas list before accepting
3) Recent proposals with accepted status and Impact with the seed

Notes
• OpenAI key is optional. If missing, fallback proposals appear
• You can also try https://render.com/pricing or https://www.netlify.com/pricing/

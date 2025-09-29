"use client";

import React from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";

// Only show the debug box when running locally
const showDebug =
  typeof window !== "undefined" && window.location.hostname === "localhost";

/* ---------- light types ---------- */
type MeLite = { _id?: string; orgId?: string | null; org?: { _id?: string } | null };
type FindingRow = { _id: string; url: string; label: string; findings: any; startedAt: number };
type ExperimentRow = { _id: string; name: string; status: string; payload: any; createdAt: number };
type ImpactRow = { _id: string; experimentId: string; mrrDelta: number; notes: string; at: number };

/* ---------- helper: optional query ---------- */
function useMaybeArrayQuery<T>(
  q: any,
  enabled: boolean,
  args: Record<string, any>
): T[] {
  const data =
    (useQuery(q as any, enabled ? (args as any) : ("skip" as any)) as T[] | undefined) ?? [];
  return data;
}

export default function Page() {
  // Prefer env var, fallback keeps the demo working locally
  const devEmail = process.env.NEXT_PUBLIC_DEV_EMAIL || "sarandahalitaj@gmail.com";

  // me query, driven by a local bump to force refetch after creating the dev user
  const [meBump, setMeBump] = React.useState(0);
  const me = useQuery(api.auth.me as any, { email: devEmail, bump: meBump } as any) as
    | MeLite
    | undefined;

  const ensureDevUser = useMutation(api.auth.ensureDevUser as any);

  // derived ids
  const userId = me?._id ?? "";
  const orgId = (me?.orgId as string) ?? me?.org?._id ?? "";

  // queries
  const findings = useMaybeArrayQuery<FindingRow>(
    api.crawls.listFindings as any,
    Boolean(orgId),
    { orgId }
  );

  const experiments = useMaybeArrayQuery<ExperimentRow>(
    api.experiments.listByOrg as any,
    Boolean(orgId),
    { orgId, limit: 5 }
  );

  const impacts = useMaybeArrayQuery<ImpactRow>(
    api.impacts.listRecent as any,
    Boolean(orgId),
    { orgId, limit: 3 }
  );

  // actions / mutations
  const proposeExperiment = useAction(api.experiments.proposeExperiment as any);
  const acceptProposal = useMutation(api.experiments.acceptProposal as any);
  const recordImpact = useMutation(api.impacts.recordSnapshot as any);
  const sendAccepted = useAction(api.emails.sendProposalAcceptedEmail as any);

  // local ui state
  const [proposals, setProposals] = React.useState<any[] | null>(null);
  const [expId, setExpId] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  // dev setup state
  const [bootBusy, setBootBusy] = React.useState(false);
  const [bootMsg, setBootMsg] = React.useState<string | null>(null);

  async function handleCreateDevUser() {
    setBootBusy(true);
    setBootMsg(null);
    try {
      const res = await ensureDevUser({ email: devEmail, name: "Dev User" } as any);
      if (res && res._id) {
        setBootMsg("Dev user created");
        setMeBump((n) => n + 1); // retrigger useQuery
      } else {
        setBootMsg("Created, but could not load user. Check convex dev logs.");
        setMeBump((n) => n + 1);
      }
    } catch (e: any) {
      console.error("ensureDevUser error", e);
      setBootMsg(`Error ${e?.message ?? String(e)}`);
    } finally {
      setBootBusy(false);
    }
  }

  function AddTarget({ orgId }: { orgId: string }) {
    const addTarget = useMutation(api.crawls.addTarget as any);
    const runCrawl = useAction(api.crawls.runCrawl as any);
    const [url, setUrl] = React.useState("");
    const [label, setLabel] = React.useState("");
    const [localBusy, setLocalBusy] = React.useState(false);

    return (
      <section style={{ marginTop: 16, padding: 12, border: "1px solid #eee", borderRadius: 8 }}>
        <h3>Add target and crawl</h3>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <input
            placeholder="https://competitor.com/pricing"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            style={{ flex: 1 }}
          />
          <input
            placeholder="Competitor name"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            style={{ width: 220 }}
          />
          <button
            disabled={!orgId || !url || localBusy}
            onClick={async () => {
              setLocalBusy(true);
              try {
                const t = await addTarget({ orgId, url, label } as any);
                await runCrawl({ targetId: t._id } as any);
                setUrl("");
                setLabel("");
              } finally {
                setLocalBusy(false);
              }
            }}
          >
            {localBusy ? "Crawling…" : "Add and crawl"}
          </button>
        </div>
      </section>
    );
  }

  return (
    <main style={{ padding: 16, maxWidth: 960, margin: "0 auto" }}>
      {showDebug && (
        <details style={{ marginBottom: 12, fontSize: 12 }}>
          <summary>Debug</summary>
          <pre style={{ whiteSpace: "pre-wrap" }}>
            {JSON.stringify(
              {
                me,
                derived: { userId, orgId, hasOrg: Boolean(orgId) },
                counts: {
                  findings: findings.length,
                  experiments: experiments.length,
                  impacts: impacts.length,
                },
              },
              null,
              2
            )}
          </pre>
        </details>
      )}

      {/* Dev setup if me is missing or orgId is empty */}
      {(!me || !orgId) && (
        <section style={{ marginTop: 8, padding: 12, border: "1px solid #eee", borderRadius: 8 }}>
          <h3>Dev setup</h3>
          <p>Create a dev org and user for {devEmail}</p>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={handleCreateDevUser} disabled={bootBusy}>
              {bootBusy ? "Creating…" : "Create dev user"}
            </button>
            {bootMsg && <span>{bootMsg}</span>}
          </div>
          <p style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
            If nothing happens, run <code>npx convex dev</code> and <code>npm run dev</code> in two terminals,
            then restart both after schema/server changes.
          </p>
        </section>
      )}

      {/* Main app */}
      {orgId ? (
        <>
          <AddTarget orgId={orgId} />

          <section style={{ marginTop: 16, padding: 12, border: "1px solid #eee", borderRadius: 8 }}>
            <h3>Findings</h3>
            <ul style={{ marginTop: 12 }}>
              {findings.map((row) => (
                <li key={row._id} style={{ marginBottom: 12 }}>
                  <div>
                    <strong>{row.label || "Competitor"}</strong> {row.url}
                  </div>
                  <details style={{ marginTop: 6 }}>
                    <summary>Details</summary>
                    <pre style={{ whiteSpace: "pre-wrap", marginTop: 6 }}>
                      {JSON.stringify(row.findings, null, 2)}
                    </pre>
                  </details>
                </li>
              ))}
              {findings.length === 0 && <li>No findings yet</li>}
            </ul>
          </section>

          <section style={{ marginTop: 16, padding: 12, border: "1px solid #eee", borderRadius: 8 }}>
            <h3>Experiment ideas</h3>
            <button
              disabled={!orgId || busy}
              onClick={async () => {
                if (!orgId) return;
                setBusy(true);
                try {
                  const res = await proposeExperiment({ orgId } as any);
                  setProposals(res?.proposals ?? []);
                  setExpId(res?._id ?? null);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Proposing…" : "Propose from latest finding"}
            </button>

            {proposals && (
              <ul style={{ marginTop: 12 }}>
                {proposals.map((p: any, i: number) => (
                  <li key={i} style={{ marginBottom: 8 }}>
                    <div><strong>{p.title}</strong></div>
                    <div>Hypothesis {p.hypothesis}</div>
                    <div>Metric {p.metric}</div>
                    <div>Action {p.action}</div>
                    <button
                      style={{ marginTop: 6 }}
                      disabled={!expId}
                      onClick={async () => {
                        if (!expId) return;
                        await acceptProposal({ experimentId: expId as any, index: i });
                        await recordImpact({
                          orgId,
                          experimentId: expId,
                          mrrDelta: 100,
                          notes: "Seed",
                        } as any);

                        // send email via Resend (Convex action)
                        await sendAccepted({
                          to: process.env.NEXT_PUBLIC_DEV_EMAIL || "sarandahalitaj@gmail.com",
                          title: p?.title ?? "Accepted proposal",
                          metric: p?.metric ?? "MRR",
                          delta: 100,
                          appUrl:
                            typeof window !== "undefined"
                              ? window.location.origin
                              : "https://pricecraft.vercel.app",
                        } as any);

                        setProposals(null);
                      }}
                    >
                      Accept
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section style={{ marginTop: 16, padding: 12, border: "1px solid #eee", borderRadius: 8 }}>
            <h3>Recent proposals</h3>
            <ul style={{ marginTop: 8 }}>
              {experiments.map((e) => (
                <li key={e._id} style={{ marginBottom: 8 }}>
                  <div><strong>{e.name}</strong> · {e.status}</div>
                </li>
              ))}
              {experiments.length === 0 && <li>No proposals yet</li>}
            </ul>
          </section>

          <section style={{ marginTop: 16, padding: 12, border: "1px solid #eee", borderRadius: 8 }}>
            <h3>Impact</h3>
            <ul style={{ marginTop: 8 }}>
              {impacts.map((i) => (
                <li key={i._id} style={{ marginBottom: 8 }}>
                  <div>MRR delta ${i.mrrDelta} · {new Date(i.at).toLocaleString()}</div>
                  <div>{i.notes}</div>
                </li>
              ))}
              {impacts.length === 0 && <li>No impact snapshots yet</li>}
            </ul>
          </section>
        </>
      ) : null}
    </main>
  );
}

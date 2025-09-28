import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  orgs: defineTable({
    name: v.string(),
    createdAt: v.number(),
  }),

  users: defineTable({
    orgId: v.id("orgs"),
    email: v.string(),
    name: v.string(),
  })
    .index("by_org", ["orgId"])
    .index("by_email", ["email"]),

  plans: defineTable({
    orgId: v.id("orgs"),
    autumnId: v.string(),
    name: v.string(),
    monthlyPrice: v.number(),
  }).index("by_org", ["orgId"]),

  features: defineTable({
    planId: v.id("plans"),
    name: v.string(),
    limit: v.number(),
  }).index("by_plan", ["planId"]),

  entitlements: defineTable({
    userId: v.id("users"),
    featureId: v.id("features"),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  usageEvents: defineTable({
    orgId: v.id("orgs"),
    userId: v.id("users"),
    featureId: v.id("features"),
    count: v.number(),
    at: v.number(),
  }).index("by_org", ["orgId"]),

  crawlTargets: defineTable({
    orgId: v.id("orgs"),
    url: v.string(),
    label: v.string(),
    createdAt: v.number(),
  }).index("by_org", ["orgId"]),

  crawlRuns: defineTable({
    targetId: v.id("crawlTargets"),
    startedAt: v.number(),
    extracts: v.any(),
  }),

  priceFindings: defineTable({
    runId: v.id("crawlRuns"),
    findings: v.any(),
  }),

  experiments: defineTable({
    orgId: v.id("orgs"),
    name: v.string(),
    status: v.string(),
    payload: v.any(),
    createdAt: v.number(),
  }).index("by_org", ["orgId"]),

  impactSnapshots: defineTable({
    orgId: v.id("orgs"),
    experimentId: v.id("experiments"),
    mrrDelta: v.number(),
    notes: v.string(),
    at: v.number(),
  }).index("by_org", ["orgId"]),

  emails: defineTable({
    orgId: v.id("orgs"),
    type: v.string(),
    content: v.any(),
    sentAt: v.optional(v.number()),
  }).index("by_org", ["orgId"]),
});

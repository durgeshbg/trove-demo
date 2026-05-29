import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const traitNames = [
  "risk_tolerance",
  "empathy",
  "loyalty",
  "creativity",
  "decisiveness",
] as const;

export type TraitName = (typeof traitNames)[number];

const traitDeltasValidator = v.object({
  risk_tolerance: v.number(),
  empathy: v.number(),
  loyalty: v.number(),
  creativity: v.number(),
  decisiveness: v.number(),
});

export default defineSchema({
  stories: defineTable({
    title: v.string(),
    context: v.string(),
    // Dynamic prompt for LLM to generate scenarios (optional for legacy stories)
    prompt: v.optional(v.string()),
    // The primary trait this story is designed to test (optional for legacy stories)
    primaryTrait: v.optional(v.string()),
    // Secondary traits that are also tested (optional)
    secondaryTraits: v.optional(v.array(v.string())),
    // Trait category for filtering/grouping (optional for legacy stories)
    traitCategory: v.optional(v.string()),
    // Optional: max number of decision points before ending
    maxTurns: v.optional(v.number()),
    // Legacy fields (deprecated but kept for migration compatibility)
    vibe: v.optional(v.string()),
    mood: v.optional(v.string()),
    openingMessage: v.optional(v.string()),
    endingMessage: v.optional(v.string()),
    nodes: v.optional(v.array(v.any())),
  }),

  sessions: defineTable({
    userId: v.string(),
    storyId: v.id("stories"),
    // Current turn number (0-based, increments each decision)
    turnCount: v.optional(v.number()),
    // Legacy field for backward compatibility with old data
    currentNodeIndex: v.optional(v.number()),
    traits: traitDeltasValidator,
    status: v.union(v.literal("active"), v.literal("completed")),
    messages: v.array(
      v.object({
        role: v.union(v.literal("narrator"), v.literal("user")),
        text: v.string(),
        timestamp: v.number(),
      })
    ),
    // Current scenario state for generating next decision
    currentScenario: v.optional(v.string()),
    // Store last generated options for the current scenario
    currentOptions: v.optional(v.array(v.string())),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_status", ["userId", "status"]),

  decisions: defineTable({
    sessionId: v.id("sessions"),
    turnIndex: v.optional(v.number()),
    // Legacy field for backward compatibility with old data
    nodeIndex: v.optional(v.number()),
    input: v.string(),
    traitDeltas: traitDeltasValidator,
    timestamp: v.number(),
  }).index("by_session", ["sessionId"]),
});

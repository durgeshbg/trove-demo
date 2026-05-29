import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const traitNames = [
  "risk_tolerance",
  "empathy",
  "loyalty",
  "creativity",
  "decisiveness",
] as const;

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
    vibe: v.string(),
    mood: v.string(),
    context: v.string(),
    // Dynamic prompt for LLM to generate scenarios (optional for legacy data)
    prompt: v.optional(v.string()),
    // Legacy fields for backward compatibility with old hardcoded stories
    openingMessage: v.optional(v.string()),
    endingMessage: v.optional(v.string()),
    nodes: v.optional(v.array(v.any())),
    // Optional: max number of decision points before ending
    maxTurns: v.optional(v.number()),
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

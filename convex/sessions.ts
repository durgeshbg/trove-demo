import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { type Id } from "./_generated/dataModel";

const traitDeltasValidator = v.object({
  risk_tolerance: v.number(),
  empathy: v.number(),
  loyalty: v.number(),
  creativity: v.number(),
  decisiveness: v.number(),
});

// Legacy: Keep for compatibility but prefer startStoryFromTrait
export const startSession = mutation({
  args: {
    storyId: v.id("stories"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const story = await ctx.db.get("stories", args.storyId);
    if (!story) throw new Error("Story not found");

    const existingActive = await ctx.db
      .query("sessions")
      .withIndex("by_user_and_status", (q) =>
        q.eq("userId", identity.tokenIdentifier).eq("status", "active")
      )
      .take(1);

    if (existingActive.length > 0) {
      // Complete existing session
      await ctx.db.patch(existingActive[0]._id, { status: "completed" });
    }

    const sessionId = await ctx.db.insert("sessions", {
      userId: identity.tokenIdentifier,
      storyId: args.storyId,
      turnCount: 0,
      traits: {
        risk_tolerance: 50,
        empathy: 50,
        loyalty: 50,
        creativity: 50,
        decisiveness: 50,
      },
      status: "active",
      messages: [],
    });

    return sessionId;
  },
});

// Internal: Create a new session (used by startStoryFromTrait)
export const _create = internalMutation({
  args: {
    userId: v.string(),
    storyId: v.id("stories"),
    traits: traitDeltasValidator,
  },
  handler: async (ctx, args): Promise<Id<"sessions">> => {
    return await ctx.db.insert("sessions", {
      userId: args.userId,
      storyId: args.storyId,
      turnCount: 0,
      traits: args.traits,
      status: "active",
      messages: [],
    });
  },
});

// Internal: Get active session for a user
export const _getActiveSessionRaw = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sessions")
      .withIndex("by_user_and_status", (q) =>
        q.eq("userId", args.userId).eq("status", "active")
      )
      .first();
  },
});

// Internal: Complete a session
export const _complete = internalMutation({
  args: {
    sessionId: v.id("sessions"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, { status: "completed" });
  },
});

export const getById = query({
  args: { id: v.id("sessions") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const session = await ctx.db.get("sessions", args.id);
    if (!session) return null;
    if (session.userId !== identity.tokenIdentifier) throw new Error("Unauthorized");

    return session;
  },
});

export const getActiveSession = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const session = await ctx.db
      .query("sessions")
      .withIndex("by_user_and_status", (q) =>
        q.eq("userId", identity.tokenIdentifier).eq("status", "active")
      )
      .order("desc")
      .first();

    if (!session) return null;

    const story = await ctx.db.get("stories", session.storyId);
    return { session, story };
  },
});

export const _update = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    updates: v.object({
      turnCount: v.optional(v.number()),
      traits: v.optional(traitDeltasValidator),
      status: v.optional(v.union(v.literal("active"), v.literal("completed"))),
      messages: v.optional(
        v.array(
          v.object({
            role: v.union(v.literal("narrator"), v.literal("user")),
            text: v.string(),
            timestamp: v.number(),
          })
        )
      ),
      currentScenario: v.optional(v.string()),
      currentOptions: v.optional(v.array(v.string())),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, args.updates);
  },
});

export const _completeLegacy = internalMutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, { status: "completed" });
  },
});

import { query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

const traitDeltasValidator = v.object({
  risk_tolerance: v.number(),
  empathy: v.number(),
  loyalty: v.number(),
  creativity: v.number(),
  decisiveness: v.number(),
});

export const listBySession = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const session = await ctx.db.get("sessions", args.sessionId);
    if (!session) throw new Error("Session not found");
    if (session.userId !== identity.tokenIdentifier) throw new Error("Unauthorized");

    return await ctx.db
      .query("decisions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("desc")
      .collect();
  },
});

export const _create = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    turnIndex: v.number(),
    input: v.string(),
    traitDeltas: traitDeltasValidator,
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("decisions", {
      sessionId: args.sessionId,
      turnIndex: args.turnIndex,
      input: args.input,
      traitDeltas: args.traitDeltas,
      timestamp: Date.now(),
    });
  },
});

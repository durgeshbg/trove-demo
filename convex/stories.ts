import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { GoogleGenAI } from "@google/genai";
import { type Id } from "./_generated/dataModel";
import { traitCategories } from "./traitCategories";

const ai = new GoogleGenAI({ apiKey: process.env.AI_API_KEY });

// Generate a complete story using AI based on trait selection
export const generateStory = action({
  args: {
    categoryId: v.string(),
    primaryTrait: v.string(),
    secondaryTrait: v.optional(v.string()),
    maxTurns: v.optional(v.number()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    storyId: Id<"stories">;
    title: string;
    context: string;
    prompt: string;
    primaryTrait: string;
    secondaryTraits: string[];
    traitCategory: string;
  }> => {
    const maxTurns = args.maxTurns ?? 5;
    const category = traitCategories.find((c) => c.id === args.categoryId);
    const categoryName = category?.name ?? "Character Test";

    const secondaryTraits = args.secondaryTrait ? [args.secondaryTrait] : [];

    try {
      const systemPrompt = `You are a master storyteller for Trove, an immersive behavioral identity game.

Your task is to create a personalized story scenario specifically designed to test the player's ${args.primaryTrait}${args.secondaryTrait ? ` and ${args.secondaryTrait}` : ""}.

STORY REQUIREMENTS:
- The scenario MUST present situations where ${args.primaryTrait} is meaningfully tested
- Every major decision point should reveal something about the player's ${args.primaryTrait}
- The story should feel personal and immersive (second-person perspective)
- Create dilemmas where the "right" choice depends on the player's character

Always respond with valid JSON only.`;

      const userPrompt = `Create an immersive story scenario for a player who wants to explore their **${args.primaryTrait}**${args.secondaryTrait ? ` with **${args.secondaryTrait}** as a secondary focus` : ""}.

Category Context: ${categoryName}
${category ? `Theme: ${category.theme}` : ""}

PRIMARY TRAIT TO TEST: ${args.primaryTrait}
${args.secondaryTrait ? `SECONDARY TRAIT: ${args.secondaryTrait}` : ""}

Generate:
1. A compelling title (max 50 characters) that hints at the ${args.primaryTrait} theme
2. A rich context/setting description (2-3 sentences) that establishes the world and stakes
3. A detailed prompt for the AI to generate scenarios (2-3 sentences) that specifically test ${args.primaryTrait} through difficult choices

The story should make the player face situations where their ${args.primaryTrait} is the key factor in deciding what to do.

Return JSON:
{
  "title": "string",
  "context": "string", 
  "prompt": "string"
}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: [
          { role: "system", parts: [{ text: systemPrompt }] },
          { role: "user", parts: [{ text: userPrompt }] },
        ],
        config: {
          temperature: 0.9,
          responseMimeType: "application/json",
        },
      });

      const text = response.text;
      if (!text) throw new Error("Empty API response");

      const result = JSON.parse(text) as {
        title: string;
        context: string;
        prompt: string;
      };

      const storyId: Id<"stories"> = await ctx.runMutation(
        api.stories._insert,
        {
          title: result.title,
          context: result.context,
          prompt: result.prompt,
          primaryTrait: args.primaryTrait,
          secondaryTraits,
          traitCategory: args.categoryId,
          maxTurns,
        },
      );

      return {
        storyId,
        ...result,
        primaryTrait: args.primaryTrait,
        secondaryTraits,
        traitCategory: args.categoryId,
      };
    } catch (err) {
      console.error("Story generation failed:", err);
      throw new Error("Failed to generate story", { cause: err });
    }
  },
});

// Start a new session by generating a story from trait selection
export const startStoryFromTrait = action({
  args: {
    categoryId: v.string(),
    primaryTrait: v.string(),
    secondaryTrait: v.optional(v.string()),
    maxTurns: v.optional(v.number()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    sessionId: Id<"sessions">;
    storyId: Id<"stories">;
    title: string;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Generate the story first
    const story = await ctx.runAction(api.stories.generateStory, {
      categoryId: args.categoryId,
      primaryTrait: args.primaryTrait,
      secondaryTrait: args.secondaryTrait,
      maxTurns: args.maxTurns,
    });

    // Complete any existing active session
    const existingActive = await ctx.runQuery(
      api.sessions._getActiveSessionRaw,
      { userId: identity.tokenIdentifier },
    );

    if (existingActive) {
      await ctx.runMutation(internal.sessions._complete, {
        sessionId: existingActive._id,
      });
    }

    // Create new session using internal mutation
    const sessionId = await ctx.runMutation(internal.sessions._create, {
      userId: identity.tokenIdentifier,
      storyId: story.storyId,
      traits: {
        risk_tolerance: 50,
        empathy: 50,
        loyalty: 50,
        creativity: 50,
        decisiveness: 50,
      },
    });

    // Generate opening
    await ctx.runAction(api.agent.generateOpening, { sessionId });

    return {
      sessionId,
      storyId: story.storyId,
      title: story.title,
    };
  },
});

// Internal mutation to insert a story
export const _insert = mutation({
  args: {
    title: v.string(),
    context: v.string(),
    prompt: v.string(),
    primaryTrait: v.string(),
    secondaryTraits: v.array(v.string()),
    traitCategory: v.string(),
    maxTurns: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<Id<"stories">> => {
    return await ctx.db.insert("stories", args);
  },
});

// List all stories
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("stories").collect();
  },
});

// Get story by ID
export const getById = query({
  args: { id: v.id("stories") },
  handler: async (ctx, args) => {
    return await ctx.db.get("stories", args.id);
  },
});

// Get user's story history (stories they've played)
export const getUserStoryHistory = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", identity.tokenIdentifier))
      .collect();

    const stories = await Promise.all(
      sessions.map(async (session) => {
        const story = await ctx.db.get("stories", session.storyId);
        return story
          ? { ...story, sessionStatus: session.status, sessionId: session._id }
          : null;
      }),
    );

    return stories.filter((s): s is NonNullable<typeof s> => s !== null);
  },
});

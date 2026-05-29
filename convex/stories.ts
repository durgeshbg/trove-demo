import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { GoogleGenAI } from "@google/genai";
import { Id } from "./_generated/dataModel";

const ai = new GoogleGenAI({ apiKey: process.env.AI_API_KEY });

// Create a new story from a user prompt
export const createFromPrompt = mutation({
  args: {
    prompt: v.string(),
    vibe: v.optional(v.string()),
    mood: v.optional(v.string()),
    maxTurns: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const vibe = args.vibe ?? "adventure";
    const mood = args.mood ?? "neutral";
    const maxTurns = args.maxTurns ?? 5;

    // Extract a title from the prompt
    const title = args.prompt
      .split(".")[0]
      .slice(0, 50)
      .replace(/^\w/, (c) => c.toUpperCase());

    const storyId: Id<"stories"> = await ctx.db.insert("stories", {
      title,
      vibe,
      mood,
      context: args.prompt,
      prompt: args.prompt,
      maxTurns,
    });

    return storyId;
  },
});

// Generate a complete story using AI
export const generateStory = action({
  args: {
    theme: v.string(),
    vibe: v.optional(v.string()),
    mood: v.optional(v.string()),
    maxTurns: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{
    storyId: Id<"stories">;
    title: string;
    context: string;
    prompt: string;
  }> => {
    const vibe = args.vibe ?? "moral dilemma";
    const mood = args.mood ?? "tense";
    const maxTurns = args.maxTurns ?? 5;

    try {
      const systemPrompt = `You are a creative writer for Trove, a behavioral identity game. 
Create immersive story scenarios that test player personality traits.
Always respond with valid JSON only.`;

      const userPrompt = `Create a story based on this theme: "${args.theme}"

Vibe: ${vibe}
Mood: ${mood}

Generate:
1. A compelling title (max 50 characters)
2. A rich context/setting description (2-3 sentences)
3. A detailed prompt for the AI to generate scenarios (1-2 sentences about the core conflict and setting)

Return JSON:
{
  "title": "string",
  "context": "string",
  "prompt": "string"
}`;

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash-exp",
        contents: [
          { role: "system", parts: [{ text: systemPrompt }] },
          { role: "user", parts: [{ text: userPrompt }] },
        ],
        config: {
          temperature: 0.8,
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

      const storyId: Id<"stories"> = await ctx.runMutation(api.stories._insert, {
        title: result.title,
        vibe,
        mood,
        context: result.context,
        prompt: result.prompt,
        maxTurns,
      });

      return { storyId, ...result };
    } catch (err) {
      console.error("Story generation failed:", err);
      throw new Error("Failed to generate story");
    }
  },
});

// Internal mutation to insert a story
export const _insert = mutation({
  args: {
    title: v.string(),
    vibe: v.string(),
    mood: v.string(),
    context: v.string(),
    prompt: v.string(),
    maxTurns: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<Id<"stories">> => {
    return await ctx.db.insert("stories", args);
  },
});

// Seed some default stories (now AI-generated templates)
export const seedStories = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("stories").take(1);
    if (existing.length > 0) return;

    // Create template stories that will have dynamic content
    await ctx.db.insert("stories", {
      title: "The Heist",
      vibe: "moral dilemma",
      mood: "tense",
      context:
        "A high-stakes casino vault heist in Monaco. You're part of an elite crew. The plan was perfect — until the guard rotation changed unexpectedly. Diamonds worth millions sit in front of you. Your partner Marco is watching the corridor. Time is running out.",
      prompt:
        "The player is a skilled thief in the middle of a casino heist. They must make quick decisions about trust, risk, and morality while trying to escape with their prize. Each decision tests their character under pressure.",
      maxTurns: 5,
    });

    await ctx.db.insert("stories", {
      title: "The Stranded Ship",
      vibe: "test loyalty",
      mood: "desperate",
      context:
        "A research vessel has sunk in Antarctic waters. 8 survivors, 6 life jackets, limited supplies. You're the second-in-command. The captain is missing. The radio is dead. Temperatures are dropping. Every decision could mean life or death.",
      prompt:
        "The player is second-in-command of a sunk research vessel in Antarctica. They must lead survivors to safety while making impossible choices about resources, loyalty, and sacrifice. The harsh environment reveals true character.",
      maxTurns: 5,
    });

    await ctx.db.insert("stories", {
      title: "The Corporate Ladder",
      vibe: "ambition vs integrity",
      mood: "calculated",
      context:
        "You're a rising executive at a tech giant. A major acquisition is underway, and you've discovered irregularities in the due diligence. Your mentor wants you to look the other way. Your rival wants to expose everything. Your promotion depends on what you do next.",
      prompt:
        "The player is a rising executive discovering ethical issues in a major corporate deal. They must navigate office politics, loyalty to mentors, and their own conscience while climbing the corporate ladder.",
      maxTurns: 5,
    });
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

"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { GoogleGenAI } from "@google/genai";
import { type Doc } from "./_generated/dataModel";

// Initialize Google GenAI client
const ai = new GoogleGenAI({ apiKey: process.env.AI_API_KEY });

// Type for the decision result
interface DecisionResult {
  message: string;
  trait_deltas: Record<string, number>;
  options?: string[];
  isEnding?: boolean;
  endingMessage?: string;
}

export const processDecision = action({
  args: {
    sessionId: v.id("sessions"),
    input: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    message: string;
    trait_deltas: Record<string, number>;
    options?: string[];
    isEnding: boolean;
  }> => {
    const session: Doc<"sessions"> | null = await ctx.runQuery(
      api.sessions.getById,
      {
        id: args.sessionId,
      },
    );
    if (!session) throw new Error("Session not found");

    const story: Doc<"stories"> | null = await ctx.runQuery(
      api.stories.getById,
      {
        id: session.storyId,
      },
    );
    if (!story) throw new Error("Story not found");

    const maxTurns: number = story.maxTurns ?? 5;
    // Handle legacy data: use currentNodeIndex if turnCount is not set
    const currentTurnCount: number =
      session.turnCount ?? session.currentNodeIndex ?? 0;
    const isLastTurn: boolean = currentTurnCount >= maxTurns - 1;

    const traitsText: string = Object.entries(session.traits)
      .map(([k, v]) => `- ${k}: ${v}`)
      .join("\n");

    // Build conversation history for context
    const conversationHistory: string = session.messages
      .map(
        (m: { role: string; text: string }) =>
          `${m.role === "narrator" ? "Narrator" : "Player"}: ${m.text}`,
      )
      .join("\n\n");

    let result: DecisionResult;

    try {
      const systemPrompt = `You are a narrative AI for Trove, a behavioral identity game. 

STORY CONTEXT:
Title: ${story.title}
Vibe: ${story.vibe}
Mood: ${story.mood}
Setting: ${story.context}

Player's current traits (0-100):
${traitsText}

Current turn: ${currentTurnCount + 1} of ${maxTurns}

Always respond with valid JSON only. No markdown, no extra text.`;

      const userPrompt = isLastTurn
        ? `CONVERSATION HISTORY:
${conversationHistory}

The player just chose: "${args.input}"

This is the FINAL decision point. Generate:
1. A narrative conclusion (2-4 sentences, immersive second-person present tense) describing the consequence of their final choice
2. A reflective ending message that summarizes their journey
3. Analyze their choice and update trait scores by -5 to +5 for: risk_tolerance, empathy, loyalty, creativity, decisiveness
4. Set isEnding to true

Return JSON:
{
  "message": "string (narrative conclusion)",
  "endingMessage": "string (reflective ending)",
  "trait_deltas": {
    "risk_tolerance": number,
    "empathy": number,
    "loyalty": number,
    "creativity": number,
    "decisiveness": number
  },
  "isEnding": true
}`
        : `CONVERSATION HISTORY:
${conversationHistory}

The player just chose: "${args.input}"

Generate the next narrative beat and decision point:

1. Write 2-4 sentences (immersive second-person present tense) describing the immediate consequence of their choice and the new situation they face

2. Generate 2-3 compelling decision options that:
   - Fit the story's vibe (${story.vibe}) and mood (${story.mood})
   - Reflect different approaches to the situation
   - Would meaningfully test different personality traits

3. Analyze their choice and update trait scores by -5 to +5 for: risk_tolerance, empathy, loyalty, creativity, decisiveness

Return JSON:
{
  "message": "string (narrative consequence + new situation)",
  "options": ["option 1", "option 2", "option 3"],
  "trait_deltas": {
    "risk_tolerance": number,
    "empathy": number,
    "loyalty": number,
    "creativity": number,
    "decisiveness": number
  },
  "isEnding": false
}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
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

      result = JSON.parse(text) as DecisionResult;
    } catch (err) {
      console.error("LLM call failed, using fallback:", err);

      // Graceful fallback
      if (isLastTurn) {
        result = {
          message: `The story reaches its conclusion. Your choices have shaped who you've become.`,
          endingMessage: `Your journey through ${story.title} has revealed your true character. The traits you've demonstrated will stay with you.`,
          trait_deltas: {
            risk_tolerance: 0,
            empathy: 0,
            loyalty: 0,
            creativity: 0,
            decisiveness: 0,
          },
          isEnding: true,
        };
      } else {
        result = {
          message: `Your choice resonates through the narrative. The situation evolves before you, presenting new possibilities.`,
          options: [
            "Take the bold, risky path forward",
            "Choose the careful, measured approach",
            "Find an unexpected third way",
          ],
          trait_deltas: {
            risk_tolerance: 0,
            empathy: 0,
            loyalty: 0,
            creativity: 0,
            decisiveness: 0,
          },
          isEnding: false,
        };
      }
    }

    // Validate and clamp trait deltas
    const validTraitDeltas: Record<string, number> = {};
    const defaultTraits = [
      "risk_tolerance",
      "empathy",
      "loyalty",
      "creativity",
      "decisiveness",
    ];
    for (const trait of defaultTraits) {
      const delta = result.trait_deltas?.[trait];
      validTraitDeltas[trait] = typeof delta === "number" ? delta : 0;
    }

    // Compute updated traits
    const updatedTraits = { ...session.traits };
    for (const [key, delta] of Object.entries(validTraitDeltas)) {
      const current = updatedTraits[key as keyof typeof updatedTraits] ?? 50;
      updatedTraits[key as keyof typeof updatedTraits] = Math.max(
        0,
        Math.min(100, current + delta),
      );
    }

    // Build new messages
    const newMessages = [
      ...session.messages,
      { role: "user" as const, text: args.input, timestamp: Date.now() },
      {
        role: "narrator" as const,
        text: result.message,
        timestamp: Date.now(),
      },
    ];

    const newTurnCount = currentTurnCount + 1;
    let newStatus: "active" | "completed" = session.status;
    let newScenario: string | undefined = result.message;
    let newOptions: string[] | undefined = result.options;

    // If ending, add ending message and mark complete
    if (isLastTurn || result.isEnding) {
      const endingMsg =
        result.endingMessage ||
        `Your journey through ${story.title} has reached its conclusion.`;
      newMessages.push({
        role: "narrator" as const,
        text: endingMsg,
        timestamp: Date.now(),
      });
      newStatus = "completed";
      newScenario = undefined;
      newOptions = undefined;
    }

    await ctx.runMutation(internal.sessions._update, {
      sessionId: args.sessionId,
      updates: {
        turnCount: newTurnCount,
        traits: updatedTraits,
        status: newStatus,
        messages: newMessages,
        currentScenario: newScenario,
        currentOptions: newOptions,
      },
    });

    await ctx.runMutation(internal.decisions._create, {
      sessionId: args.sessionId,
      turnIndex: currentTurnCount,
      input: args.input,
      traitDeltas: validTraitDeltas as {
        risk_tolerance: number;
        empathy: number;
        loyalty: number;
        creativity: number;
        decisiveness: number;
      },
    });

    return {
      message: result.message,
      trait_deltas: validTraitDeltas,
      options: result.options,
      isEnding: isLastTurn || (result.isEnding ?? false),
    };
  },
});

// Generate the opening scenario for a new session
export const generateOpening = action({
  args: {
    sessionId: v.id("sessions"),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    openingMessage: string;
    options: string[];
  }> => {
    const session: Doc<"sessions"> | null = await ctx.runQuery(
      api.sessions.getById,
      {
        id: args.sessionId,
      },
    );
    if (!session) throw new Error("Session not found");

    const story: Doc<"stories"> | null = await ctx.runQuery(
      api.stories.getById,
      {
        id: session.storyId,
      },
    );
    if (!story) throw new Error("Story not found");

    const maxTurns: number = story.maxTurns ?? 5;

    let result: {
      openingMessage: string;
      options: string[];
    };

    try {
      const systemPrompt = `You are a narrative AI for Trove, a behavioral identity game.

STORY CONTEXT:
Title: ${story.title}
Vibe: ${story.vibe}
Mood: ${story.mood}
Setting: ${story.context}

The player starts with all traits at 50 (neutral).
This is turn 1 of ${maxTurns}.

Generate an immersive opening scenario and initial decision options.
Always respond with valid JSON only.`;

      const userPrompt = `Generate the opening scenario for this story:

Story Prompt: ${story.prompt}

Create:
1. An engaging opening message (3-5 sentences, immersive second-person present tense) that sets the scene and presents the initial situation
2. 2-3 compelling decision options that represent different approaches to the situation

Return JSON:
{
  "openingMessage": "string",
  "options": ["option 1", "option 2", "option 3"]
}`;

      const response = await ai.models.generateContent({
        model: process.env.AI_MODEL_NAME || "gemini-3.1-flash-lite",
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

      result = JSON.parse(text) as {
        openingMessage: string;
        options: string[];
      };
    } catch (err) {
      console.error("LLM call failed for opening, using fallback:", err);

      result = {
        openingMessage: `You find yourself at the beginning of ${story.title}. The atmosphere is ${story.mood}. ${story.context}`,
        options: [
          "Approach with caution and observe",
          "Act boldly and take the initiative",
          "Look for an unexpected angle",
        ],
      };
    }

    const messages = [
      {
        role: "narrator" as const,
        text: result.openingMessage,
        timestamp: Date.now(),
      },
    ];

    await ctx.runMutation(internal.sessions._update, {
      sessionId: args.sessionId,
      updates: {
        messages,
        currentScenario: result.openingMessage,
        currentOptions: result.options,
      },
    });

    return {
      openingMessage: result.openingMessage,
      options: result.options,
    };
  },
});

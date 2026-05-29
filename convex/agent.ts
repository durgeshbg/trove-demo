"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { GoogleGenAI } from "@google/genai";
import { type Doc } from "./_generated/dataModel";
import { traitDescriptions } from "./traitCategories";

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

    // Handle legacy stories without primaryTrait
    const primaryTrait = story.primaryTrait ?? "character";
    const secondaryTraits = story.secondaryTraits ?? [];

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
Primary Trait Being Tested: ${primaryTrait} - ${traitDescriptions[primaryTrait as keyof typeof traitDescriptions] || ""}
${secondaryTraits.length > 0 ? `Secondary Traits: ${secondaryTraits.join(", ")}` : ""}
Setting: ${story.context}

Player's current traits (0-100):
${traitsText}

Current turn: ${currentTurnCount + 1} of ${maxTurns}

CRITICAL INSTRUCTION: This story is specifically designed to test the player's **${primaryTrait}**. Every scenario should present meaningful dilemmas where ${primaryTrait} is the key differentiator between choices.

Always respond with valid JSON only. No markdown, no extra text.`;

      const userPrompt = isLastTurn
        ? `CONVERSATION HISTORY:
${conversationHistory}

The player just chose: "${args.input}"

This is the FINAL decision point. Generate:
1. A narrative conclusion (2-4 sentences, immersive second-person present tense) describing the consequence of their final choice
2. A reflective ending message that summarizes their journey and specifically acknowledges their demonstrated ${primaryTrait}
3. Analyze their choice and update trait scores by -5 to +5 for: risk_tolerance, empathy, loyalty, creativity, decisiveness
   - Focus on ${primaryTrait}: award +3 to +5 if their choice showed high ${primaryTrait}, -3 to -5 if it showed low ${primaryTrait}
   - ${secondaryTraits.length > 0 ? `Also consider ${secondaryTraits.join(" and ")} in your scoring` : ""}
4. Set isEnding to true

Return JSON:
{
  "message": "string (narrative conclusion)",
  "endingMessage": "string (reflective ending that mentions their ${primaryTrait})",
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
   - Specifically test the player's ${primaryTrait}
   - Represent different levels of ${primaryTrait} (e.g., one choice showing high ${primaryTrait}, one showing low, one moderate)
   - Are meaningful and consequential, not superficial

3. Analyze their choice and update trait scores by -5 to +5 for: risk_tolerance, empathy, loyalty, creativity, decisiveness
   - Focus on ${primaryTrait}: award +3 to +5 if their choice showed high ${primaryTrait}, -3 to -5 if it showed low ${primaryTrait}
   - ${secondaryTraits.length > 0 ? `Also consider ${secondaryTraits.join(" and ")} in your scoring` : ""}

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
          message: `The story reaches its conclusion. Your choices have shaped who you've become, especially revealing your ${primaryTrait}.`,
          endingMessage: `Your journey through ${story.title} has revealed your true character. Your ${primaryTrait} has been tested and measured.`,
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
          message: `Your choice resonates through the narrative. The situation evolves before you, presenting new possibilities that test your ${primaryTrait}.`,
          options: [
            `Demonstrate high ${primaryTrait} in your approach`,
            `Show restraint and lower ${primaryTrait}`,
            "Find a balanced middle path",
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
        `Your journey through ${story.title} has reached its conclusion. Your ${primaryTrait} has been revealed.`;
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

    // Handle legacy stories without primaryTrait
    const primaryTrait = story.primaryTrait ?? "character";
    const secondaryTraits = story.secondaryTraits ?? [];

    let result: {
      openingMessage: string;
      options: string[];
    };

    try {
      const systemPrompt = `You are a narrative AI for Trove, a behavioral identity game.

STORY CONTEXT:
Title: ${story.title}
Primary Trait Being Tested: ${primaryTrait} - ${traitDescriptions[primaryTrait as keyof typeof traitDescriptions] || ""}
${secondaryTraits.length > 0 ? `Secondary Traits: ${secondaryTraits.join(", ")}` : ""}
Setting: ${story.context}

Player starts with neutral traits (all at 50).
This is turn 1 of ${maxTurns}.

CRITICAL: This story is specifically designed to test ${primaryTrait}. The opening scenario must immediately establish a situation where ${primaryTrait} will be tested.

Generate an immersive opening scenario and initial decision options.
Always respond with valid JSON only.`;

      const userPrompt = `Generate the opening scenario for this story:

Story Prompt: ${story.prompt ?? story.context}

This story tests the player's **${primaryTrait}**${secondaryTraits.length > 0 ? ` with **${secondaryTraits.join(" and ")}** as secondary focuses` : ""}.

Create:
1. An engaging opening message (3-5 sentences, immersive second-person present tense) that:
   - Immediately immerses the player in the world
   - Establishes the stakes and tension
   - Presents a situation where their ${primaryTrait} will be immediately relevant

2. 2-3 compelling decision options that:
   - Represent different approaches to the initial situation
   - Specifically test different levels of ${primaryTrait}
   - Feel consequential and meaningful

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
        openingMessage: `You find yourself at the threshold of ${story.title}. The atmosphere is charged with possibility. ${story.context} Your ${primaryTrait} will be your guide through what comes next.`,
        options: [
          `Approach with high ${primaryTrait}, embracing the challenge`,
          `Exercise caution and restraint in your ${primaryTrait}`,
          "Take a moment to assess before committing",
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

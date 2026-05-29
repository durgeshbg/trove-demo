export const traitNames = [
  "risk_tolerance",
  "empathy",
  "loyalty",
  "creativity",
  "decisiveness",
] as const;

export type TraitName = (typeof traitNames)[number];

export const traitLabels: Record<TraitName, string> = {
  risk_tolerance: "Risk Tolerance",
  empathy: "Empathy",
  loyalty: "Loyalty",
  creativity: "Creativity",
  decisiveness: "Decisiveness",
};

export const defaultTraits: Record<TraitName, number> = {
  risk_tolerance: 50,
  empathy: 50,
  loyalty: 50,
  creativity: 50,
  decisiveness: 50,
};

export function clampTrait(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export function computeTraitSummary(traits: Record<TraitName, number>): string {
  const entries = Object.entries(traits) as [TraitName, number][];
  const sorted = [...entries].sort((a, b) => b[1] - a[1]);
  const top = sorted[0];
  const bottom = sorted[sorted.length - 1];

  const descriptions: Record<TraitName, string> = {
    risk_tolerance: top[1] > 70
      ? "You thrive in uncertainty and aren't afraid to stake everything on a bold move."
      : top[1] < 40
        ? "You prefer calculated safety, measuring every step before you take it."
        : "You balance caution with courage, knowing when to leap and when to wait.",
    empathy: "You feel the weight of others' emotions deeply, often putting their needs before your own.",
    loyalty: "Your bonds run deep. Once committed, you stand by people through anything.",
    creativity: "You see possibilities where others see dead ends. Your mind is a canvas of unconventional solutions.",
    decisiveness: "You trust your gut and act swiftly. Indecision is not in your vocabulary.",
  };

  const lowDescriptions: Record<TraitName, string> = {
    risk_tolerance: "You favor caution and careful planning over impulsive action.",
    empathy: "You prioritize logic and outcomes over emotional considerations.",
    loyalty: "You value independence and self-preservation above group allegiance.",
    creativity: "You prefer proven methods over untested ideas.",
    decisiveness: "You take time to weigh all options before committing to a path.",
  };

  let summary = "";
  if (top[1] >= 65) {
    summary += `Your defining trait is **${traitLabels[top[0]]}**. ${descriptions[top[0]]}\n\n`;
  }
  if (bottom[1] <= 40) {
    summary += `At the other end, your lower **${traitLabels[bottom[0]]}** suggests: ${lowDescriptions[bottom[0]]}`;
  }

  if (!summary) {
    summary = "You're remarkably balanced across all dimensions. You adapt your approach to fit the situation, showing no single dominant trait — which is a strength in itself.";
  }

  return summary;
}

import type { TraitName } from "./schema";

export type { TraitName };

export interface TraitCategory {
  id: string;
  name: string;
  description: string;
  primaryTraits: TraitName[];
  theme: string;
}

export const traitCategories: TraitCategory[] = [
  {
    id: "social-skills",
    name: "Social Skills",
    description: "Navigate complex relationships and emotional landscapes. Test how you balance empathy with loyalty in interpersonal dynamics.",
    primaryTraits: ["empathy", "loyalty"],
    theme: "Stories focusing on human connection, trust, and emotional intelligence",
  },
  {
    id: "decision-making",
    name: "Decision Making",
    description: "Face high-stakes choices under pressure. Discover how you weigh risks against rewards when the clock is ticking.",
    primaryTraits: ["decisiveness", "risk_tolerance"],
    theme: "Stories about quick thinking, calculated risks, and decisive action",
  },
  {
    id: "creative-problem-solving",
    name: "Creative Problem Solving",
    description: "Encounter unconventional challenges that demand outside-the-box thinking. See how you blend innovation with courage.",
    primaryTraits: ["creativity", "risk_tolerance"],
    theme: "Stories featuring unique obstacles and novel solutions",
  },
  {
    id: "leadership",
    name: "Leadership",
    description: "Step into roles of responsibility and influence. Explore how you balance authority with compassion when others depend on you.",
    primaryTraits: ["decisiveness", "empathy", "loyalty"],
    theme: "Stories about guiding others, making tough calls, and earning trust",
  },
  {
    id: "personal-integrity",
    name: "Personal Integrity",
    description: "Confront moral dilemmas and ethical crossroads. Discover what you stand for when principles are tested against convenience.",
    primaryTraits: ["loyalty", "empathy"],
    theme: "Stories exploring ethics, commitment, and moral character",
  },
  {
    id: "adaptability",
    name: "Adaptability",
    description: "Navigate unexpected situations that require flexibility and innovation. See how you pivot when plans fall apart.",
    primaryTraits: ["creativity", "decisiveness"],
    theme: "Stories of improvisation, quick adaptation, and resourcefulness",
  },
];

export const traitLabels: Record<TraitName, string> = {
  risk_tolerance: "Risk Tolerance",
  empathy: "Empathy",
  loyalty: "Loyalty",
  creativity: "Creativity",
  decisiveness: "Decisiveness",
};

export const traitDescriptions: Record<TraitName, string> = {
  risk_tolerance: "Your comfort with uncertainty and willingness to take bold chances",
  empathy: "Your ability to understand and share the feelings of others",
  loyalty: "Your commitment to people, principles, and relationships under pressure",
  creativity: "Your capacity for unconventional thinking and novel solutions",
  decisiveness: "Your ability to act swiftly and confidently when choices matter",
};

export function getCategoryById(id: string): TraitCategory | undefined {
  return traitCategories.find((cat) => cat.id === id);
}

export function getRandomTraitsForCategory(categoryId: string): {
  primary: TraitName;
  secondary: TraitName | null;
} {
  const category = getCategoryById(categoryId);
  if (!category) {
    return { primary: "empathy", secondary: null };
  }

  const traits = category.primaryTraits;
  const primary = traits[Math.floor(Math.random() * traits.length)];
  
  // Pick a different trait as secondary if available
  const remainingTraits = traits.filter((t) => t !== primary);
  const secondary = remainingTraits.length > 0
    ? remainingTraits[Math.floor(Math.random() * remainingTraits.length)]
    : null;

  return { primary, secondary };
}

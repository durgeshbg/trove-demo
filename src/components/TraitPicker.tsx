import { useState } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { motion, AnimatePresence } from "framer-motion";
import type { Id } from "../../convex/_generated/dataModel";
import { 
  ArrowRight, 
  Brain, 
  Users, 
  Target, 
  Zap, 
  Shield, 
  Compass,
  ChevronLeft,
  Sparkle,
  Loader2
} from "lucide-react";
import { traitCategories, traitLabels } from "../../convex/traitCategories";
import type { TraitName } from "../../convex/schema";

interface TraitPickerProps {
  onStart: (sessionId: Id<"sessions">) => void;
}

const categoryIcons: Record<string, React.ReactNode> = {
  "social-skills": <Users className="w-6 h-6" />,
  "decision-making": <Target className="w-6 h-6" />,
  "creative-problem-solving": <Sparkle className="w-6 h-6" />,
  "leadership": <Shield className="w-6 h-6" />,
  "personal-integrity": <Compass className="w-6 h-6" />,
  "adaptability": <Zap className="w-6 h-6" />,
};

const categoryGradients: Record<string, string> = {
  "social-skills": "from-rose-500/20 via-pink-500/10 to-purple-500/20",
  "decision-making": "from-amber-500/20 via-orange-500/10 to-red-500/20",
  "creative-problem-solving": "from-cyan-500/20 via-blue-500/10 to-indigo-500/20",
  "leadership": "from-emerald-500/20 via-teal-500/10 to-green-500/20",
  "personal-integrity": "from-violet-500/20 via-purple-500/10 to-fuchsia-500/20",
  "adaptability": "from-sky-500/20 via-cyan-500/10 to-teal-500/20",
};

const categoryAccentColors: Record<string, string> = {
  "social-skills": "text-rose-400",
  "decision-making": "text-amber-400",
  "creative-problem-solving": "text-cyan-400",
  "leadership": "text-emerald-400",
  "personal-integrity": "text-violet-400",
  "adaptability": "text-sky-400",
};

type Step = "categories" | "traits" | "generating";

export function TraitPicker({ onStart }: TraitPickerProps) {
  const [step, setStep] = useState<Step>("categories");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedPrimaryTrait, setSelectedPrimaryTrait] = useState<TraitName | null>(null);
  const [selectedSecondaryTrait, setSelectedSecondaryTrait] = useState<TraitName | null>(null);
  const [generatedStory, setGeneratedStory] = useState<{ title: string } | null>(null);
  
  const startStoryFromTrait = useAction(api.stories.startStoryFromTrait);
  const storyHistory = useQuery(api.stories.getUserStoryHistory);

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setStep("traits");
  };

  const handleBack = () => {
    if (step === "traits") {
      setStep("categories");
      setSelectedCategory(null);
      setSelectedPrimaryTrait(null);
      setSelectedSecondaryTrait(null);
    }
  };

  const handleTraitSelect = async (primaryTrait: TraitName) => {
    setSelectedPrimaryTrait(primaryTrait);
    
    // If no secondary trait selected, proceed without one
    const category = traitCategories.find(c => c.id === selectedCategory);
    if (!category) return;

    setStep("generating");

    try {
      const result = await startStoryFromTrait({
        categoryId: selectedCategory!,
        primaryTrait,
        secondaryTrait: selectedSecondaryTrait || undefined,
      });

      setGeneratedStory({ title: result.title });
      
      // Brief delay to show the generated title before transitioning
      setTimeout(() => {
        onStart(result.sessionId);
      }, 1500);
    } catch (err) {
      console.error("Failed to start story:", err);
      setStep("traits");
    }
  };

  const category = selectedCategory ? traitCategories.find(c => c.id === selectedCategory) : null;
  const availableTraits = category?.primaryTraits || [];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-10"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 mb-6">
          <Brain className="w-8 h-8 text-accent" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-semibold text-text-primary mb-3 tracking-tight">
          Trove
        </h1>
        <p className="text-text-secondary text-base max-w-md mx-auto leading-relaxed">
          {step === "categories" 
            ? "Choose a dimension of yourself to explore. The AI will craft a unique story to test your character."
            : step === "traits"
            ? "Select the primary trait you want to test. Your choices will reveal who you truly are."
            : "The story weaver is crafting your personalized challenge..."
          }
        </p>
      </motion.div>

      <AnimatePresence mode="wait">
        {/* Categories Step */}
        {step === "categories" && (
          <motion.div
            key="categories"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-3xl"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {traitCategories.map((cat, index) => (
                <motion.button
                  key={cat.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: index * 0.08 }}
                  onClick={() => handleCategorySelect(cat.id)}
                  className={`group relative overflow-hidden bg-bg-secondary border border-border rounded-2xl p-6 hover:border-accent/40 transition-all duration-300 text-left`}
                >
                  {/* Background gradient on hover */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${categoryGradients[cat.id]} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                  
                  <div className="relative z-10">
                    <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-bg-elevated mb-4 group-hover:scale-110 transition-transform duration-300 ${categoryAccentColors[cat.id]}`}>
                      {categoryIcons[cat.id]}
                    </div>
                    
                    <h3 className="font-semibold text-text-primary text-lg mb-2 group-hover:text-accent transition-colors">
                      {cat.name}
                    </h3>
                    
                    <p className="text-text-secondary text-sm leading-relaxed mb-3">
                      {cat.description}
                    </p>
                    
                    <div className="flex flex-wrap gap-2">
                      {cat.primaryTraits.map(trait => (
                        <span 
                          key={trait}
                          className="text-[11px] px-2 py-1 rounded-full bg-bg-elevated text-text-muted"
                        >
                          {traitLabels[trait]}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight className="w-5 h-5 text-accent" />
                  </div>
                </motion.button>
              ))}
            </div>

            {/* Story History */}
            {storyHistory && storyHistory.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-12 text-center"
              >
                <p className="text-text-muted text-sm mb-3">
                  Your previous adventures
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {storyHistory.slice(0, 5).map((story) => (
                    <span
                      key={story._id}
                      className="text-xs px-3 py-1.5 rounded-full bg-bg-secondary border border-border text-text-secondary"
                    >
                      {story.title}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Traits Step */}
        {step === "traits" && category && (
          <motion.div
            key="traits"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-2xl"
          >
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-text-muted hover:text-text-primary mb-6 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="text-sm">Back to categories</span>
            </button>

            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${categoryGradients[category.id]} border border-border mb-6`}>
              {categoryIcons[category.id]}
              <span className={`text-sm font-medium ${categoryAccentColors[category.id]}`}>
                {category.name}
              </span>
            </div>

            <h2 className="text-2xl font-semibold text-text-primary mb-2">
              Choose your primary trait
            </h2>
            <p className="text-text-secondary mb-8">
              This will be the main focus of your personalized story.
            </p>

            {/* Secondary trait selector (optional) */}
            <div className="mb-8">
              <p className="text-sm text-text-muted mb-3">
                Optional: Add a secondary trait for a more nuanced experience
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedSecondaryTrait(null)}
                  className={`px-4 py-2 rounded-full text-sm transition-all ${
                    selectedSecondaryTrait === null
                      ? "bg-accent text-white"
                      : "bg-bg-secondary border border-border text-text-secondary hover:border-accent/40"
                  }`}
                >
                  None
                </button>
                {category.primaryTraits.map(trait => (
                  <button
                    key={trait}
                    onClick={() => setSelectedSecondaryTrait(trait)}
                    disabled={trait === selectedPrimaryTrait}
                    className={`px-4 py-2 rounded-full text-sm transition-all ${
                      selectedSecondaryTrait === trait
                        ? "bg-accent text-white"
                        : trait === selectedPrimaryTrait
                        ? "bg-bg-tertiary text-text-muted cursor-not-allowed"
                        : "bg-bg-secondary border border-border text-text-secondary hover:border-accent/40"
                    }`}
                  >
                    {traitLabels[trait]}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {availableTraits.map((trait, index) => (
                <motion.button
                  key={trait}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  onClick={() => handleTraitSelect(trait)}
                  className="w-full group relative bg-bg-secondary border border-border rounded-xl p-5 hover:border-accent/40 hover:bg-bg-tertiary transition-all duration-200 text-left"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-medium text-text-primary text-lg mb-1 group-hover:text-accent transition-colors">
                        {traitLabels[trait]}
                      </h3>
                      <p className="text-text-secondary text-sm">
                        Test your {trait.replace("_", " ")} through challenging scenarios
                      </p>
                    </div>
                    <div className="shrink-0">
                      <div className="w-10 h-10 rounded-full bg-bg-elevated flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                        <ArrowRight className="w-5 h-5 text-text-muted group-hover:text-accent transition-colors" />
                      </div>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Generating Step */}
        {step === "generating" && (
          <motion.div
            key="generating"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-lg text-center"
          >
            <div className="relative mb-8">
              {/* Animated rings */}
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-accent/20"
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div
                className="absolute inset-2 rounded-full border-2 border-accent/30"
                animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
              />
              <motion.div
                className="absolute inset-4 rounded-full border-2 border-accent/40"
                animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
              />
              
              <div className="relative w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-accent animate-spin" />
              </div>
            </div>

            <motion.h3
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl font-semibold text-text-primary mb-3"
            >
              The story weaver is at work...
            </motion.h3>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-text-secondary mb-6"
            >
              Crafting a unique narrative to test your <span className="text-accent font-medium">{selectedPrimaryTrait ? traitLabels[selectedPrimaryTrait] : ""}</span>
              {selectedSecondaryTrait && (
                <span> with <span className="text-accent font-medium">{traitLabels[selectedSecondaryTrait]}</span> as a secondary focus</span>
              )}
            </motion.p>

            <AnimatePresence>
              {generatedStory && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-bg-secondary border border-accent/30 rounded-xl p-6"
                >
                  <p className="text-text-muted text-sm mb-2">Your story awaits:</p>
                  <h4 className="text-2xl font-bold text-accent">{generatedStory.title}</h4>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Decorative text */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="mt-8 text-text-muted text-sm italic"
            >
              "Every choice reveals a piece of your character..."
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

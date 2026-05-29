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
  "social-skills": "text-accent",
  "decision-making": "text-accent",
  "creative-problem-solving": "text-accent",
  "leadership": "text-accent",
  "personal-integrity": "text-accent",
  "adaptability": "text-accent",
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
    <div className="h-full flex flex-col items-center justify-center px-4 py-8 overflow-y-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-6"
      >
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 mb-4">
          <Brain className="w-6 h-6 text-accent" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-text-primary mb-2 tracking-tight">
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
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {traitCategories.map((cat, index) => (
                <motion.button
                  key={cat.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  onClick={() => handleCategorySelect(cat.id)}
                  className={`group relative overflow-hidden bg-bg-secondary border border-border rounded-xl p-4 hover:border-accent/40 transition-all duration-300 text-left`}
                >
                  {/* Background gradient on hover */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${categoryGradients[cat.id]} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                  
                  <div className="relative z-10">
                    <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg bg-bg-elevated mb-3 group-hover:scale-110 transition-transform duration-300 ${categoryAccentColors[cat.id]}`}>
                      {categoryIcons[cat.id]}
                    </div>
                    
                    <h3 className="font-semibold text-text-primary text-base mb-1.5 group-hover:text-accent transition-colors">
                      {cat.name}
                    </h3>
                    
                    <p className="text-text-secondary text-xs leading-relaxed mb-2 line-clamp-2">
                      {cat.description}
                    </p>
                    
                    <div className="flex flex-wrap gap-1">
                      {cat.primaryTraits.slice(0, 2).map(trait => (
                        <span 
                          key={trait}
                          className="text-[10px] px-1.5 py-0.5 rounded-full bg-bg-elevated text-text-muted"
                        >
                          {traitLabels[trait]}
                        </span>
                      ))}
                      {cat.primaryTraits.length > 2 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-bg-elevated text-text-muted">
                          +{cat.primaryTraits.length - 2}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight className="w-4 h-4 text-accent" />
                  </div>
                </motion.button>
              ))}
            </div>

            {/* Story History */}
            {storyHistory && storyHistory.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mt-8 text-center"
              >
                <p className="text-text-muted text-xs mb-2">
                  Your previous adventures
                </p>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {storyHistory.slice(0, 5).map((story) => (
                    <span
                      key={story._id}
                      className="text-[10px] px-2.5 py-1 rounded-full bg-bg-secondary border border-border text-text-secondary"
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

            <h2 className="text-xl font-semibold text-text-primary mb-2">
              Choose your primary trait
            </h2>
            <p className="text-text-secondary text-sm mb-6">
              This will be the main focus of your personalized story.
            </p>

            {/* Secondary trait selector (optional) */}
            <div className="mb-6">
              <p className="text-xs text-text-muted mb-2">
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

            <div className="space-y-2">
              {availableTraits.map((trait, index) => (
                <motion.button
                  key={trait}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: index * 0.08 }}
                  onClick={() => handleTraitSelect(trait)}
                  className="w-full group relative bg-bg-secondary border border-border rounded-lg p-4 hover:border-accent/40 hover:bg-bg-tertiary transition-all duration-200 text-left"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <h3 className="font-medium text-text-primary text-base group-hover:text-accent transition-colors">
                        {traitLabels[trait]}
                      </h3>
                    </div>
                    <div className="shrink-0">
                      <div className="w-8 h-8 rounded-full bg-bg-elevated flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                        <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-accent transition-colors" />
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
            className="w-full max-w-md text-center"
          >
            <div className="relative mb-6">
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
              
              <div className="relative w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-accent animate-spin" />
              </div>
            </div>

            <motion.h3
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg font-semibold text-text-primary mb-2"
            >
              Crafting your story...
            </motion.h3>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-text-secondary text-sm mb-4"
            >
              Testing <span className="text-accent font-medium">{selectedPrimaryTrait ? traitLabels[selectedPrimaryTrait] : ""}</span>
              {selectedSecondaryTrait && (
                <span> with <span className="text-accent font-medium">{traitLabels[selectedSecondaryTrait]}</span></span>
              )}
            </motion.p>

            <AnimatePresence>
              {generatedStory && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-bg-secondary border border-accent/30 rounded-xl p-4"
                >
                  <p className="text-text-muted text-xs mb-1">Your story:</p>
                  <h4 className="text-xl font-bold text-accent">{generatedStory.title}</h4>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

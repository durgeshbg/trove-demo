import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { traitLabels, computeTraitSummary } from "../lib/traits";
import { X, RotateCcw, Sparkles, TrendingUp, User, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface CharacterSheetProps {
  sessionId: Id<"sessions">;
  isOpen: boolean;
  onClose: () => void;
  onRestart: () => void;
}

export function CharacterSheet({
  sessionId,
  isOpen,
  onClose,
  onRestart,
}: CharacterSheetProps) {
  const session = useQuery(api.sessions.getById, { id: sessionId });
  const [showSummary, setShowSummary] = useState(true);

  if (!session) return null;

  const traitData = Object.entries(session.traits).map(([key, value]) => ({
    trait: traitLabels[key as keyof typeof traitLabels],
    fullTrait: key,
    value: Math.round(value),
    fill: "#f97316",
  }));

  const summary = computeTraitSummary(session.traits);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md overflow-y-auto"
          onClick={onClose}
        >
          {/* Ambient background */}
          <div className="fixed inset-0 overflow-hidden pointer-events-none">
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
                x: [0, 50, 0],
                y: [0, 30, 0]
              }}
              transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full"
              style={{
                background: "radial-gradient(circle, rgba(249, 115, 22, 0.2) 0%, transparent 70%)",
              }}
            />
            <motion.div
              animate={{ 
                scale: [1, 1.3, 1],
                x: [0, -30, 0],
                y: [0, -50, 0]
              }}
              transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 5 }}
              className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full"
              style={{
                background: "radial-gradient(circle, rgba(249, 115, 22, 0.15) 0%, transparent 70%)",
              }}
            />
          </div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4 py-12"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="fixed top-6 right-6 w-12 h-12 rounded-full bg-bg-tertiary border border-border flex items-center justify-center hover:bg-bg-elevated transition-colors z-20"
            >
              <X className="w-5 h-5 text-text-muted" />
            </motion.button>

            <div className="w-full max-w-2xl">
              {/* Header */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-center mb-10"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center shadow-lg shadow-accent/30"
                >
                  <User className="w-12 h-12 text-white" />
                </motion.div>
                <h1 className="text-3xl font-bold text-text-primary mb-2">
                  Character Profile
                </h1>
                <p className="text-text-secondary">
                  Your personality revealed through choices
                </p>
              </motion.div>

              {/* Radar Chart */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-bg-secondary/80 backdrop-blur-sm rounded-3xl border border-border p-8 mb-6"
              >
                <div className="w-full aspect-square max-w-[320px] mx-auto">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={traitData}>
                      <PolarGrid stroke="#2e2e2e" />
                      <PolarAngleAxis
                        dataKey="trait"
                        tick={{ fill: "#a3a3a3", fontSize: 12, fontWeight: 500 }}
                      />
                      <PolarRadiusAxis
                        angle={90}
                        domain={[0, 100]}
                        tick={{ fill: "#737373", fontSize: 10 }}
                        tickCount={6}
                        stroke="#2e2e2e"
                      />
                      <Radar
                        name="Traits"
                        dataKey="value"
                        stroke="#f97316"
                        strokeWidth={3}
                        fill="#f97316"
                        fillOpacity={0.25}
                        animationDuration={1000}
                        animationEasing="ease-out"
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              {/* Trait Bars */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-bg-secondary/80 backdrop-blur-sm rounded-3xl border border-border p-6 mb-6"
              >
                <div className="flex items-center gap-2 mb-5">
                  <TrendingUp className="w-5 h-5 text-accent" />
                  <h2 className="text-lg font-semibold text-text-primary">Trait Breakdown</h2>
                </div>
                <div className="space-y-4">
                  {traitData.map((t, index) => (
                    <motion.div
                      key={t.fullTrait}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                      className="space-y-2"
                    >
                      <div className="flex justify-between text-[13px]">
                        <span className="text-text-secondary">{t.trait}</span>
                        <span className="text-text-primary font-semibold">{t.value}%</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-bg-elevated overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-accent to-accent-light"
                          initial={{ width: 0 }}
                          animate={{ width: `${t.value}%` }}
                          transition={{ duration: 1, delay: 0.6 + index * 0.1, ease: "easeOut" }}
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Summary */}
              {session.status === "completed" && (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="bg-bg-secondary/80 backdrop-blur-sm rounded-3xl border border-border overflow-hidden mb-6"
                >
                  <button
                    onClick={() => setShowSummary(!showSummary)}
                    className="w-full p-6 flex items-center justify-between hover:bg-bg-tertiary/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Sparkles className="w-5 h-5 text-accent" />
                      <h2 className="text-lg font-semibold text-text-primary">Personality Summary</h2>
                    </div>
                    {showSummary ? (
                      <ChevronUp className="w-5 h-5 text-text-muted" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-text-muted" />
                    )}
                  </button>
                  
                  <AnimatePresence>
                    {showSummary && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="px-6 pb-6">
                          <div className="p-5 rounded-2xl bg-bg-tertiary border border-border text-[15px] text-text-secondary leading-relaxed whitespace-pre-line">
                            {summary}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}

              {/* Actions */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="flex flex-col sm:flex-row gap-3"
              >
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onRestart}
                  className="flex-1 py-4 px-6 rounded-xl bg-accent text-white font-medium text-[15px] flex items-center justify-center gap-2 hover:bg-accent-light transition-colors shadow-lg shadow-accent/20"
                >
                  <RotateCcw className="w-5 h-5" />
                  Play Another Story
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onClose}
                  className="flex-1 py-4 px-6 rounded-xl bg-bg-tertiary border border-border text-text-secondary font-medium text-[15px] hover:bg-bg-elevated hover:text-text-primary transition-colors"
                >
                  Back to Story
                </motion.button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

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
import { X, RotateCcw } from "lucide-react";
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
  const [showSummary, setShowSummary] = useState(false);

  if (!session) return null;

  const traitData = Object.entries(session.traits).map(([key, value]) => ({
    trait: traitLabels[key as keyof typeof traitLabels],
    fullTrait: key,
    value: Math.round(value),
    fill: "#f97316",
  }));

  const summary = computeTraitSummary(session.traits);

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex w-80 shrink-0 flex-col border-l border-border bg-bg-secondary">
        <SheetContent
          session={session}
          traitData={traitData}
          summary={summary}
          showSummary={showSummary}
          setShowSummary={setShowSummary}
          onRestart={onRestart}
        />
      </div>

      {/* Mobile bottom sheet */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end"
            onClick={onClose}
          >
            <div className="absolute inset-0 bg-black/60" />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative bg-bg-secondary rounded-t-2xl border-t border-border max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-bg-secondary z-10 px-4 py-3 border-b border-border flex items-center justify-between">
                <h2 className="text-[16px] font-semibold text-text-primary">
                  Character Sheet
                </h2>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg bg-bg-tertiary flex items-center justify-center hover:bg-bg-elevated transition-colors"
                >
                  <X className="w-4 h-4 text-text-muted" />
                </button>
              </div>
              <div className="p-4">
                <SheetContent
                  session={session}
                  traitData={traitData}
                  summary={summary}
                  showSummary={showSummary}
                  setShowSummary={setShowSummary}
                  onRestart={onRestart}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function SheetContent({
  session,
  traitData,
  summary,
  showSummary,
  setShowSummary,
  onRestart,
}: {
  session: { status: string; traits: Record<string, number> };
  traitData: Array<{ trait: string; fullTrait: string; value: number; fill: string }>;
  summary: string;
  showSummary: boolean;
  setShowSummary: (v: boolean) => void;
  onRestart: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-[18px] font-semibold text-text-primary mb-1">
            Character Sheet
          </h2>
          <p className="text-[13px] text-text-muted">
            Your traits update in real-time as you play
          </p>
        </div>

        {/* Radar Chart */}
        <div className="w-full aspect-square max-w-[280px] mx-auto">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={traitData}>
              <PolarGrid stroke="#2e2e2e" />
              <PolarAngleAxis
                dataKey="trait"
                tick={{ fill: "#a3a3a3", fontSize: 11 }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{ fill: "#737373", fontSize: 9 }}
                tickCount={6}
                stroke="#2e2e2e"
              />
              <Radar
                name="Traits"
                dataKey="value"
                stroke="#f97316"
                strokeWidth={2}
                fill="#f97316"
                fillOpacity={0.2}
                animationDuration={500}
                animationEasing="ease-out"
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Trait Bars */}
        <div className="space-y-3">
          {traitData.map((t) => (
            <motion.div
              key={t.fullTrait}
              layout
              className="space-y-1"
            >
              <div className="flex justify-between text-[12px]">
                <span className="text-text-secondary">{t.trait}</span>
                <span className="text-text-primary font-medium">{t.value}</span>
              </div>
              <div className="h-2 rounded-full bg-bg-elevated overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-accent"
                  initial={{ width: 0 }}
                  animate={{ width: `${t.value}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Summary */}
        {session.status === "completed" && (
          <div className="space-y-3">
            <button
              onClick={() => setShowSummary(!showSummary)}
              className="w-full py-2.5 px-4 rounded-xl bg-accent/10 text-accent text-[14px] font-medium hover:bg-accent/20 transition-colors"
            >
              {showSummary ? "Hide Profile Summary" : "View Profile Summary"}
            </button>

            {showSummary && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="p-4 rounded-xl bg-bg-tertiary border border-border text-[14px] text-text-secondary leading-relaxed whitespace-pre-line"
              >
                {summary}
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 p-4 border-t border-border">
        <button
          onClick={onRestart}
          className="w-full py-2.5 px-4 rounded-xl bg-bg-tertiary border border-border text-text-secondary text-[14px] font-medium hover:bg-bg-elevated hover:text-text-primary transition-colors flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Play Another Story
        </button>
      </div>
    </div>
  );
}

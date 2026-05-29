import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { motion } from "framer-motion";
import type { Id } from "../../convex/_generated/dataModel";
import { BookOpen, ArrowRight, Sparkles } from "lucide-react";

interface StoryPickerProps {
  onStart: (sessionId: Id<"sessions">) => void;
}

export function StoryPicker({ onStart }: StoryPickerProps) {
  const stories = useQuery(api.stories.list);
  const startSession = useMutation(api.sessions.startSession);
  const generateOpening = useAction(api.agent.generateOpening);
  const [starting, setStarting] = useState(false);

  const handleStart = async (storyId: Id<"stories">) => {
    setStarting(true);
    try {
      const sessionId = await startSession({ storyId });
      // Generate the opening scenario dynamically
      await generateOpening({ sessionId });
      onStart(sessionId);
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-10"
      >
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent/10 mb-5">
          <Sparkles className="w-7 h-7 text-accent" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-semibold text-text-primary mb-3 tracking-tight">
          Trove
        </h1>
        <p className="text-text-secondary text-base max-w-md mx-auto leading-relaxed">
          Discover who you are through immersive stories. Every choice reveals a
          piece of your character.
        </p>
      </motion.div>

      <div className="w-full max-w-md space-y-4">
        {stories?.map((story, index) => (
          <motion.button
            key={story._id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: index * 0.1 }}
            onClick={() => handleStart(story._id)}
            disabled={starting}
            className="w-full text-left group relative bg-bg-secondary border border-border rounded-2xl p-5 hover:border-accent/40 hover:bg-bg-tertiary transition-all duration-200 disabled:opacity-60"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="w-4 h-4 text-accent shrink-0" />
                  <h3 className="font-medium text-text-primary text-[17px]">
                    {story.title}
                  </h3>
                </div>
                <p className="text-text-secondary text-[14px] leading-relaxed mb-3 line-clamp-2">
                  {story.context}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-medium bg-accent/10 text-accent">
                    {story.vibe}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-medium bg-bg-elevated text-text-muted">
                    {story.mood}
                  </span>
                </div>
              </div>
              <div className="shrink-0 mt-1">
                <div className="w-8 h-8 rounded-full bg-bg-elevated flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                  <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-accent transition-colors" />
                </div>
              </div>
            </div>
          </motion.button>
        ))}

        {!stories?.length && (
          <div className="text-center py-12 text-text-muted text-sm">
            Loading stories...
          </div>
        )}
      </div>
    </div>
  );
}

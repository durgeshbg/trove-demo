import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useScrollToBottom } from "../hooks/useScrollToBottom";
import { MessageBubble } from "./MessageBubble";
import { OptionButtons } from "./OptionButtons";
import { TypingIndicator } from "./TypingIndicator";
import { AmbientBackground } from "./AmbientBackground";
import { Send, Sparkles, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ChatProps {
  sessionId: Id<"sessions">;
  className?: string;
  onComplete?: () => void;
}

export function Chat({ sessionId, className, onComplete }: ChatProps) {
  const session = useQuery(api.sessions.getById, { id: sessionId });
  const story = useQuery(
    api.stories.getById,
    session ? { id: session.storyId } : "skip",
  );
  const processDecision = useAction(api.agent.processDecision);

  const [freeText, setFreeText] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Optimistic local state
  const [localState, setLocalState] = useState<{
    messages: Array<{
      role: "narrator" | "user";
      text: string;
      timestamp: number;
    }>;
    isPending: boolean;
  } | null>(null);

  const displayMessages = localState?.messages ?? session?.messages ?? [];
  const displayPending = localState?.isPending ?? isPending;

  const scrollRef = useScrollToBottom([displayMessages.length, displayPending]);

  // Keep a ref to localState so the effect below doesn't need it in deps.
  const localStateRef = useRef(localState);

  useEffect(() => {
    localStateRef.current = localState;
  }, [localState]);

  // Clear local state when session catches up
  useEffect(() => {
    if (!session) return;

    const ls = localStateRef.current;
    if (!ls) return;

    const lastLocal = ls.messages[ls.messages.length - 1];
    if (lastLocal?.role !== "user") return;

    const lastReal = session.messages[session.messages.length - 1];
    if (
      lastReal?.role === "narrator" &&
      session.messages.length > ls.messages.length
    ) {
      setLocalState(null);
    }
  }, [session?.messages.length, session]);

  // Show completion modal when story completes
  useEffect(() => {
    if (session?.status === "completed" && !showCompletion) {
      const timer = setTimeout(() => {
        setShowCompletion(true);
      }, 1500); // Delay to let user see the final message
      return () => clearTimeout(timer);
    }
  }, [session?.status]);

  const isDecisionPoint =
    session?.status === "active" && !displayPending && !!story;

  const currentOptions = session?.currentOptions ?? [];

  const handleSelect = useCallback(
    async (input: string) => {
      if (!session || displayPending) return;

      setLocalState({
        messages: [
          ...session.messages,
          { role: "user", text: input, timestamp: Date.now() },
        ],
        isPending: true,
      });
      setIsPending(true);

      try {
        await processDecision({ sessionId, input });
      } finally {
        setIsPending(false);
      }
    },
    [session, displayPending, processDecision, sessionId],
  );

  const handleFreeText = () => {
    const text = freeText.trim();
    if (!text) return;
    handleSelect(text);
    setFreeText("");
  };

  // Auto-focus textarea when decision point appears
  useEffect(() => {
    if (isDecisionPoint && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isDecisionPoint]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleFreeText();
    }
  };

  const handleViewProfile = () => {
    setShowCompletion(false);
    onComplete?.();
  };

  if (!session || !story) {
    return (
      <div className={className}>
        <div className="flex items-center justify-center h-full text-text-muted text-sm">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full mr-2"
          />
          Loading your story...
        </div>
      </div>
    );
  }

  return (
    <>
      <AmbientBackground />
      
      <div className={`relative z-10 flex flex-col h-full ${className ?? ""}`}>
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="shrink-0 px-4 py-4 border-b border-border/50 bg-bg-secondary/80 backdrop-blur-md flex items-center gap-3"
        >
          <motion.div 
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center border border-accent/30"
            whileHover={{ scale: 1.05, rotate: 5 }}
            transition={{ duration: 0.2 }}
          >
            <span className="text-accent text-sm font-bold">
              {story.title[0]}
            </span>
          </motion.div>
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-semibold text-text-primary truncate">
              {story.title}
            </h2>
            <p className="text-[12px] text-text-muted">
              {story.vibe} · {story.mood}
            </p>
          </div>
        </motion.div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-6 scroll-smooth"
        >
          <div className="max-w-3xl mx-auto space-y-6">
            {displayMessages.map((msg, i) => (
              <MessageBubble
                key={`${msg.timestamp}-${i}`}
                text={msg.text}
                role={msg.role}
                index={i}
              />
            ))}
            {displayPending && <TypingIndicator />}
          </div>
        </div>

        {/* Input Area */}
        <AnimatePresence>
          {session.status === "active" && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="shrink-0 border-t border-border/50 bg-bg-secondary/80 backdrop-blur-md p-4"
            >
              <div className="max-w-3xl mx-auto">
                {isDecisionPoint && currentOptions.length > 0 && (
                  <div className="mb-4">
                    <OptionButtons
                      options={currentOptions}
                      onSelect={handleSelect}
                      disabled={displayPending}
                    />
                  </div>
                )}

                <div className="flex gap-3">
                  <textarea
                    ref={textareaRef}
                    value={freeText}
                    onChange={(e) => {
                      setFreeText(e.target.value);
                      e.target.style.height = "auto";
                      e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      isDecisionPoint
                        ? "Or type your own choice..."
                        : "Type a message..."
                    }
                    className="flex-1 bg-bg-tertiary/80 border border-border rounded-xl px-4 py-3 text-text-primary text-[14px] placeholder:text-text-muted resize-none focus:outline-none focus:border-accent/50 focus:bg-bg-tertiary min-h-[48px] max-h-[120px] transition-all duration-200"
                    rows={1}
                    disabled={displayPending}
                  />
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleFreeText}
                    disabled={displayPending || !freeText.trim()}
                    className="shrink-0 w-12 h-12 bg-accent text-white rounded-xl flex items-center justify-center hover:bg-accent-light disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-lg shadow-accent/20"
                  >
                    <Send className="w-5 h-5" />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Completion Modal */}
      <AnimatePresence>
        {showCompletion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowCompletion(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 50 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative max-w-md w-full bg-bg-secondary rounded-3xl border border-border p-8 shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Decorative background elements */}
              <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-accent/10 to-transparent" />
              <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 0.5, 0.3]
                }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute top-10 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full bg-accent/20 blur-3xl"
              />

              {/* Content */}
              <div className="relative z-10 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center shadow-lg shadow-accent/30"
                >
                  <Sparkles className="w-10 h-10 text-white" />
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-2xl font-bold text-text-primary mb-3"
                >
                  Story Complete
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-text-secondary text-[15px] leading-relaxed mb-8"
                >
                  You've reached the end of your journey. Your character profile is ready to be revealed.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="space-y-3"
                >
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleViewProfile}
                    className="w-full py-4 px-6 rounded-xl bg-accent text-white font-medium text-[15px] flex items-center justify-center gap-2 hover:bg-accent-light transition-colors shadow-lg shadow-accent/20"
                  >
                    View Your Character Profile
                    <ChevronRight className="w-5 h-5" />
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowCompletion(false)}
                    className="w-full py-3 px-6 rounded-xl bg-bg-tertiary text-text-secondary font-medium text-[14px] hover:bg-bg-elevated hover:text-text-primary transition-colors"
                  >
                    Continue Reading
                  </motion.button>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

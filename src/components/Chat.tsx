import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useScrollToBottom } from "../hooks/useScrollToBottom";
import { MessageBubble } from "./MessageBubble";
import { OptionButtons } from "./OptionButtons";
import { TypingIndicator } from "./TypingIndicator";
import { Send } from "lucide-react";

interface ChatProps {
  sessionId: Id<"sessions">;
  className?: string;
}

export function Chat({ sessionId, className }: ChatProps) {
  const session = useQuery(api.sessions.getById, { id: sessionId });
  const story = useQuery(
    api.stories.getById,
    session ? { id: session.storyId } : "skip",
  );
  const processDecision = useAction(api.agent.processDecision);

  const [freeText, setFreeText] = useState("");
  const [isPending, setIsPending] = useState(false);
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

  if (!session || !story) {
    return (
      <div className={className}>
        <div className="flex items-center justify-center h-full text-text-muted text-sm">
          Loading your story...
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className ?? ""}`}>
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-border bg-bg-secondary/50 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
          <span className="text-accent text-xs font-semibold">
            {story.title[0]}
          </span>
        </div>
        <div className="min-w-0">
          <h2 className="text-[14px] font-medium text-text-primary truncate">
            {story.title}
          </h2>
          <p className="text-[12px] text-text-muted">
            {story.vibe} · {story.mood}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
      >
        {displayMessages.map((msg, i) => (
          <MessageBubble
            key={`${msg.timestamp}-${i}`}
            text={msg.text}
            role={msg.role}
            index={i}
          />
        ))}
        {displayPending && <TypingIndicator />}

        {session.status === "completed" && (
          <div className="flex justify-center pt-4">
            <div className="px-4 py-2 rounded-full bg-accent/10 text-accent text-[13px] font-medium">
              Story Complete
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="shrink-0 border-t border-border bg-bg-secondary p-4">
        {isDecisionPoint && currentOptions.length > 0 && (
          <div className="mb-3">
            <OptionButtons
              options={currentOptions}
              onSelect={handleSelect}
              disabled={displayPending}
            />
          </div>
        )}

        {session.status === "active" && (
          <div className="flex gap-2">
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
              className="flex-1 bg-bg-tertiary border border-border rounded-xl px-3.5 py-2.5 text-text-primary text-[14px] placeholder:text-text-muted resize-none focus:outline-none focus:border-accent/50 min-h-[44px] max-h-[120px]"
              rows={1}
              disabled={displayPending}
            />
            <button
              onClick={handleFreeText}
              disabled={displayPending || !freeText.trim()}
              className="shrink-0 w-11 h-11 bg-accent text-white rounded-xl flex items-center justify-center hover:bg-accent-light disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

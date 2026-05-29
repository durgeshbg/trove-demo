import { motion } from "framer-motion";
import { cn } from "../lib/utils";
import { Sparkles } from "lucide-react";

interface MessageBubbleProps {
  text: string;
  role: "narrator" | "user";
  index: number;
}

export function MessageBubble({ text, role, index }: MessageBubbleProps) {
  const isUser = role === "user";

  // Check if this is an ending message with profile summary
  const isEndingWithProfile = text.includes("Your Character Profile");

  // Split text into words for staggered animation
  const words = text.split(" ");

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.02,
        delayChildren: 0.1,
      },
    },
  };

  const wordVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        ease: "easeOut" as const,
      },
    },
  };

  const userBubbleClasses = `
    bg-gradient-to-br from-bg-elevated to-bg-tertiary
    text-text-primary
    rounded-2xl rounded-tr-sm
    border border-accent/30
    shadow-lg shadow-accent/10
  `;

  const narratorBubbleClasses = `
    bg-bg-secondary
    text-text-primary
    rounded-2xl rounded-tl-sm
    border border-border
    shadow-lg shadow-black/20
  `;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.5,
        delay: index * 0.08,
        ease: [0.34, 1.56, 0.64, 1],
      }}
      className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}
    >
      <motion.div
        whileHover={{ scale: 1.01 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "relative max-w-[85%] sm:max-w-[70%] md:max-w-[60%]",
          isUser ? "mr-2" : "ml-2"
        )}
      >
        {/* Decorative elements for narrator */}
        {!isUser && (
          <>
            {/* Decorative corner accent */}
            <motion.div
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: index * 0.08 + 0.3, duration: 0.4 }}
              className="absolute -left-3 -top-3 w-6 h-6 rounded-full bg-accent/20 blur-sm"
            />
            {/* Decorative dot cluster */}
            <div className="absolute -left-4 bottom-4 flex flex-col gap-1">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.08 + 0.4, duration: 0.3 }}
                className="w-1.5 h-1.5 rounded-full bg-accent/40"
              />
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.08 + 0.5, duration: 0.3 }}
                className="w-1 h-1 rounded-full bg-accent/30"
              />
            </div>
          </>
        )}

        {/* Main bubble */}
        <div
          className={cn(
            "relative px-5 py-4 text-[15px] leading-relaxed",
            isUser ? userBubbleClasses : narratorBubbleClasses
          )}
        >
          {/* Glow effect for user messages */}
          {isUser && (
            <div className="absolute inset-0 rounded-2xl rounded-tr-sm bg-accent/5 blur-md -z-10" />
          )}

          {/* Subtle gradient overlay for narrator */}
          {!isUser && (
            <div className="absolute inset-0 rounded-2xl rounded-tl-sm bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none" />
          )}

          {/* Text content with word-by-word animation */}
          <motion.span
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="relative z-10"
          >
            {isEndingWithProfile ? (
              // Render ending message with profile summary
              <EndingMessageContent text={text} wordVariants={wordVariants} />
            ) : (
              // Regular word-by-word animation for normal messages
              words.map((word, wordIndex) => (
                <motion.span
                  key={wordIndex}
                  variants={wordVariants}
                  className="inline-block mr-[0.3em]"
                >
                  {word}
                </motion.span>
              ))
            )}
          </motion.span>

          {/* Subtle shine effect on hover */}
          <div
            className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none"
            style={{
              backgroundSize: "200% 100%",
            }}
          />
        </div>

        {/* User message decorations */}
        {isUser && (
          <>
            {/* Decorative accent line */}
            <motion.div
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: index * 0.08 + 0.3, duration: 0.4 }}
              className="absolute -right-3 top-6 w-0.5 h-8 bg-accent/30 rounded-full origin-top"
            />
            {/* Small decorative orb */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: index * 0.08 + 0.4, duration: 0.3 }}
              className="absolute -right-4 bottom-6 w-2 h-2 rounded-full bg-accent/40"
            />
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

// Helper component to render ending message with profile summary
interface EndingMessageContentProps {
  text: string;
  wordVariants: {
    hidden: { opacity: number; y: number };
    visible: {
      opacity: number;
      y: number;
      transition: { duration: number; ease: string };
    };
  };
}

function EndingMessageContent({ text, wordVariants }: EndingMessageContentProps) {
  // Split the message into narrative and profile parts
  const parts = text.split("---");
  const narrativeText = parts[0]?.trim() || "";
  const profileText = parts[1]?.trim() || "";

  // Parse bold text (**text**)
  const parseBoldText = (text: string) => {
    const segments = text.split(/(\*\*.*?\*\*)/g);
    return segments.map((segment, i) => {
      if (segment.startsWith("**") && segment.endsWith("**")) {
        return (
          <strong key={i} className="text-accent font-semibold">
            {segment.slice(2, -2)}
          </strong>
        );
      }
      return segment;
    });
  };

  return (
    <div className="space-y-4">
      {/* Narrative part */}
      <div>
        {narrativeText.split(" ").map((word, wordIndex) => (
          <motion.span
            key={wordIndex}
            variants={wordVariants}
            className="inline-block mr-[0.3em]"
          >
            {parseBoldText(word)}
          </motion.span>
        ))}
      </div>

      {/* Profile summary part */}
      {profileText && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="pt-4 border-t border-border/50"
        >
          {/* Profile header */}
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-accent" />
            <span className="text-accent font-semibold text-[14px]">
              Your Character Profile
            </span>
          </div>

          {/* Profile content */}
          <div className="text-[14px] text-text-secondary leading-relaxed space-y-3">
            {profileText
              .replace("Your Character Profile", "")
              .trim()
              .split("\n\n")
              .filter(Boolean)
              .map((paragraph, i) => (
                <p key={i}>{parseBoldText(paragraph)}</p>
              ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

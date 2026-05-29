import { motion } from "framer-motion";
import { cn } from "../lib/utils";

interface MessageBubbleProps {
  text: string;
  role: "narrator" | "user";
  index: number;
}

export function MessageBubble({ text, role, index }: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, delay: index * 0.05, ease: "easeOut" }}
      className={cn(
        "flex w-full",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed",
          isUser
            ? "bg-user-bubble text-text-primary rounded-br-md"
            : "bg-narrator-bubble text-text-primary rounded-bl-md border border-border"
        )}
      >
        {text}
      </div>
    </motion.div>
  );
}

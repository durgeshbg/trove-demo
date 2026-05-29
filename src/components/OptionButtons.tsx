import { motion } from "framer-motion";

interface OptionButtonsProps {
  options: string[];
  onSelect: (option: string) => void;
  disabled: boolean;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.15,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 8, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1 },
};

export function OptionButtons({ options, onSelect, disabled }: OptionButtonsProps) {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-2 w-full"
    >
      {options.map((option) => (
        <motion.button
          key={option}
          variants={item}
          transition={{ duration: 0.25, ease: "easeOut" }}
          onClick={() => onSelect(option)}
          disabled={disabled}
          className="w-full text-left px-4 py-3 rounded-xl bg-bg-tertiary border border-border text-text-primary text-[14px] leading-relaxed hover:bg-bg-elevated hover:border-accent/40 active:scale-[0.98] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          {option}
        </motion.button>
      ))}
    </motion.div>
  );
}

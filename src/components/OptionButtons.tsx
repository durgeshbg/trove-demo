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
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20, scale: 0.9 },
  show: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
  },
};

export function OptionButtons({ options, onSelect, disabled }: OptionButtonsProps) {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-3 w-full"
    >
      {options.map((option, index) => (
        <motion.button
          key={option}
          variants={item}
          transition={{ 
            type: "spring" as const,
            stiffness: 300,
            damping: 20,
          }}
          whileHover={{ 
            scale: 1.02, 
            x: 8,
          }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelect(option)}
          disabled={disabled}
          className="group relative w-full text-left"
        >
          {/* Background with gradient border effect */}
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-accent/20 via-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* Main button content */}
          <div className="relative flex items-center gap-3 px-5 py-4 rounded-xl bg-bg-tertiary border border-border group-hover:border-accent/40 group-hover:bg-bg-elevated transition-all duration-300 shadow-lg shadow-black/10 group-hover:shadow-accent/5">
            {/* Option indicator */}
            <motion.div 
              className="flex-shrink-0 w-6 h-6 rounded-full bg-bg-secondary border border-border group-hover:border-accent/50 group-hover:bg-accent/10 flex items-center justify-center transition-all duration-300"
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.5 }}
            >
              <span className="text-[11px] font-medium text-text-muted group-hover:text-accent transition-colors">
                {String.fromCharCode(65 + index)}
              </span>
            </motion.div>

            {/* Option text */}
            <span className="flex-1 text-text-primary text-[14px] leading-relaxed group-hover:text-text-primary transition-colors">
              {option}
            </span>

            {/* Arrow indicator on hover */}
            <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-[-10px] group-hover:translate-x-0">
              <svg 
                className="w-4 h-4 text-accent" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M9 5l7 7-7 7" 
                />
              </svg>
            </div>
          </div>
        </motion.button>
      ))}
    </motion.div>
  );
}

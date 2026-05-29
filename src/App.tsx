import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { Chat } from "./components/Chat";
import { CharacterSheet } from "./components/CharacterSheet";
import { StoryPicker } from "./components/StoryPicker";
import { ScrollText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SignIn, useAuth, UserButton } from "@clerk/react";

function App() {
  const { isSignedIn, isLoaded } = useAuth();
  const seedStories = useMutation(api.stories.seedStories);

  // Seed stories on first load
  useEffect(() => {
    seedStories().catch(() => {});
  }, [seedStories]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full" 
        />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary px-4">
        <div className="w-full max-w-sm">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className="text-4xl font-bold text-text-primary mb-3">
              Trove
            </h1>
            <p className="text-text-secondary">
              Discover your character through immersive stories
            </p>
          </motion.div>
          <SignIn
            routing="hash"
            appearance={{
              elements: {
                rootBox: "mx-auto",
                card: "bg-bg-secondary border border-border shadow-none",
                headerTitle: "text-text-primary",
                headerSubtitle: "text-text-secondary",
                socialButtonsBlockButton:
                  "bg-bg-tertiary border-border text-text-primary hover:bg-bg-elevated",
                socialButtonsBlockButtonText: "text-text-primary",
                formFieldLabel: "text-text-secondary",
                formFieldInput:
                  "bg-bg-tertiary border-border text-text-primary",
                footerActionLink: "text-accent",
                formButtonPrimary: "bg-accent hover:bg-accent-light",
                identityPreviewText: "text-text-primary",
                identityPreviewEditButton: "text-accent",
                formFieldAction: "text-accent",
                dividerLine: "bg-border",
                dividerText: "text-text-muted",
                otpCodeFieldInput:
                  "bg-bg-tertiary border-border text-text-primary",
              },
            }}
          />
        </div>
      </div>
    );
  }

  return <TroveApp />;
}

function TroveApp() {
  const activeSession = useQuery(api.sessions.getActiveSession);
  const [manualSessionId, setManualSessionId] = useState<Id<"sessions"> | null>(
    null,
  );
  const [wantsNewStory, setWantsNewStory] = useState(false);
  const [showCharacterSheet, setShowCharacterSheet] = useState(false);

  const sessionId = wantsNewStory
    ? null
    : (manualSessionId ?? activeSession?.session._id ?? null);

  const handleStart = (id: Id<"sessions">) => {
    setWantsNewStory(false);
    setManualSessionId(id);
    setShowCharacterSheet(false);
  };

  const handleRestart = () => {
    setWantsNewStory(true);
    setManualSessionId(null);
    setShowCharacterSheet(false);
  };

  const handleComplete = () => {
    setShowCharacterSheet(true);
  };

  return (
    <div className="h-screen flex flex-col bg-bg-primary overflow-hidden">
      {/* Top bar */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="shrink-0 h-16 border-b border-border/50 bg-bg-secondary/80 backdrop-blur-md flex items-center justify-between px-4 z-20"
      >
        <div className="flex items-center gap-3">
          <motion.span 
            className="text-[20px] font-bold text-accent tracking-tight"
            whileHover={{ scale: 1.05 }}
          >
            Trove
          </motion.span>
        </div>
        <div className="flex items-center gap-3">
          {sessionId && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowCharacterSheet(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-bg-tertiary border border-border hover:bg-bg-elevated hover:border-accent/40 transition-all"
            >
              <ScrollText className="w-4 h-4 text-accent" />
              <span className="text-sm text-text-secondary hidden sm:inline">Profile</span>
            </motion.button>
          )}
          <UserButton
            appearance={{
              elements: {
                avatarBox: "w-9 h-9",
              },
            }}
          />
        </div>
      </motion.div>

      {/* Main content */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          {!sessionId ? (
            <motion.div
              key="picker"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="h-full overflow-y-auto"
            >
              <StoryPicker onStart={handleStart} />
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              <Chat 
                sessionId={sessionId} 
                className="h-full"
                onComplete={handleComplete}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Character Sheet Overlay - shown when requested or after completion */}
      {sessionId && (
        <CharacterSheet
          sessionId={sessionId}
          isOpen={showCharacterSheet}
          onClose={() => setShowCharacterSheet(false)}
          onRestart={handleRestart}
        />
      )}
    </div>
  );
}

export default App;
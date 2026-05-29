import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { Chat } from "./components/Chat";
import { CharacterSheet } from "./components/CharacterSheet";
import { StoryPicker } from "./components/StoryPicker";
import { ScrollText, ChevronUp } from "lucide-react";
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
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-semibold text-text-primary mb-2">
              Trove
            </h1>
            <p className="text-text-secondary text-sm">
              Sign in to discover your character
            </p>
          </div>
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
  const [sheetOpen, setSheetOpen] = useState(false);

  const sessionId = wantsNewStory
    ? null
    : (manualSessionId ?? activeSession?.session._id ?? null);

  const handleStart = (id: Id<"sessions">) => {
    setWantsNewStory(false);
    setManualSessionId(id);
  };

  const handleRestart = () => {
    setWantsNewStory(true);
    setManualSessionId(null);
    setSheetOpen(false);
  };

  return (
    <div className="h-screen flex flex-col bg-bg-primary">
      {/* Top bar */}
      <div className="shrink-0 h-14 border-b border-border bg-bg-secondary flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <span className="text-[18px] font-bold text-accent tracking-tight">
            Trove
          </span>
        </div>
        <div className="flex items-center gap-2">
          {sessionId && (
            <button
              onClick={() => setSheetOpen(true)}
              className="lg:hidden w-9 h-9 rounded-lg bg-bg-tertiary border border-border flex items-center justify-center hover:bg-bg-elevated transition-colors"
            >
              <ScrollText className="w-4 h-4 text-text-muted" />
            </button>
          )}
          <UserButton
            appearance={{
              elements: {
                avatarBox: "w-8 h-8",
              },
            }}
          />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        <AnimatePresence mode="wait">
          {!sessionId ? (
            <motion.div
              key="picker"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 overflow-y-auto"
            >
              <StoryPicker onStart={handleStart} />
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex overflow-hidden"
            >
              <Chat sessionId={sessionId} className="flex-1" />
              <CharacterSheet
                sessionId={sessionId}
                isOpen={sheetOpen}
                onClose={() => setSheetOpen(false)}
                onRestart={handleRestart}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile sheet handle (visible when chat is active) */}
      {sessionId && (
        <div className="lg:hidden fixed bottom-6 right-4 z-40">
          <button
            onClick={() => setSheetOpen(true)}
            className="w-12 h-12 rounded-full bg-accent text-white shadow-lg flex items-center justify-center hover:bg-accent-light transition-colors"
          >
            <ChevronUp className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}

export default App;

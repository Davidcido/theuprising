import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, PhoneOff, Mic, MicOff, MessageSquare, Globe } from "lucide-react";

const languages = [
  { code: "en", label: "English" },
  { code: "pcm", label: "Pidgin" },
  { code: "yo", label: "Yoruba" },
  { code: "ha", label: "Hausa" },
  { code: "ig", label: "Igbo" },
];

const modes = [
  { id: "vent", label: "Vent Mode", desc: "I'll listen more than I speak" },
  { id: "support", label: "Support Mode", desc: "Emotional guidance & coping tips" },
  { id: "calm", label: "Calm Mode", desc: "Breathing & grounding exercises" },
];

const VoiceCompanion = () => {
  const [callActive, setCallActive] = useState(false);
  const [muted, setMuted] = useState(false);
  const [selectedLang, setSelectedLang] = useState("en");
  const [selectedMode, setSelectedMode] = useState("support");
  const [showTranscript, setShowTranscript] = useState(false);

  const startCall = () => {
    setCallActive(true);
  };

  const endCall = () => {
    setCallActive(false);
    setMuted(false);
    setShowTranscript(false);
  };

  if (!callActive) {
    return (
      <div className="space-y-6 py-2">
        {/* Mode selection */}
        <div className="space-y-2">
          <p className="text-white/70 text-xs font-medium uppercase tracking-wider">Conversation Mode</p>
          <div className="space-y-2">
            {modes.map((m) => (
              <motion.button
                key={m.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => setSelectedMode(m.id)}
                className={`w-full text-left p-3 rounded-xl backdrop-blur-md border transition-all ${
                  selectedMode === m.id
                    ? "border-white/40 bg-white/20"
                    : "border-white/10 bg-white/5"
                }`}
              >
                <p className="text-sm font-semibold text-white">{m.label}</p>
                <p className="text-xs text-white/60">{m.desc}</p>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Language selection */}
        <div className="space-y-2">
          <p className="text-white/70 text-xs font-medium uppercase tracking-wider flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5" /> Language
          </p>
          <div className="flex flex-wrap gap-2">
            {languages.map((l) => (
              <button
                key={l.code}
                onClick={() => setSelectedLang(l.code)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  selectedLang === l.code
                    ? "bg-white/25 text-white border border-white/40"
                    : "bg-white/5 text-white/60 border border-white/10"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {/* Start call */}
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={startCall}
          className="w-full py-4 rounded-2xl font-display font-bold text-white flex items-center justify-center gap-3 shadow-lg"
          style={{ background: "linear-gradient(135deg, #0F5132, #2E8B57)" }}
        >
          <Phone className="w-5 h-5" />
          Start Voice Call
        </motion.button>

        <p className="text-center text-white/40 text-xs">
          Voice companion requires Lovable Cloud. Coming soon!
        </p>
      </div>
    );
  }

  // Active call interface
  return (
    <div className="space-y-6 py-2">
      {/* Call status */}
      <div className="text-center space-y-3">
        <motion.div
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="w-24 h-24 mx-auto rounded-full flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #0F5132, #2E8B57)", boxShadow: "0 0 50px rgba(46,139,87,0.4)" }}
        >
          <Phone className="w-10 h-10 text-white" />
        </motion.div>
        <p className="text-white font-display font-bold text-lg">Uprising Companion</p>
        <p className="text-white/50 text-sm">
          {selectedMode === "vent" ? "Listening..." : selectedMode === "calm" ? "Calming..." : "Supporting..."}
        </p>
        <p className="text-white/30 text-xs">
          {languages.find(l => l.code === selectedLang)?.label}
        </p>
      </div>

      {/* Transcript toggle */}
      <AnimatePresence>
        {showTranscript && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 p-4 max-h-40 overflow-y-auto"
          >
            <p className="text-white/40 text-xs text-center italic">Transcript will appear here during the call...</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      <div className="flex items-center justify-center gap-6">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setMuted(!muted)}
          className={`w-14 h-14 rounded-full flex items-center justify-center border ${
            muted ? "bg-red-500/20 border-red-400/30" : "bg-white/10 border-white/20"
          }`}
        >
          {muted ? <MicOff className="w-6 h-6 text-red-300" /> : <Mic className="w-6 h-6 text-white" />}
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={endCall}
          className="w-16 h-16 rounded-full flex items-center justify-center bg-red-500 shadow-lg"
          style={{ boxShadow: "0 0 30px rgba(239,68,68,0.4)" }}
        >
          <PhoneOff className="w-7 h-7 text-white" />
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowTranscript(!showTranscript)}
          className={`w-14 h-14 rounded-full flex items-center justify-center border ${
            showTranscript ? "bg-white/20 border-white/40" : "bg-white/10 border-white/20"
          }`}
        >
          <MessageSquare className="w-6 h-6 text-white" />
        </motion.button>
      </div>
    </div>
  );
};

export default VoiceCompanion;

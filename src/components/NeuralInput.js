"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Loader2 } from "lucide-react";
import { usePromptStore } from "@/store/usePromptStore";
import { cn } from "@/lib/utils";

export default function NeuralInput() {
    const { autoPilot, isAutoPiloting, autoPilotError } = usePromptStore();
    const [input, setInput] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();
        if (input.trim() && !isAutoPiloting) {
            autoPilot(input);
            setInput("");
        }
    };

    return (
        <div className="w-full relative group">
            {/* Background Glow */}
            <div className="absolute -inset-1 bg-gradient-to-r from-accent/20 via-violet-500/20 to-accent/20 rounded-2xl blur-lg opacity-40 group-hover:opacity-70 transition duration-500"></div>
            
            <form onSubmit={handleSubmit} className="relative glass-card p-1.5 flex items-center border border-white/10 group-hover:border-accent/40 transition-colors">
                <div className="p-3">
                    {isAutoPiloting ? (
                        <Loader2 className="w-5 h-5 text-accent animate-spin" />
                    ) : (
                        <Zap className="w-5 h-5 text-accent/70 group-hover:text-accent transition-colors drop-shadow-[0_0_8px_rgba(237,61,99,0.8)]" />
                    )}
                </div>
                
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={isAutoPiloting}
                    placeholder="Auto-Pilot: Type a feeling, a mood, or a brief scene..."
                    className="flex-1 bg-transparent border-none outline-none text-white placeholder-white/30 font-medium px-2 py-4 h-full disabled:opacity-50"
                />
                
                <button
                    type="submit"
                    disabled={isAutoPiloting || !input.trim()}
                    className={cn(
                        "px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all",
                        isAutoPiloting || !input.trim()
                            ? "bg-white/5 text-white/20"
                            : "bg-accent/20 text-accent hover:bg-accent hover:text-white border border-accent/20 hover:border-accent shadow-[0_0_15px_rgba(237,61,99,0.3)] hover:shadow-[0_0_25px_rgba(237,61,99,0.5)]"
                    )}
                >
                    Initialize
                </button>
            </form>

            <AnimatePresence>
                {autoPilotError && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full mt-2 w-full p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center"
                    >
                        {autoPilotError}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

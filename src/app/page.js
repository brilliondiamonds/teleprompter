"use client";

import "./app.css";
import PromptBuilder from "@/components/PromptBuilder";
import { motion } from "framer-motion";
import { Zap } from "lucide-react";

export default function Home() {
  return (
    <main className="checker-background min-h-screen flex flex-col items-center pt-20 pb-32">
      {/* Background Decorative Elements */}
      <div className="glow-dot top-20 -left-20 bg-accent/20" />
      <div className="glow-dot bottom-40 -right-20 bg-accent/10 sm:w-[400px] sm:h-[400px]" />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center mb-16 px-4 text-center"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-2xl bg-accent shadow-[0_0_30px_rgba(237,61,99,0.3)]">
            <Zap className="w-8 h-8 text-white fill-white" />
          </div>
          <h1 className="text-5xl font-black tracking-tighter text-white uppercase italic">
            Teleprompter
          </h1>
        </div>
        <p className="text-white/40 max-w-md text-lg font-medium leading-relaxed">
          Dynamic AI Image Prompt Engineering for Professional Studios.
        </p>
      </motion.div>

      {/* Main Tool */}
      <PromptBuilder />

      {/* Footer / Status */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 glass-card px-6 py-3 flex items-center gap-4 border-accent/20">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full animate-pulse bg-emerald-500" />
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-500/80">
            Online
          </span>
        </div>
        <div className="w-[1px] h-4 bg-white/10" />
        <span className="text-xs text-white/40 font-medium">
          v0.3.0 · GLM-5.1
        </span>
      </div>
    </main>
  );
}

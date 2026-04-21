"use client";

import { motion } from "framer-motion";
import { CopyPlus, Sparkles, X } from "lucide-react";
import { usePromptStore } from "@/store/usePromptStore";
import { cn } from "@/lib/utils";

export default function QuantumMutator() {
    const { mutatedVariants, applyVariant } = usePromptStore();

    if (!mutatedVariants || mutatedVariants.length === 0) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-6xl glass-card border-violet-500/30 shadow-[0_0_100px_rgba(139,92,246,0.15)] flex flex-col max-h-[90vh]"
            >
                <div className="p-6 border-b border-white/10 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-violet-400" />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-accent">Quantum Mutator</span>
                        </h2>
                        <p className="text-white/40 text-xs mt-1">Select a parallel universe to merge with your locked base.</p>
                    </div>
                    <button 
                        onClick={() => usePromptStore.setState({ mutatedVariants: [] })}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 opacity-50" />
                    </button>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-y-auto">
                    {mutatedVariants.map((variant, idx) => (
                        <div key={idx} className="group flex flex-col gap-4 p-5 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-violet-500/5 hover:border-violet-500/30 transition-all">
                            <h3 className="font-bold text-sm tracking-wider text-violet-400 uppercase">{variant.name || `Universe ${String.fromCharCode(65 + idx)}`}</h3>
                            
                            <div className="flex-1 flex flex-col gap-2">
                                {variant.modules?.map((mod, i) => (
                                    <div key={i} className={cn(
                                        "text-xs p-2 rounded border",
                                        mod.isNegative ? "bg-red-500/10 border-red-500/20 text-red-300" : "bg-white/5 border-white/5 text-white/70"
                                    )}>
                                        <span className="opacity-50 uppercase text-[9px] mr-2">{mod.type}</span>
                                        {mod.value}
                                        {mod.weight && mod.weight !== 1.0 && <span className="ml-2 text-accent">({mod.weight})</span>}
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={() => applyVariant(variant.modules)}
                                className="w-full py-3 mt-4 rounded-xl bg-violet-500/20 text-violet-300 border border-violet-500/30 hover:bg-violet-500 hover:text-white font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all group-hover:shadow-[0_0_20px_rgba(139,92,246,0.3)]"
                            >
                                <CopyPlus className="w-4 h-4" /> Apply Timeline
                            </button>
                        </div>
                    ))}
                </div>
            </motion.div>
        </div>
    );
}

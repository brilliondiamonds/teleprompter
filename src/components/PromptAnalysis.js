"use client";

import { useState } from "react";
import { Brain, TrendingUp, Target, Palette, Eye, Lightbulb, Loader2, BarChart3 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const CATEGORY_ICONS = {
    clarity: Eye,
    specificity: Target,
    composition: BarChart3,
    mood: Palette,
};

function ScoreRing({ score, size = 64, strokeWidth = 4, label }) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 10) * circumference;
    const color = score >= 7 ? "#10b981" : score >= 4 ? "#f59e0b" : "#ef4444";

    return (
        <div className="flex flex-col items-center gap-1.5">
            <div className="relative" style={{ width: size, height: size }}>
                <svg width={size} height={size} className="-rotate-90">
                    <circle
                        cx={size / 2} cy={size / 2} r={radius}
                        fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={strokeWidth}
                    />
                    <motion.circle
                        cx={size / 2} cy={size / 2} r={radius}
                        fill="none" stroke={color} strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset: offset }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <motion.span
                        className="text-lg font-black"
                        style={{ color }}
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 }}
                    >
                        {score}
                    </motion.span>
                </div>
            </div>
            {label && <span className="text-[9px] font-bold uppercase tracking-widest text-white/30">{label}</span>}
        </div>
    );
}

function ScoreBar({ score, label, icon: Icon }) {
    const color = score >= 7 ? "bg-emerald-500" : score >= 4 ? "bg-amber-500" : "bg-red-500";
    const textColor = score >= 7 ? "text-emerald-500" : score >= 4 ? "text-amber-500" : "text-red-500";

    return (
        <div className="flex items-center gap-3">
            <Icon className={cn("w-3.5 h-3.5", textColor)} />
            <div className="flex-1">
                <div className="flex justify-between mb-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-white/50">{label}</span>
                    <span className={cn("text-[10px] font-bold", textColor)}>{score}/10</span>
                </div>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                        className={cn("h-full rounded-full", color)}
                        initial={{ width: 0 }}
                        animate={{ width: `${score * 10}%` }}
                        transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                    />
                </div>
            </div>
        </div>
    );
}

export default function PromptAnalysis({ analysis, loading, onSuggestionClick }) {
    const [expanded, setExpanded] = useState(true);

    if (!analysis && !loading) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6 border-white/5"
        >
            {/* Header */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between mb-4"
            >
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-violet-500/20">
                        <Brain className="w-4 h-4 text-violet-400" />
                    </div>
                    <h3 className="text-sm font-bold uppercase tracking-wider">Prompt Analysis</h3>
                    {analysis && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/40 font-medium">
                            by GLM-5.1
                        </span>
                    )}
                </div>
                <motion.div animate={{ rotate: expanded ? 180 : 0 }}>
                    <TrendingUp className="w-4 h-4 text-white/30" />
                </motion.div>
            </button>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-10 gap-3">
                                <div className="relative">
                                    <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
                                    <div className="absolute inset-0 bg-violet-500/20 blur-xl animate-pulse rounded-full" />
                                </div>
                                <p className="text-xs font-bold uppercase tracking-widest text-violet-400/60">
                                    GLM-5.1 analyzing...
                                </p>
                            </div>
                        ) : analysis ? (
                            <div className="flex flex-col gap-5">
                                {/* Main Score + Sub Scores */}
                                <div className="flex items-start gap-6">
                                    <ScoreRing score={analysis.score} size={80} strokeWidth={5} label="Overall" />
                                    <div className="flex-1 flex flex-col gap-2.5">
                                        <ScoreBar score={analysis.clarity} label="Clarity" icon={CATEGORY_ICONS.clarity} />
                                        <ScoreBar score={analysis.specificity} label="Specificity" icon={CATEGORY_ICONS.specificity} />
                                        <ScoreBar score={analysis.composition} label="Composition" icon={CATEGORY_ICONS.composition} />
                                        <ScoreBar score={analysis.mood} label="Mood" icon={CATEGORY_ICONS.mood} />
                                    </div>
                                </div>

                                {/* Summary */}
                                {analysis.summary && (
                                    <p className="text-xs text-white/50 leading-relaxed italic border-l-2 border-violet-500/30 pl-3">
                                        {analysis.summary}
                                    </p>
                                )}

                                {/* Suggestions */}
                                {analysis.suggestions?.length > 0 && (
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center gap-1.5 text-white/30">
                                            <Lightbulb className="w-3 h-3" />
                                            <span className="text-[10px] font-bold uppercase tracking-widest">Suggestions</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {analysis.suggestions.map((s, i) => (
                                                <motion.button
                                                    key={i}
                                                    initial={{ opacity: 0, scale: 0.8 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    transition={{ delay: i * 0.1 }}
                                                    onClick={() => onSuggestionClick?.(s)}
                                                    className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 hover:border-violet-500/30 hover:bg-violet-500/10 transition-all text-xs"
                                                    title={s.text}
                                                >
                                                    <span className="text-[9px] font-bold uppercase text-violet-400/60 group-hover:text-violet-400">
                                                        {s.category}
                                                    </span>
                                                    <span className="text-white/60 group-hover:text-white/90">{s.chip}</span>
                                                </motion.button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : null}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

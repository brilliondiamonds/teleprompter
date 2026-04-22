"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
    X, Clapperboard, FileText, Film, Play, Download,
    Loader2, AlertCircle, Sparkles, Video, Settings2,
    ChevronRight, RotateCcw,
} from "lucide-react";
import { useVideoStore } from "@/store/useVideoStore";
import { cn } from "@/lib/utils";
import VideoTimeline from "./VideoTimeline";

const PHASES = [
    { id: "scripting", label: "Script", icon: FileText, desc: "Generate scene breakdown" },
    { id: "generating", label: "Generate", icon: Film, desc: "AI video creation" },
    { id: "composing", label: "Timeline", icon: Clapperboard, desc: "Review & arrange" },
    { id: "done", label: "Export", icon: Download, desc: "Download your scenes" },
];

function getActiveStep(phase) {
    switch (phase) {
        case "idle": return -1;
        case "scripting": return 0;
        case "generating": return 1;
        case "composing": return 2;
        case "done": return 3;
        default: return -1;
    }
}

export default function VideoStudio() {
    const {
        isStudioOpen,
        closeStudio,
        workflowPhase,
        scenes,
        error,
        sourcePrompt,
        generateScript,
        startVideoGeneration,
        regenerateFailed,
        reset,
        clearError,
        settings,
    } = useVideoStore();

    if (!isStudioOpen) return null;

    const activeStep = getActiveStep(workflowPhase);
    const doneCount = scenes.filter((s) => s.status === "done").length;
    const totalDuration = scenes.reduce((sum, s) => sum + (s.duration || 0), 0);

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="video-studio-overlay fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-md"
            >
                {/* ─── Header ──────────────────────────────────────────────── */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/40 backdrop-blur-xl">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/20">
                            <Video className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
                                    Video Studio
                                </span>
                                <span className="text-xs font-medium text-white/20 bg-white/5 px-2 py-0.5 rounded-md">
                                    CogVideoX
                                </span>
                            </h2>
                            <p className="text-white/30 text-xs">
                                {scenes.length > 0
                                    ? `${scenes.length} scenes · ${totalDuration}s total · ${doneCount}/${scenes.length} ready`
                                    : "Transform your prompt into a cinematic video sequence"}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={closeStudio}
                        className="p-2.5 rounded-xl hover:bg-white/10 text-white/40 hover:text-white transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* ─── Stepper ─────────────────────────────────────────────── */}
                {activeStep >= 0 && (
                    <div className="px-6 py-3 border-b border-white/5 bg-white/[0.02]">
                        <div className="flex items-center gap-2 max-w-3xl mx-auto">
                            {PHASES.map((phase, idx) => {
                                const PhaseIcon = phase.icon;
                                const isActive = idx === activeStep;
                                const isCompleted = idx < activeStep;

                                return (
                                    <div key={phase.id} className="flex items-center gap-2 flex-1">
                                        <button
                                            className={cn(
                                                "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all border flex-1",
                                                isActive
                                                    ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                                                    : isCompleted
                                                        ? "bg-emerald-500/5 border-emerald-500/15 text-emerald-500/50"
                                                        : "bg-white/[0.02] border-white/5 text-white/20"
                                            )}
                                        >
                                            {isActive ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : isCompleted ? (
                                                <phase.icon className="w-3.5 h-3.5" />
                                            ) : (
                                                <PhaseIcon className="w-3.5 h-3.5" />
                                            )}
                                            <span className="uppercase tracking-wider">{phase.label}</span>
                                        </button>
                                        {idx < PHASES.length - 1 && (
                                            <ChevronRight className="w-4 h-4 text-white/10 flex-shrink-0" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ─── Main Content ────────────────────────────────────────── */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="max-w-7xl mx-auto">
                        {/* Error Display */}
                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="mb-6 flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
                                >
                                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                    <span className="flex-1">{error}</span>
                                    <button
                                        onClick={clearError}
                                        className="text-xs font-bold underline hover:text-red-300 transition-colors"
                                    >
                                        Dismiss
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* ─── IDLE: Source prompt review + Generate button ─── */}
                        {workflowPhase === "idle" && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex flex-col items-center justify-center py-16 gap-8"
                            >
                                <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                    <Clapperboard className="w-10 h-10 text-emerald-400" />
                                </div>

                                <div className="text-center max-w-lg">
                                    <h3 className="text-2xl font-bold mb-2">Ready to Direct?</h3>
                                    <p className="text-white/40 text-sm leading-relaxed">
                                        GLM-5.1 will transform your prompt into a cinematic script with 4-6 scenes.
                                        Each scene gets a unique CogVideoX video generation prompt with camera movements,
                                        lighting, and transitions.
                                    </p>
                                </div>

                                {/* Source Prompt Preview */}
                                {sourcePrompt && (
                                    <div className="glass-card p-5 max-w-xl w-full border-emerald-500/10">
                                        <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/60 mb-3">
                                            Source Prompt
                                        </div>
                                        <p className="text-sm text-white/60 leading-relaxed font-mono line-clamp-4">
                                            {sourcePrompt}
                                        </p>
                                    </div>
                                )}

                                <button
                                    onClick={generateScript}
                                    disabled={!sourcePrompt}
                                    className={cn(
                                        "flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300",
                                        sourcePrompt
                                            ? "bg-emerald-500 hover:bg-emerald-400 text-white shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:shadow-[0_0_40px_rgba(16,185,129,0.4)] active:scale-95"
                                            : "bg-white/5 text-white/20 cursor-not-allowed"
                                    )}
                                >
                                    <Sparkles className="w-6 h-6" />
                                    Generate Script
                                </button>
                            </motion.div>
                        )}

                        {/* ─── SCRIPTING: Loading state ─── */}
                        {workflowPhase === "scripting" && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex flex-col items-center justify-center py-32 gap-6"
                            >
                                <div className="relative">
                                    <Loader2 className="w-16 h-16 text-emerald-400 animate-spin" />
                                    <div className="absolute inset-0 bg-emerald-400/20 blur-xl animate-pulse rounded-full" />
                                </div>
                                <div className="text-center">
                                    <p className="text-emerald-400 font-bold uppercase tracking-widest text-sm mb-2">
                                        Writing Your Script
                                    </p>
                                    <p className="text-white/30 text-xs">
                                        GLM-5.1 is crafting scenes with camera movements and transitions...
                                    </p>
                                </div>
                            </motion.div>
                        )}

                        {/* ─── GENERATING: Progress view ─── */}
                        {workflowPhase === "generating" && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex flex-col gap-8"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-bold">Generating Videos</h3>
                                        <p className="text-white/30 text-xs mt-1">
                                            {doneCount}/{scenes.length} scenes completed · CogVideoX is rendering...
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-bold text-emerald-400">{doneCount}</div>
                                        <div className="text-[10px] text-white/30 uppercase tracking-widest">of {scenes.length}</div>
                                    </div>
                                </div>

                                {/* Progress grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {scenes.map((scene, idx) => {
                                        const PhaseIcon = scene.status === "generating" ? Loader2 :
                                            scene.status === "done" ? Film :
                                                scene.status === "error" ? AlertCircle : Film;
                                        return (
                                            <div key={scene.id} className={cn(
                                                "glass-card p-4 flex items-center gap-4 border transition-all",
                                                scene.status === "generating" && "border-amber-500/20 bg-amber-500/[0.02]",
                                                scene.status === "done" && "border-emerald-500/20 bg-emerald-500/[0.02]",
                                                scene.status === "error" && "border-red-500/20 bg-red-500/[0.02]",
                                            )}>
                                                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 border border-white/10">
                                                    <PhaseIcon className={cn(
                                                        "w-5 h-5",
                                                        scene.status === "generating" && "text-amber-400 animate-spin",
                                                        scene.status === "done" && "text-emerald-400",
                                                        scene.status === "error" && "text-red-400",
                                                        scene.status === "pending" && "text-white/20",
                                                    )} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold truncate">{scene.title}</p>
                                                    <p className="text-[10px] text-white/30 uppercase">
                                                        {scene.status} {scene.status === "generating" && `· ${scene.progress}%`}
                                                    </p>
                                                </div>
                                                {scene.status === "generating" && (
                                                    <div className="w-12 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                        <motion.div
                                                            className="h-full bg-amber-500 rounded-full"
                                                            initial={{ width: "0%" }}
                                                            animate={{ width: `${scene.progress}%` }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        )}

                        {/* ─── COMPOSING: Timeline editor ─── */}
                        {workflowPhase === "composing" && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex flex-col gap-6"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-bold">Timeline Composer</h3>
                                        <p className="text-white/30 text-xs mt-1">
                                            Review your scenes, drag to reorder, then generate videos.
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={reset}
                                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/40 text-xs font-bold hover:bg-white/10 hover:text-white/60 transition-all"
                                        >
                                            <RotateCcw className="w-3.5 h-3.5" /> Reset
                                        </button>
                                        <button
                                            onClick={startVideoGeneration}
                                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm shadow-[0_0_20px_rgba(16,185,129,0.3)] active:scale-95 transition-all"
                                        >
                                            <Film className="w-4 h-4" />
                                            Generate All Videos
                                        </button>
                                    </div>
                                </div>

                                {/* Scene cards grid for review */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {scenes.map((scene, idx) => (
                                        <div key={scene.id} className="glass-card p-4 border-emerald-500/10">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs font-bold">
                                                    {idx + 1}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-sm font-bold truncate">{scene.title}</h4>
                                                    <div className="flex items-center gap-2 text-[10px] text-white/30">
                                                        <span className="uppercase">{scene.mood}</span>
                                                        <span>·</span>
                                                        <span>{scene.duration}s</span>
                                                        <span>·</span>
                                                        <span className="uppercase">{scene.transition}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <p className="text-xs text-white/40 leading-relaxed line-clamp-3 mb-3">
                                                {scene.description}
                                            </p>
                                            <details className="group">
                                                <summary className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/60 cursor-pointer hover:text-emerald-400/80">
                                                    View Visual Prompt
                                                </summary>
                                                <p className="mt-2 text-[11px] text-white/30 leading-relaxed font-mono bg-black/30 p-3 rounded-xl">
                                                    {scene.visualPrompt}
                                                </p>
                                            </details>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* ─── DONE: Timeline with video previews ─── */}
                        {workflowPhase === "done" && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex flex-col gap-6"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-bold flex items-center gap-2">
                                            🎬 Video Complete
                                            <span className="text-emerald-400">
                                                {doneCount}/{scenes.length} scenes ready
                                            </span>
                                        </h3>
                                        <p className="text-white/30 text-xs mt-1">
                                            Total duration: {totalDuration}s · Drag scenes to reorder
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={regenerateFailed}
                                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/40 text-xs font-bold hover:bg-white/10 transition-all"
                                        >
                                            <RotateCcw className="w-3.5 h-3.5" /> Regenerate Failed
                                        </button>
                                    </div>
                                </div>

                                <VideoTimeline />

                                {/* Download All */}
                                {doneCount > 0 && (
                                    <div className="flex items-center justify-center gap-4 py-8">
                                        <p className="text-white/30 text-sm">
                                            Download individual scenes from their cards, or compose them externally.
                                        </p>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </div>
                </div>

                {/* ─── Footer with status ─── */}
                <div className="px-6 py-3 border-t border-white/5 bg-black/40 backdrop-blur-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "w-2 h-2 rounded-full",
                            workflowPhase === "idle" && "bg-white/20",
                            workflowPhase === "scripting" && "bg-violet-500 animate-pulse",
                            workflowPhase === "generating" && "bg-amber-500 animate-pulse",
                            (workflowPhase === "composing" || workflowPhase === "done") && "bg-emerald-500"
                        )} />
                        <span className="text-xs text-white/30 font-medium uppercase tracking-wider">
                            {workflowPhase === "idle" && "Ready"}
                            {workflowPhase === "scripting" && "Generating script via GLM-5.1..."}
                            {workflowPhase === "generating" && `Rendering via CogVideoX · ${doneCount}/${scenes.length}`}
                            {workflowPhase === "composing" && "Review & generate"}
                            {workflowPhase === "done" && "Complete"}
                        </span>
                    </div>
                    <span className="text-[10px] text-white/20 font-bold">
                        Model: {settings.model} · {settings.resolution}
                    </span>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}

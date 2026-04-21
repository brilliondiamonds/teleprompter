"use client";

import { motion } from "framer-motion";
import {
    Play, Download, RotateCcw, Loader2, AlertCircle,
    Film, Clock, Palette, CheckCircle2, XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function SceneCard({ scene, onRegenerate, onPreview, index }) {
    const isDone = scene.status === "done";
    const isGenerating = scene.status === "generating";
    const isError = scene.status === "error";
    const isPending = scene.status === "pending";

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={cn(
                "scene-card relative overflow-hidden rounded-2xl border transition-all duration-300",
                isDone && "border-emerald-500/30 bg-emerald-500/5",
                isGenerating && "border-amber-500/30 bg-amber-500/5",
                isError && "border-red-500/30 bg-red-500/5",
                isPending && "border-white/10 bg-white/[0.02]"
            )}
        >
            {/* Scene Number Badge */}
            <div className="absolute top-3 left-3 z-20">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-sm border border-white/10 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                    <Film className="w-3 h-3" />
                    {index + 1}
                </span>
            </div>

            {/* Status Badge */}
            <div className="absolute top-3 right-3 z-20">
                {isDone && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/20 backdrop-blur-sm border border-emerald-500/30 text-[10px] font-bold text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" /> Done
                    </span>
                )}
                {isGenerating && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/20 backdrop-blur-sm border border-amber-500/30 text-[10px] font-bold text-amber-400">
                        <Loader2 className="w-3 h-3 animate-spin" /> {scene.progress}%
                    </span>
                )}
                {isError && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/20 backdrop-blur-sm border border-red-500/30 text-[10px] font-bold text-red-400">
                        <XCircle className="w-3 h-3" /> Error
                    </span>
                )}
                {isPending && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 backdrop-blur-sm border border-white/10 text-[10px] font-bold text-white/40">
                        Pending
                    </span>
                )}
            </div>

            {/* Video Preview Area */}
            <div className="aspect-video relative bg-black/40">
                {isDone && scene.videoUrl ? (
                    <video
                        src={scene.videoUrl}
                        className="w-full h-full object-cover"
                        muted
                        loop
                        playsInline
                        poster={scene.thumbnailUrl || undefined}
                    />
                ) : isGenerating ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                        <div className="relative">
                            <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
                            <div className="absolute inset-0 bg-amber-400/20 blur-xl animate-pulse rounded-full" />
                        </div>
                        <span className="text-amber-400/80 text-xs font-bold uppercase tracking-widest">
                            Generating...
                        </span>
                        {/* Progress bar */}
                        <div className="w-3/4 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full"
                                initial={{ width: "0%" }}
                                animate={{ width: `${scene.progress}%` }}
                                transition={{ duration: 0.5 }}
                            />
                        </div>
                    </div>
                ) : isError ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                        <AlertCircle className="w-10 h-10 text-red-400" />
                        <span className="text-red-400/80 text-xs font-bold text-center px-4">
                            {scene.error || "Generation failed"}
                        </span>
                    </div>
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Film className="w-12 h-12 text-white/10" />
                    </div>
                )}
            </div>

            {/* Scene Info */}
            <div className="p-4 flex flex-col gap-2">
                <h3 className="text-sm font-bold text-white/90 truncate">{scene.title}</h3>
                <p className="text-xs text-white/40 line-clamp-2 leading-relaxed">{scene.description}</p>

                {/* Metadata row */}
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-[10px] text-white/30 font-medium">
                        <Clock className="w-3 h-3" /> {scene.duration}s
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] text-white/30 font-medium capitalize">
                        <Palette className="w-3 h-3" /> {scene.mood}
                    </span>
                    <span className="text-[10px] text-white/20 font-medium uppercase bg-white/5 px-2 py-0.5 rounded">
                        {scene.transition}
                    </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/5">
                    {isDone && scene.videoUrl && (
                        <>
                            <button
                                onClick={() => onPreview?.(scene)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold hover:bg-emerald-500/20 transition-all"
                            >
                                <Play className="w-3 h-3" /> Preview
                            </button>
                            <a
                                href={scene.videoUrl}
                                download={`teleprompter-scene-${scene.id}.mp4`}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/50 text-[11px] font-bold hover:bg-white/10 transition-all"
                            >
                                <Download className="w-3 h-3" /> Download
                            </a>
                        </>
                    )}
                    {(isError || isDone) && (
                        <button
                            onClick={() => onRegenerate?.(scene.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/50 text-[11px] font-bold hover:bg-amber-500/10 hover:text-amber-400 hover:border-amber-500/20 transition-all"
                        >
                            <RotateCcw className="w-3 h-3" /> Regenerate
                        </button>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

"use client";

import { AnimatePresence, motion, Reorder } from "framer-motion";
import {
    ArrowRight, GripVertical, Trash2,
} from "lucide-react";
import { useVideoStore } from "@/store/useVideoStore";
import { cn } from "@/lib/utils";
import SceneCard from "./SceneCard";

const TRANSITION_ICONS = {
    fade: "🌅",
    cut: "✂️",
    dissolve: "💫",
    wipe: "➡️",
};

export default function VideoTimeline() {
    const { scenes, reorderScenes, removeScene, regenerateScene, workflowPhase } = useVideoStore();

    const handleReorder = (newOrder) => {
        reorderScenes(newOrder);
    };

    const handlePreview = (scene) => {
        // Play video inline — find the video element and toggle play
        const videoEls = document.querySelectorAll(`video[src="${scene.videoUrl}"]`);
        videoEls.forEach((el) => {
            if (el.paused) {
                el.play().catch(() => {});
            } else {
                el.pause();
            }
        });
    };

    if (scenes.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 opacity-30">
                <p className="text-sm italic">Generate a script to see scenes here.</p>
            </div>
        );
    }

    return (
        <div className="w-full">
            {/* Timeline Strip — horizontal scrollable area */}
            <div className="timeline-strip overflow-x-auto pb-4">
                <Reorder.Group
                    axis="x"
                    values={scenes}
                    onReorder={handleReorder}
                    className="flex gap-4 min-w-max px-2"
                >
                    <AnimatePresence mode="popLayout">
                        {scenes.map((scene, idx) => (
                            <Reorder.Item
                                key={scene.id}
                                value={scene}
                                className="flex items-center gap-4"
                            >
                                {/* Scene Card */}
                                <div className="w-[280px] flex-shrink-0 relative group/card">
                                    {/* Drag Handle */}
                                    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 opacity-0 group-hover/card:opacity-100 transition-opacity">
                                        <div className="cursor-grab active:cursor-grabbing p-1 rounded bg-black/60 backdrop-blur-sm border border-white/10">
                                            <GripVertical className="w-4 h-4 text-white/40" />
                                        </div>
                                    </div>

                                    {/* Remove button */}
                                    {workflowPhase !== "generating" && (
                                        <button
                                            onClick={() => removeScene(scene.id)}
                                            className="absolute top-2 right-2 z-30 p-1 rounded-lg bg-black/60 backdrop-blur-sm border border-white/10 text-white/30 hover:text-red-400 hover:border-red-500/30 opacity-0 group-hover/card:opacity-100 transition-all"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    )}

                                    <SceneCard
                                        scene={scene}
                                        index={idx}
                                        onRegenerate={regenerateScene}
                                        onPreview={handlePreview}
                                    />
                                </div>

                                {/* Transition Indicator */}
                                {idx < scenes.length - 1 && (
                                    <div className="flex flex-col items-center gap-1 flex-shrink-0">
                                        <span className="text-lg">
                                            {TRANSITION_ICONS[scenes[idx + 1]?.transition] || "→"}
                                        </span>
                                        <span className="text-[9px] font-bold uppercase tracking-widest text-white/20">
                                            {scenes[idx + 1]?.transition || "cut"}
                                        </span>
                                        <ArrowRight className="w-4 h-4 text-white/10" />
                                    </div>
                                )}
                            </Reorder.Item>
                        ))}
                    </AnimatePresence>
                </Reorder.Group>
            </div>
        </div>
    );
}

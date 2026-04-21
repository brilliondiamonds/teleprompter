import { create } from "zustand";
import { generateVideoScript } from "@/lib/video-script";

export const useVideoStore = create((set, get) => ({
    // Workflow state
    workflowPhase: "idle", // "idle" | "scripting" | "generating" | "composing" | "done"
    scenes: [],
    settings: {
        model: "cogvideox-2",
        resolution: "1280x720",
        durationPerScene: 6,
    },
    isStudioOpen: false,
    sourcePrompt: "",
    error: null,

    // ─── Studio Management ─────────────────────────────────────────────────

    openStudio: (prompt) => {
        set({
            isStudioOpen: true,
            sourcePrompt: prompt || "",
            workflowPhase: "idle",
            scenes: [],
            error: null,
        });
    },

    closeStudio: () => {
        set({
            isStudioOpen: false,
            workflowPhase: "idle",
            scenes: [],
            sourcePrompt: "",
            error: null,
        });
    },

    reset: () => {
        set({
            workflowPhase: "idle",
            scenes: [],
            sourcePrompt: "",
            error: null,
        });
    },

    // ─── Script Generation ─────────────────────────────────────────────────

    generateScript: async () => {
        const { sourcePrompt } = get();
        if (!sourcePrompt) return;

        set({ workflowPhase: "scripting", error: null });

        try {
            const scenes = await generateVideoScript(sourcePrompt);

            // Add runtime state to each scene
            const scenesWithState = scenes.map((scene) => ({
                ...scene,
                status: "pending",
                videoUrl: null,
                thumbnailUrl: null,
                jobId: null,
                error: null,
                progress: 0,
            }));

            set({
                scenes: scenesWithState,
                workflowPhase: "composing", // Ready for user to review and generate
            });
        } catch (err) {
            console.error("Script Generation Error:", err);
            set({
                error: err.message || "Failed to generate video script.",
                workflowPhase: "idle",
            });
        }
    },

    // ─── Video Generation ──────────────────────────────────────────────────

    startVideoGeneration: async () => {
        const { scenes, settings } = get();
        if (scenes.length === 0) return;

        set({ workflowPhase: "generating", error: null });

        // Submit all scenes in parallel
        const promises = scenes.map(async (scene, index) => {
            try {
                // Update scene to generating
                set((state) => ({
                    scenes: state.scenes.map((s) =>
                        s.id === scene.id ? { ...s, status: "generating", progress: 10 } : s
                    ),
                }));

                // Submit job via API route
                const submitResponse = await fetch("/api/video/generate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        prompt: scene.visualPrompt,
                        model: settings.model,
                        duration: scene.duration,
                        size: settings.resolution,
                    }),
                });

                const submitData = await submitResponse.json();

                if (!submitResponse.ok || submitData.error) {
                    throw new Error(submitData.error || "Failed to submit video job.");
                }

                const jobId = submitData.jobId;

                // Store the job ID
                set((state) => ({
                    scenes: state.scenes.map((s) =>
                        s.id === scene.id ? { ...s, jobId, progress: 20 } : s
                    ),
                }));

                // Poll for completion
                const videoUrl = await pollSceneStatus(scene.id, jobId);

                // Update scene with result
                set((state) => ({
                    scenes: state.scenes.map((s) =>
                        s.id === scene.id
                            ? { ...s, status: "done", videoUrl, progress: 100 }
                            : s
                    ),
                }));

                return { id: scene.id, success: true };
            } catch (err) {
                console.error(`Scene ${scene.id} error:`, err);
                set((state) => ({
                    scenes: state.scenes.map((s) =>
                        s.id === scene.id
                            ? { ...s, status: "error", error: err.message, progress: 0 }
                            : s
                    ),
                }));
                return { id: scene.id, success: false, error: err.message };
            }
        });

        const results = await Promise.allSettled(promises);

        // Check if all done
        const { scenes: updatedScenes } = get();
        const allDone = updatedScenes.every((s) => s.status === "done");
        const anySuccess = updatedScenes.some((s) => s.status === "done");

        if (allDone) {
            set({ workflowPhase: "done" });
        } else if (anySuccess) {
            set({ workflowPhase: "composing" });
        }
    },

    // ─── Scene Management ──────────────────────────────────────────────────

    regenerateScene: async (sceneId) => {
        const { scenes, settings } = get();
        const scene = scenes.find((s) => s.id === sceneId);
        if (!scene) return;

        // Reset scene state
        set((state) => ({
            scenes: state.scenes.map((s) =>
                s.id === sceneId
                    ? { ...s, status: "generating", videoUrl: null, jobId: null, error: null, progress: 10 }
                    : s
            ),
        }));

        try {
            const submitResponse = await fetch("/api/video/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prompt: scene.visualPrompt,
                    model: settings.model,
                    duration: scene.duration,
                    size: settings.resolution,
                }),
            });

            const submitData = await submitResponse.json();

            if (!submitResponse.ok || submitData.error) {
                throw new Error(submitData.error || "Failed to submit video job.");
            }

            set((state) => ({
                scenes: state.scenes.map((s) =>
                    s.id === sceneId ? { ...s, jobId: submitData.jobId, progress: 20 } : s
                ),
            }));

            const videoUrl = await pollSceneStatus(sceneId, submitData.jobId);

            set((state) => ({
                scenes: state.scenes.map((s) =>
                    s.id === sceneId
                        ? { ...s, status: "done", videoUrl, progress: 100 }
                        : s
                ),
            }));
        } catch (err) {
            set((state) => ({
                scenes: state.scenes.map((s) =>
                    s.id === sceneId
                        ? { ...s, status: "error", error: err.message, progress: 0 }
                        : s
                ),
            }));
        }
    },

    removeScene: (sceneId) => {
        set((state) => ({
            scenes: state.scenes.filter((s) => s.id !== sceneId),
        }));
    },

    reorderScenes: (newOrder) => {
        set({ scenes: newOrder });
    },

    updateScene: (sceneId, updates) => {
        set((state) => ({
            scenes: state.scenes.map((s) =>
                s.id === sceneId ? { ...s, ...updates } : s
            ),
        }));
    },
}));

/**
 * Poll a scene's video generation status until done
 * Extracted as a standalone function so both startVideoGeneration and regenerateScene can use it
 */
async function pollSceneStatus(sceneId, jobId) {
    const POLL_INTERVAL = 5000; // 5 seconds
    const MAX_POLLS = 120; // 10 minutes max
    let pollCount = 0;

    while (pollCount < MAX_POLLS) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL));
        pollCount++;

        try {
            const statusResponse = await fetch(`/api/video/status/${jobId}`);
            const statusData = await statusResponse.json();

            if (statusData.error && statusData.status !== "failed") {
                // Network error, keep trying
                continue;
            }

            // Update progress based on poll count
            const progressEstimate = Math.min(20 + pollCount * 5, 90);
            useVideoStore.setState((state) => ({
                scenes: state.scenes.map((s) =>
                    s.id === sceneId ? { ...s, progress: progressEstimate } : s
                ),
            }));

            if (statusData.status === "completed" && statusData.videoUrl) {
                return statusData.videoUrl;
            }

            if (statusData.status === "failed") {
                throw new Error(statusData.error || "Video generation failed.");
            }
        } catch (err) {
            // If it's our own "failed" error, re-throw
            if (err.message && !err.message.includes("fetch")) {
                throw err;
            }
            // Network errors: keep polling
            continue;
        }
    }

    throw new Error("Video generation timed out.");
}

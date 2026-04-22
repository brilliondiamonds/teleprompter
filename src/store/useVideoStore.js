import { create } from "zustand";
import { generateVideoScript } from "@/lib/video-script";
import { classifyError } from "@/lib/errors";

// ─── Polling Configuration ──────────────────────────────────────────────────
const POLL_INTERVAL_MS = 5000;
const MAX_POLL_ATTEMPTS = 120;

/**
 * Video Store — acts as Controller + ViewModel in MVC.
 *  - Model: Scene data + workflow state
 *  - Controller: Orchestrates script generation, video generation, polling
 *  - ViewModel: Provides derived state for the View layer
 */
export const useVideoStore = create((set, get) => ({
    // ─── State (Model) ──────────────────────────────────────────────────────
    workflowPhase: "idle",
    scenes: [],
    settings: {
        model: "cogvideox-2",
        resolution: "1280x720",
        durationPerScene: 6,
    },
    isStudioOpen: false,
    sourcePrompt: "",
    error: null,

    // ─── Studio Lifecycle ───────────────────────────────────────────────────

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
            sourcePrompt: get().sourcePrompt,
            error: null,
        });
    },

    clearError: () => {
        set({ error: null });
    },

    // ─── Script Generation (Controller) ─────────────────────────────────────

    generateScript: async () => {
        const { sourcePrompt } = get();
        if (!sourcePrompt?.trim()) {
            set({ error: "No prompt provided. Write a prompt first." });
            return;
        }

        set({ workflowPhase: "scripting", error: null });

        try {
            const scenes = await generateVideoScript(sourcePrompt);

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
                workflowPhase: "composing",
            });
        } catch (err) {
            const classified = classifyError(err);
            set({
                error: `Script generation failed: ${classified.message}`,
                workflowPhase: "idle",
            });
        }
    },

    // ─── Video Generation (Controller) ──────────────────────────────────────

    startVideoGeneration: async () => {
        const { scenes } = get();
        if (scenes.length === 0) {
            set({ error: "No scenes to generate. Create a script first." });
            return;
        }

        set({ workflowPhase: "generating", error: null });

        const results = await Promise.allSettled(
            scenes.map((scene) => generateSingleScene(scene, set, get))
        );

        const { scenes: updatedScenes } = get();
        const allDone = updatedScenes.every((s) => s.status === "done");
        const anyDone = updatedScenes.some((s) => s.status === "done");
        const allFailed = updatedScenes.every((s) => s.status === "error");

        if (allDone) {
            set({ workflowPhase: "done" });
        } else if (allFailed) {
            set({
                workflowPhase: "composing",
                error: "All scenes failed to generate. Check your API key and try again.",
            });
        } else if (anyDone) {
            set({ workflowPhase: "composing" });
        }
    },

    regenerateScene: async (sceneId) => {
        const { scenes } = get();
        const scene = scenes.find((s) => s.id === sceneId);
        if (!scene) {
            set({ error: `Scene ${sceneId} not found.` });
            return;
        }

        set((state) => ({
            scenes: state.scenes.map((s) =>
                s.id === sceneId
                    ? { ...s, status: "generating", videoUrl: null, jobId: null, error: null, progress: 10 }
                    : s
            ),
            error: null,
        }));

        try {
            await generateSingleScene({ ...scene, status: "generating", progress: 10 }, set, get);
        } catch (err) {
            const classified = classifyError(err);
            set((state) => ({
                scenes: state.scenes.map((s) =>
                    s.id === sceneId
                        ? { ...s, status: "error", error: classified.message, progress: 0 }
                        : s
                ),
            }));
        }
    },

    regenerateFailed: async () => {
        const { scenes } = get();
        const failedScenes = scenes.filter((s) => s.status === "error");
        if (failedScenes.length === 0) return;

        set({ workflowPhase: "generating", error: null });

        // Reset failed scenes to generating
        set((state) => ({
            scenes: state.scenes.map((s) =>
                s.status === "error"
                    ? { ...s, status: "generating", videoUrl: null, jobId: null, error: null, progress: 10 }
                    : s
            ),
        }));

        const updatedScenes = get().scenes.filter((s) => s.status === "generating");
        await Promise.allSettled(
            updatedScenes.map((scene) => generateSingleScene(scene, set, get))
        );

        const { scenes: finalScenes } = get();
        const allDone = finalScenes.every((s) => s.status === "done");
        if (allDone) {
            set({ workflowPhase: "done" });
        } else {
            set({ workflowPhase: "composing" });
        }
    },

    // ─── Scene Management ──────────────────────────────────────────────────

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

// ─── Private: Scene Generation Logic ─────────────────────────────────────────

async function generateSingleScene(scene, set, get) {
    const { settings } = get();

    try {
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
            throw new Error(submitData.error || `Server error (${submitResponse.status})`);
        }

        const jobId = submitData.jobId;

        // Update with job ID
        set((state) => ({
            scenes: state.scenes.map((s) =>
                s.id === scene.id ? { ...s, jobId, progress: 20 } : s
            ),
        }));

        // Poll until complete
        const videoUrl = await pollSceneStatus(scene.id, jobId, set);

        // Mark as done
        set((state) => ({
            scenes: state.scenes.map((s) =>
                s.id === scene.id
                    ? { ...s, status: "done", videoUrl, progress: 100 }
                    : s
            ),
        }));

        return { id: scene.id, success: true };
    } catch (err) {
        const classified = classifyError(err);
        set((state) => ({
            scenes: state.scenes.map((s) =>
                s.id === scene.id
                    ? { ...s, status: "error", error: classified.message, progress: 0 }
                    : s
            ),
        }));
        throw err;
    }
}

async function pollSceneStatus(sceneId, jobId, set) {
    let attempts = 0;

    while (attempts < MAX_POLL_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        attempts++;

        try {
            const response = await fetch(`/api/video/status/${encodeURIComponent(jobId)}`);
            const data = await response.json();

            // If the response itself is an error (but not a "failed" status)
            if (!response.ok && data.status !== "failed") {
                // Transient server error — keep polling
                continue;
            }

            // Update progress estimate
            const progressEstimate = Math.min(20 + attempts * 5, 90);
            set((state) => ({
                scenes: state.scenes.map((s) =>
                    s.id === sceneId ? { ...s, progress: progressEstimate } : s
                ),
            }));

            if (data.status === "completed" && data.videoUrl) {
                return data.videoUrl;
            }

            if (data.status === "failed") {
                throw new Error(data.error || "Video generation failed on the server.");
            }
        } catch (err) {
            // Re-throw business logic errors (e.g. "failed")
            if (err.message && !err.message.includes("fetch") && !err.message.includes("NetworkError")) {
                throw err;
            }
            // Network errors — keep polling
            continue;
        }
    }

    throw new Error("Video generation timed out after 10 minutes.");
}

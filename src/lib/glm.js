/**
 * GLM Service Layer (Client)
 * All AI calls go through /api/glm — no direct third-party SDK usage.
 */
import { AppError, classifyError } from "./errors";

async function glmFetch(action, payload) {
    try {
        const response = await fetch("/api/glm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action, ...payload }),
        });

        const data = await response.json();

        if (!response.ok || data.error) {
            throw new AppError(data.error || `Server error (${response.status})`, { code: "GLM_ERROR" });
        }

        return data;
    } catch (err) {
        if (err instanceof AppError) throw err;
        const classified = classifyError(err);
        throw new AppError(classified.message, { code: classified.code });
    }
}

/**
 * Enhance a raw prompt string using GLM.
 */
export async function enhancePrompt(rawPrompt, { mode = "quick", targetModel = null } = {}) {
    if (!rawPrompt?.trim()) {
        throw new AppError("Prompt is empty.", { code: "VALIDATION_ERROR" });
    }
    return glmFetch("enhance", { prompt: rawPrompt, mode, targetModel });
}

/**
 * Analyze a prompt and return structured scoring.
 */
export async function analyzePrompt(prompt) {
    if (!prompt?.trim()) {
        throw new AppError("Prompt is empty.", { code: "VALIDATION_ERROR" });
    }
    return glmFetch("analyze", { prompt });
}

/**
 * Generate auto-pilot modules from a free-form description.
 */
export async function generateAutoPilotModules(emotionString) {
    if (!emotionString?.trim()) {
        throw new AppError("Input is empty.", { code: "VALIDATION_ERROR" });
    }
    return glmFetch("autopilot", { emotionString });
}

/**
 * Mutate unlocked modules while keeping locked ones.
 */
export async function mutateModules(lockedPayload, unlockedPayload) {
    return glmFetch("mutate", { lockedModules: lockedPayload, unlockedModules: unlockedPayload });
}

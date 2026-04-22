/**
 * Video Script Generation Service (Client)
 * Calls /api/video/script — no direct third-party SDK usage.
 */
import { AppError, ScriptGenerationError, classifyError } from "./errors";

/**
 * Generate a structured video script from a text prompt.
 * Returns an array of scene objects ready for video generation.
 */
export async function generateVideoScript(prompt) {
    if (!prompt?.trim()) {
        throw new AppError("Prompt is required for script generation.", { code: "VALIDATION_ERROR" });
    }

    try {
        const response = await fetch("/api/video/script", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt }),
        });

        const data = await response.json();

        if (!response.ok || data.error) {
            throw new ScriptGenerationError(data.error || `Server error (${response.status})`);
        }

        if (!data.scenes || !Array.isArray(data.scenes) || data.scenes.length === 0) {
            throw new ScriptGenerationError("No scenes were generated. Please try a different prompt.");
        }

        return data.scenes;
    } catch (err) {
        if (err instanceof ScriptGenerationError || err instanceof AppError) {
            throw err;
        }
        const classified = classifyError(err);
        throw new ScriptGenerationError(classified.message);
    }
}

/**
 * Video Script Generation Service
 * Uses GLM-5.1 via Puter.js to break a prompt into cinematic scenes.
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

    // Dynamic import guard — Puter is client-only
    if (typeof window === "undefined" || !window.puter?.ai) {
        throw new ScriptGenerationError("AI service is not available. Please reload the page.");
    }

    const systemPrompt = `You are a cinematic video scriptwriter using CogVideoX. Break the user's concept into 4-6 short scenes for AI video generation.

Return a JSON array where each scene has:
{
  "id": "scene_<number>",
  "title": "<short scene title>",
  "description": "<what happens in the scene, 1-2 sentences>",
  "visualPrompt": "<detailed visual description optimized for CogVideoX video generation, include camera movement, lighting, color, atmosphere>",
  "duration": <seconds, 4-8>,
  "mood": "<mood word>",
  "transition": "fade|cut|dissolve|wipe"
}

Guidelines for visualPrompt:
- Be extremely specific about visual details
- Include camera movements (slow pan, zoom in, tracking shot, etc.)
- Describe lighting conditions explicitly
- Include atmosphere and particle effects (dust, fog, rain, etc.)
- Each scene should flow naturally to the next
- Keep prompts under 200 words each

Return ONLY the JSON array, no markdown fences.`;

    try {
        const messages = [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
        ];

        const response = await window.puter.ai.chat(messages, { model: "glm-4" });

        const text = typeof response === "string"
            ? response
            : response?.message?.content || response?.text || response?.toString();

        if (!text) {
            throw new ScriptGenerationError("GLM returned an empty response for script generation.");
        }

        // Parse JSON, stripping code fences
        let cleaned = text.trim();
        const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (fenceMatch) {
            cleaned = fenceMatch[1].trim();
        }

        let scenes;
        try {
            scenes = JSON.parse(cleaned);
        } catch {
            throw new ScriptGenerationError("Failed to parse script from GLM response. Please try again.");
        }

        if (!Array.isArray(scenes) || scenes.length === 0) {
            throw new ScriptGenerationError("GLM returned no scenes. Please try a different prompt.");
        }

        // Validate each scene has required fields
        const requiredFields = ["id", "title", "description", "visualPrompt", "duration", "mood", "transition"];
        for (const scene of scenes) {
            for (const field of requiredFields) {
                if (!scene[field] && field !== "duration") {
                    console.warn(`[VideoScript] Scene ${scene.id || "unknown"} missing field: ${field}`);
                }
            }
            // Ensure id exists
            if (!scene.id) {
                scene.id = `scene_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
            }
            // Clamp duration
            scene.duration = Math.max(2, Math.min(10, Number(scene.duration) || 6));
        }

        return scenes;
    } catch (err) {
        if (err instanceof ScriptGenerationError || err instanceof AppError) {
            throw err;
        }
        const classified = classifyError(err);
        throw new ScriptGenerationError(classified.message);
    }
}

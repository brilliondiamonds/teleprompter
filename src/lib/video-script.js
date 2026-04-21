/**
 * Video Script Generation Engine
 *
 * Uses GLM-5.1 via Puter.js to transform a prompt into a structured video script
 * with multiple scenes optimized for CogVideoX generation.
 */

import { retry, hashString } from "./utils";

const GLM_MODEL = "z-ai/glm-5.1";

// In-memory cache for generated scripts
const scriptCache = new Map();

const VIDEO_SCRIPT_SYSTEM_PROMPT = `You are a world-class Film Director and Screenwriter AI. Your task is to transform a visual concept into a compelling multi-scene video script optimized for AI video generation (CogVideoX).

OUTPUT FORMAT (strict JSON array, no markdown):
[
  {
    "id": "scene_1",
    "title": "Short scene title",
    "description": "Brief 1-2 sentence description of what happens in this scene",
    "visualPrompt": "A highly detailed, cinematic 50-100 word description optimized for CogVideoX video generation. Describe camera movements (slow pan, dolly in, tracking shot, crane shot, steadicam), the subject in vivid detail, lighting setup (golden hour, dramatic chiaroscuro, soft diffused), mood and atmosphere, color palette, depth of field, and any motion or action. Be specific and visual — every word should paint a frame.",
    "duration": 6,
    "transition": "fade|cut|dissolve|wipe",
    "mood": "descriptive mood word"
  }
]

RULES:
1. Generate exactly 4 to 6 scenes that form a coherent narrative arc: Opening → Development → Climax → Resolution.
2. Each "visualPrompt" MUST be 50-100 words of rich, cinematic description. Include:
   - Camera movement and angle (e.g., "slow dolly in from wide to medium close-up")
   - Subject description with specific visual details
   - Lighting quality and direction
   - Color palette and mood atmosphere
   - Any on-screen motion or action
3. Vary camera techniques across scenes — don't repeat the same shot type.
4. Ensure visual and emotional continuity between scenes.
5. Choose transitions that enhance the narrative flow:
   - "fade" for gentle transitions, openings, endings
   - "cut" for dynamic, energetic shifts
   - "dissolve" for dreamy, emotional passages
   - "wipe" for dramatic reveals
6. Keep each scene duration at 6 seconds.
7. Maintain a consistent mood/atmosphere while allowing each scene its own character.
8. Return ONLY the JSON array. No explanations, no markdown fencing.`;

/**
 * Wait for Puter.js to be loaded and ready
 */
async function waitForPuter(timeoutMs = 10000) {
    if (typeof window === "undefined") {
        throw new Error("Puter.js requires a browser environment.");
    }

    if (window.puter?.ai) return window.puter;

    return new Promise((resolve, reject) => {
        const start = Date.now();
        const interval = setInterval(() => {
            if (window.puter?.ai) {
                clearInterval(interval);
                resolve(window.puter);
            } else if (Date.now() - start > timeoutMs) {
                clearInterval(interval);
                reject(new Error("Puter.js not ready. Make sure you're connected to the internet."));
            }
        }, 300);
    });
}

/**
 * Generate a video script from a prompt
 * @param {string} prompt - The source prompt (enhanced or raw)
 * @returns {Promise<Array>} Array of scene objects
 */
export async function generateVideoScript(prompt) {
    if (!prompt || !prompt.trim()) {
        throw new Error("Prompt is empty. Build a prompt first.");
    }

    // Check cache
    const cacheKey = hashString(`video-script:${prompt}`);
    if (scriptCache.has(cacheKey)) {
        return scriptCache.get(cacheKey);
    }

    const scenes = await retry(async () => {
        const puter = await waitForPuter();

        const response = await puter.ai.chat(
            `Transform this visual concept into a cinematic video script with 4-6 scenes:\n\n"${prompt}"`,
            {
                model: GLM_MODEL,
                system: VIDEO_SCRIPT_SYSTEM_PROMPT,
            }
        );

        const content = response?.message?.content || response?.toString() || "";
        if (!content.trim()) throw new Error("GLM-5.1 returned an empty response.");

        let jsonStr = content.trim();
        const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) jsonStr = jsonMatch[1].trim();

        const parsed = JSON.parse(jsonStr);

        if (!Array.isArray(parsed) || parsed.length < 2) {
            throw new Error("Invalid script format — expected array of scenes.");
        }

        // Normalize scenes with defaults
        return parsed.map((scene, idx) => ({
            id: scene.id || `scene_${idx + 1}`,
            title: scene.title || `Scene ${idx + 1}`,
            description: scene.description || "",
            visualPrompt: scene.visualPrompt || scene.description || "",
            duration: scene.duration || 6,
            transition: scene.transition || (idx === 0 ? "fade" : "cut"),
            mood: scene.mood || "dramatic",
        }));
    }, { maxRetries: 2, baseDelay: 1500 });

    // Cache the result
    scriptCache.set(cacheKey, scenes);

    return scenes;
}

/**
 * Clear the script cache
 */
export function clearScriptCache() {
    scriptCache.clear();
}

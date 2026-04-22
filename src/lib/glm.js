/**
 * GLM-5.1 Service Layer
 * Handles all communication with the GLM AI model via Puter.js.
 * Follows a Service pattern — pure functions, no direct state mutations.
 */
import { AppError, classifyError } from "./errors";

const GLM_MODEL = "glm-4";

/**
 * Wait for Puter.js to be available on window.
 */
function waitForPuter(timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
        if (typeof window !== "undefined" && window.puter?.ai) {
            return resolve(window.puter);
        }

        const start = Date.now();
        const interval = setInterval(() => {
            if (window.puter?.ai) {
                clearInterval(interval);
                resolve(window.puter);
            } else if (Date.now() - start > timeoutMs) {
                clearInterval(interval);
                reject(new AppError("Puter.js is not available. Please reload the page.", { code: "PUTER_UNAVAILABLE" }));
            }
        }, 300);
    });
}

/**
 * Call Puter AI with a prompt and return the text response.
 */
async function callGLM(systemPrompt, userPrompt, options = {}) {
    try {
        const puter = await waitForPuter();

        const messages = [];
        if (systemPrompt) {
            messages.push({ role: "system", content: systemPrompt });
        }
        messages.push({ role: "user", content: userPrompt });

        const response = await puter.ai.chat(messages, {
            model: options.model || GLM_MODEL,
            ...options,
        });

        const text = typeof response === "string"
            ? response
            : response?.message?.content || response?.text || response?.toString();

        if (!text) {
            throw new AppError("GLM returned an empty response.", { code: "GLM_EMPTY_RESPONSE" });
        }

        return text.trim();
    } catch (err) {
        if (err instanceof AppError) throw err;
        const classified = classifyError(err);
        throw new AppError(classified.message, { code: classified.code });
    }
}

/**
 * Parse a JSON response from GLM, stripping markdown code fences if present.
 */
function parseJSONResponse(text) {
    let cleaned = text.trim();
    // Strip markdown code fences
    const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
        cleaned = fenceMatch[1].trim();
    }

    try {
        return JSON.parse(cleaned);
    } catch {
        throw new AppError("GLM returned invalid JSON. Please try again.", { code: "GLM_PARSE_ERROR", details: cleaned.slice(0, 200) });
    }
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Enhance a raw prompt string using GLM.
 */
export async function enhancePrompt(rawPrompt, { mode = "quick", targetModel = null } = {}) {
    if (!rawPrompt?.trim()) {
        throw new AppError("Prompt is empty.", { code: "VALIDATION_ERROR" });
    }

    const modeInstructions = {
        quick: "Rewrite the prompt to be more descriptive and vivid. Keep the same intent.",
        deep: "Transform this into a deeply layered prompt with atmosphere, texture, light qualities, and emotional weight. Add cinematic depth.",
        "model-tuned": `Optimize this prompt specifically for the ${targetModel || "default"} image generation model. Use syntax and phrasing known to produce best results.`,
    };

    const systemPrompt = `You are an expert prompt engineer for AI image generation. ${modeInstructions[mode] || modeInstructions.quick} Return ONLY the enhanced prompt text, nothing else.`;

    const result = await callGLM(systemPrompt, rawPrompt);
    return { enhanced: result, cached: false };
}

/**
 * Analyze a prompt and return structured scoring.
 */
export async function analyzePrompt(prompt) {
    if (!prompt?.trim()) {
        throw new AppError("Prompt is empty.", { code: "VALIDATION_ERROR" });
    }

    const systemPrompt = `You are an AI prompt analyst. Analyze the given image generation prompt and return a JSON object with these exact fields:
{
  "score": <number 1-10 overall quality>,
  "clarity": <number 1-10 how clear the intent>,
  "specificity": <number 1-10 how specific the details>,
  "composition": <number 1-10 how well composed>,
  "mood": <number 1-10 how strong the mood>,
  "summary": "<one sentence assessment>",
  "suggestions": [
    { "category": "<category name>", "chip": "<short suggestion text>", "text": "<full explanation>" }
  ]
}
Return ONLY the JSON, no markdown fences.`;

    const text = await callGLM(systemPrompt, prompt);
    return parseJSONResponse(text);
}

/**
 * Generate auto-pilot modules from a free-form description.
 */
export async function generateAutoPilotModules(emotionString) {
    if (!emotionString?.trim()) {
        throw new AppError("Input is empty.", { code: "VALIDATION_ERROR" });
    }

    const systemPrompt = `You are an AI prompt architect. Given a feeling, mood, or scene description, generate a structured image generation prompt as a JSON array of modules.
Each module should have: { "type": "<CATEGORY>", "value": "<specific value>", "weight": <0.1-2.0>, "isNegative": <boolean> }
Valid categories: SUBJECT, STYLE, LIGHTING, COMPOSITION, MOOD, COLOR, DETAIL, BACKGROUND, CAMERA, ARTIST, QUALITY, MEDIUM.
Generate 4-8 modules. Return ONLY the JSON array.`;

    const text = await callGLM(systemPrompt, emotionString);
    const modules = parseJSONResponse(text);

    if (!Array.isArray(modules)) {
        throw new AppError("GLM returned invalid modules format.", { code: "GLM_INVALID_MODULES" });
    }

    return modules;
}

/**
 * Mutate unlocked modules while keeping locked ones.
 */
export async function mutateModules(lockedPayload, unlockedPayload) {
    const systemPrompt = `You are an AI prompt mutator. Given a set of locked modules and unlocked modules, generate 3 creative alternative variants for the unlocked modules.
Return a JSON array of 3 objects, each with:
{ "name": "<variant name>", "modules": [<same format as input>] }
Keep the same categories but change values creatively. Return ONLY the JSON array.`;

    const userPrompt = `Locked (keep these):\n${JSON.stringify(lockedPayload, null, 2)}\n\nUnlocked (mutate these):\n${JSON.stringify(unlockedPayload, null, 2)}`;

    const text = await callGLM(systemPrompt, userPrompt);
    const variants = parseJSONResponse(text);

    if (!Array.isArray(variants)) {
        throw new AppError("GLM returned invalid variants.", { code: "GLM_INVALID_VARIANTS" });
    }

    return variants;
}

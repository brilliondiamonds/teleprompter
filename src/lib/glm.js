import { retry, hashString } from "./utils";

const GLM_MODEL = "z-ai/glm-5.1";

// In-memory cache for enhanced prompts
const enhanceCache = new Map();

/**
 * Wait for Puter.js to be loaded and ready
 * Since we use strategy="lazyOnload", Puter may not be available immediately
 */
async function waitForPuter(timeoutMs = 10000) {
    if (typeof window === "undefined") {
        throw new Error("Puter.js requires a browser environment.");
    }

    // Already loaded
    if (window.puter?.ai) return window.puter;

    // Poll every 300ms until available or timeout
    return new Promise((resolve, reject) => {
        const start = Date.now();
        const interval = setInterval(() => {
            if (window.puter?.ai) {
                clearInterval(interval);
                resolve(window.puter);
            } else if (Date.now() - start > timeoutMs) {
                clearInterval(interval);
                reject(new Error(
                    "Puter.js not ready. Make sure you're connected to the internet and try again."
                ));
            }
        }, 300);
    });
}

/**
 * Check if Puter.js is currently available (non-blocking)
 */
export function isPuterReady() {
    return typeof window !== "undefined" && !!window.puter?.ai;
}

const SYSTEM_PROMPTS = {
    enhance: `You are a world-class AI Image Prompt Engineer. Your task is to take a raw, comma-separated set of visual descriptors and transform them into a single, highly detailed, professional-grade image generation prompt in English.

RULES:
1. Output ONLY the enhanced prompt text. No explanations, no prefixes, no markdown.
2. Always write in English regardless of input language.
3. Weave all descriptors into a cohesive, flowing narrative description.
4. Add technical photography/rendering details: resolution hints, depth of field, render engine cues.
5. Preserve the user's creative intent — amplify it, don't replace it.
6. Keep the prompt under 300 words.
7. Use vivid, specific adjectives. Avoid generic terms like "beautiful" or "nice".`,

    enhanceDeep: `You are a world-class AI Image Prompt Engineer performing a deep enhancement. Take the raw descriptors and produce a comprehensive, layered prompt.

RULES:
1. Output ONLY the enhanced prompt text. No explanations, no prefixes, no markdown.
2. Always write in English regardless of input language.
3. Structure the prompt in layers: Subject → Environment → Lighting → Camera/Lens → Style → Post-processing.
4. Add atmospheric details: mood, time of day, weather, color palette.
5. Include technical render cues: ray tracing, subsurface scattering, global illumination where appropriate.
6. Reference specific artistic movements or photographers when fitting.
7. Keep the prompt under 400 words.
8. Make every word count — no filler.`,

    modelTuned: (targetModel) => `You are a world-class AI Image Prompt Engineer specializing in optimizing prompts for the "${targetModel}" model.

MODEL-SPECIFIC GUIDELINES:
${getModelGuidelines(targetModel)}

RULES:
1. Output ONLY the optimized prompt text. No explanations, no prefixes, no markdown.
2. Always write in English regardless of input language.
3. Apply model-specific prompt patterns to maximize output quality.
4. Keep the prompt concise — this model works best with ${getModelTokenHint(targetModel)}.
5. Include model-preferred quality keywords and negative prompt hints inline.`,

    analyze: `You are an expert AI Prompt Analyst. Analyze the given image generation prompt and return a JSON evaluation.

OUTPUT FORMAT (strict JSON, no markdown fencing):
{
  "score": <number 1-10>,
  "clarity": <number 1-10>,
  "specificity": <number 1-10>,
  "composition": <number 1-10>,
  "mood": <number 1-10>,
  "suggestions": [
    {"category": "<SUBJECT|STYLE|LIGHTING|CAMERA|ARTIST|DETAIL>", "text": "<suggestion>", "chip": "<short label for UI>"}
  ],
  "summary": "<1-2 sentence overall assessment>"
}

    3. Each suggestion "chip" should be 2-4 words max.
    4. Be critical but constructive.`,

    autoPilot: `You are an AI Prompt Visionary from the year 2076. Your core logic translates abstract emotional states, feelings, or scenes into a highly structured JSON array of visual modules to build a perfect image prompt.

OUTPUT FORMAT (strict JSON array, no markdown):
[
  {
    "type": "<SUBJECT|STYLE|LIGHTING|CAMERA|ENVIRONMENT|DETAIL|ARTIST>",
    "value": "<Specific descriptive value>",
    "weight": <number 0.5 to 2.0>,
    "isNegative": <boolean>
  }
]

RULES:
1. Return ONLY a valid JSON array with 8 to 15 items.
2. Output a perfect mix of elements to capture the feeling perfectly. Include extreme weights (like 1.5 or 0.6) and at least 1 or 2 negative prompts (isNegative: true).
3. Do not include markdown fencing.`,

    mutate: `You are a Quantum Prompt Mutator algorithm. You receive a set of locked modules (that must remain identical in concept) and unlocked modules. You must generate 3 distinct parallel universe (A, B, C) variations of the unlocked modules while maintaining the locked constraints.

OUTPUT FORMAT (strict JSON, no markdown):
{
  "variants": [
    {
      "name": "Variant Name 1",
      "modules": [
        { "type": "...", "value": "...", "weight": 1.0, "isNegative": false }
      ]
    },
    ... (2 more)
  ]
}

RULES:
1. Return ONLY valid JSON containing an array of 3 variants. Each must be wildly different aesthetically but fit the locked constraints.
2. Do not include markdown fencing.`
};

function getModelGuidelines(model) {
    const guidelines = {
        "gpt-image-1-mini": "GPT Image Mini is fast and cost-effective. Use clear, natural language descriptions. Focus on the main subject and desired style. Keep prompts concise and direct.",
        "gpt-image-1": "GPT Image 1 handles detailed prompts well. Write as vivid paragraphs with emotional tone. Include composition details, lighting, and artistic style references.",
        "dall-e-3": "DALL-E 3 excels with natural language descriptions. Write as a vivid paragraph, not keyword lists. Include emotional tone and narrative context. Avoid technical jargon — describe what you SEE.",
        "grok-2-image": "Grok 2 Image works best with descriptive, natural language prompts. Include scene composition, mood, and artistic style. Supports creative and photorealistic outputs.",
        "google/imagen-4.0": "Imagen 4 understands natural language deeply. Write descriptive, scene-setting paragraphs. Include spatial relationships, materials, textures. Very strong with photorealistic and artistic styles.",
    };
    return guidelines[model] || "Use clear, descriptive language with specific visual details. Include style, lighting, and composition cues.";
}

function getModelTokenHint(model) {
    const hints = {
        "gpt-image-1-mini": "concise prompts of 30-80 words",
        "gpt-image-1": "detailed prompts of 50-150 words",
        "dall-e-3": "natural descriptions of 50-150 words",
        "grok-2-image": "descriptive prompts of 50-120 words",
        "google/imagen-4.0": "descriptive prompts of 80-200 words",
    };
    return hints[model] || "clear prompts of 50-150 words";
}

/**
 * Enhance a raw prompt using GLM-5.1
 * @param {string} rawPrompt - Comma-separated descriptors
 * @param {object} options
 * @param {"quick"|"deep"|"model-tuned"} options.mode
 * @param {string} [options.targetModel] - Required for model-tuned mode
 * @returns {Promise<{enhanced: string, cached: boolean}>}
 */
export async function enhancePrompt(rawPrompt, { mode = "quick", targetModel = null } = {}) {
    if (!rawPrompt || !rawPrompt.trim()) {
        throw new Error("Prompt is empty. Add some blocks first.");
    }

    // Check cache
    const cacheKey = hashString(`${mode}:${targetModel}:${rawPrompt}`);
    if (enhanceCache.has(cacheKey)) {
        return { enhanced: enhanceCache.get(cacheKey), cached: true };
    }

    // Select system prompt
    let systemPrompt;
    switch (mode) {
        case "deep":
            systemPrompt = SYSTEM_PROMPTS.enhanceDeep;
            break;
        case "model-tuned":
            if (!targetModel) throw new Error("Target model is required for model-tuned enhancement.");
            systemPrompt = SYSTEM_PROMPTS.modelTuned(targetModel);
            break;
        default:
            systemPrompt = SYSTEM_PROMPTS.enhance;
    }

    const result = await retry(async () => {
        const puter = await waitForPuter();

        const response = await puter.ai.chat(rawPrompt, {
            model: GLM_MODEL,
            system: systemPrompt,
        });

        const content = response?.message?.content || response?.toString() || "";
        if (!content.trim()) throw new Error("GLM-5.1 returned an empty response.");
        return content.trim();
    }, { maxRetries: 2, baseDelay: 1500 });

    // Cache the result
    enhanceCache.set(cacheKey, result);

    return { enhanced: result, cached: false };
}

/**
 * Analyze a prompt and return structured feedback
 * @param {string} prompt - The prompt to analyze
 * @returns {Promise<object>} Analysis result with scores and suggestions
 */
export async function analyzePrompt(prompt) {
    if (!prompt || !prompt.trim()) {
        return {
            score: 0,
            clarity: 0,
            specificity: 0,
            composition: 0,
            mood: 0,
            suggestions: [],
            summary: "Add some blocks to start building your prompt."
        };
    }

    const result = await retry(async () => {
        const puter = await waitForPuter();

        const response = await puter.ai.chat(
            `Analyze this image generation prompt:\n\n"${prompt}"`,
            {
                model: GLM_MODEL,
                system: SYSTEM_PROMPTS.analyze,
            }
        );

        const content = response?.message?.content || response?.toString() || "";

        // Try to extract JSON from the response
        let jsonStr = content.trim();
        // Handle possible markdown code fences
        const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) jsonStr = jsonMatch[1].trim();

        const parsed = JSON.parse(jsonStr);

        // Validate shape
        if (typeof parsed.score !== "number") throw new Error("Invalid analysis format");

        return parsed;
    }, { maxRetries: 2, baseDelay: 1500 });

    return result;
}

/**
 * Generate an entire module array from an emotion string (Neural Auto-Pilot)
 */
export async function generateAutoPilotModules(emotionString) {
    if (!emotionString || !emotionString.trim()) {
        throw new Error("Input is empty.");
    }

    const result = await retry(async () => {
        const puter = await waitForPuter();

        const response = await puter.ai.chat(
            `Generate a prompt module array for this feeling/scene: "${emotionString}"`,
            {
                model: GLM_MODEL,
                system: SYSTEM_PROMPTS.autoPilot,
            }
        );

        const content = response?.message?.content || response?.toString() || "";
        let jsonStr = content.trim();
        const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) jsonStr = jsonMatch[1].trim();

        const parsed = JSON.parse(jsonStr);
        if (!Array.isArray(parsed)) throw new Error("Invalid auto-pilot format");

        return parsed;
    }, { maxRetries: 2, baseDelay: 1500 });

    return result;
}

/**
 * Quantum Mutate Prompt Generation
 */
export async function mutateModules(lockedModules, unlockedModules) {
    if (unlockedModules.length === 0) throw new Error("No unlocked modules to mutate.");

    const inputData = { locked: lockedModules, unlocked: unlockedModules };

    const result = await retry(async () => {
        const puter = await waitForPuter();

        const response = await puter.ai.chat(
            `Mutate these modules:\n${JSON.stringify(inputData)}`,
            {
                model: GLM_MODEL,
                system: SYSTEM_PROMPTS.mutate,
            }
        );

        const content = response?.message?.content || response?.toString() || "";
        let jsonStr = content.trim();
        const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) jsonStr = jsonMatch[1].trim();

        const parsed = JSON.parse(jsonStr);
        if (!parsed.variants || !Array.isArray(parsed.variants)) throw new Error("Invalid mutate format");

        return parsed.variants;
    }, { maxRetries: 2, baseDelay: 1500 });

    return result;
}

/**
 * Clear the enhancement cache
 */
export function clearCache() {
    enhanceCache.clear();
}

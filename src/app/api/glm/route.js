import { NextResponse } from "next/server";

const GLM_MODEL = "glm-4";

async function callGLM(messages, options = {}) {
    const apiKey = process.env.GLM_API_KEY || process.env.OPENAI_API_KEY;

    if (!apiKey || apiKey.trim() === "") {
        // Fallback: try any available AI endpoint
        throw new Error("GLM_API_KEY is not configured. Add it to your .env.local file.");
    }

    const baseUrl = process.env.GLM_BASE_URL || "https://open.bigmodel.cn/api/paas/v4";

    const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: options.model || GLM_MODEL,
            messages,
            temperature: options.temperature || 0.7,
            max_tokens: options.maxTokens || 2048,
        }),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error?.message || data.message || `GLM API error (${response.status})`);
    }

    const text = data.choices?.[0]?.message?.content;
    if (!text) {
        throw new Error("GLM returned an empty response.");
    }

    return text.trim();
}

function parseJSONResponse(text) {
    let cleaned = text.trim();
    const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
        cleaned = fenceMatch[1].trim();
    }

    try {
        return JSON.parse(cleaned);
    } catch {
        throw new Error("Failed to parse GLM JSON response.");
    }
}

export async function POST(request) {
    try {
        let body;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { error: "Invalid JSON in request body." },
                { status: 400 }
            );
        }

        const { action, prompt, mode, targetModel, emotionString, lockedModules, unlockedModules } = body;

        switch (action) {
            case "enhance": {
                if (!prompt?.trim()) {
                    return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
                }
                const modeInstructions = {
                    quick: "Rewrite the prompt to be more descriptive and vivid. Keep the same intent.",
                    deep: "Transform this into a deeply layered prompt with atmosphere, texture, light qualities, and emotional weight. Add cinematic depth.",
                    "model-tuned": `Optimize this prompt specifically for the ${targetModel || "default"} image generation model. Use syntax and phrasing known to produce best results.`,
                };
                const systemPrompt = `You are an expert prompt engineer for AI image generation. ${modeInstructions[mode] || modeInstructions.quick} Return ONLY the enhanced prompt text, nothing else.`;
                const enhanced = await callGLM([
                    { role: "system", content: systemPrompt },
                    { role: "user", content: prompt },
                ]);
                return NextResponse.json({ enhanced, cached: false });
            }

            case "analyze": {
                if (!prompt?.trim()) {
                    return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
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
                const text = await callGLM([
                    { role: "system", content: systemPrompt },
                    { role: "user", content: prompt },
                ]);
                const analysis = parseJSONResponse(text);
                return NextResponse.json(analysis);
            }

            case "autopilot": {
                if (!emotionString?.trim()) {
                    return NextResponse.json({ error: "Input is required." }, { status: 400 });
                }
                const systemPrompt = `You are an AI prompt architect. Given a feeling, mood, or scene description, generate a structured image generation prompt as a JSON array of modules.
Each module should have: { "type": "<CATEGORY>", "value": "<specific value>", "weight": <0.1-2.0>, "isNegative": <boolean> }
Valid categories: SUBJECT, STYLE, LIGHTING, COMPOSITION, MOOD, COLOR, DETAIL, BACKGROUND, CAMERA, ARTIST, QUALITY, MEDIUM.
Generate 4-8 modules. Return ONLY the JSON array.`;
                const text = await callGLM([
                    { role: "system", content: systemPrompt },
                    { role: "user", content: emotionString },
                ]);
                const modules = parseJSONResponse(text);
                if (!Array.isArray(modules)) {
                    return NextResponse.json({ error: "Invalid modules format from GLM." }, { status: 502 });
                }
                return NextResponse.json(modules);
            }

            case "mutate": {
                if (!lockedModules || !unlockedModules) {
                    return NextResponse.json({ error: "lockedModules and unlockedModules are required." }, { status: 400 });
                }
                const systemPrompt = `You are an AI prompt mutator. Given a set of locked modules and unlocked modules, generate 3 creative alternative variants for the unlocked modules.
Return a JSON array of 3 objects, each with:
{ "name": "<variant name>", "modules": [<same format as input>] }
Keep the same categories but change values creatively. Return ONLY the JSON array.`;
                const userPrompt = `Locked (keep these):\n${JSON.stringify(lockedModules, null, 2)}\n\nUnlocked (mutate these):\n${JSON.stringify(unlockedModules, null, 2)}`;
                const text = await callGLM([
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt },
                ]);
                const variants = parseJSONResponse(text);
                if (!Array.isArray(variants)) {
                    return NextResponse.json({ error: "Invalid variants format from GLM." }, { status: 502 });
                }
                return NextResponse.json(variants);
            }

            default:
                return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
        }
    } catch (err) {
        console.error("[API /api/glm]", err);
        return NextResponse.json(
            { error: err.message || "Internal server error." },
            { status: 500 }
        );
    }
}

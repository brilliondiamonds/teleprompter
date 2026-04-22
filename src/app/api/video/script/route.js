import { NextResponse } from "next/server";

const GLM_MODEL = "glm-5.1";

async function callGLM(messages, options = {}) {
    const apiKey = process.env.GLM_API_KEY || process.env.OPENAI_API_KEY;

    if (!apiKey || apiKey.trim() === "") {
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
            temperature: options.temperature || 0.8,
            max_tokens: options.maxTokens || 4096,
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

function parseJSON(text) {
    let cleaned = text.trim();
    const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) cleaned = fenceMatch[1].trim();

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

        const { prompt } = body;

        if (!prompt?.trim()) {
            return NextResponse.json(
                { error: "Prompt is required." },
                { status: 400 }
            );
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

        const text = await callGLM([
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
        ]);

        let scenes;
        try {
            scenes = parseJSON(text);
        } catch {
            return NextResponse.json(
                { error: "Failed to parse script from GLM response. Please try again." },
                { status: 502 }
            );
        }

        if (!Array.isArray(scenes) || scenes.length === 0) {
            return NextResponse.json(
                { error: "GLM returned no scenes. Please try a different prompt." },
                { status: 502 }
            );
        }

        // Validate and sanitize scenes
        const requiredFields = ["id", "title", "description", "visualPrompt", "duration", "mood", "transition"];
        for (const scene of scenes) {
            for (const field of requiredFields) {
                if (!scene[field] && field !== "duration") {
                    console.warn(`[VideoScript API] Scene ${scene.id || "unknown"} missing field: ${field}`);
                }
            }
            if (!scene.id) {
                scene.id = `scene_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
            }
            scene.duration = Math.max(2, Math.min(10, Number(scene.duration) || 6));
        }

        return NextResponse.json({ scenes });
    } catch (err) {
        console.error("[API /api/video/script]", err);
        return NextResponse.json(
            { error: err.message || "Internal server error." },
            { status: 500 }
        );
    }
}

import { NextResponse } from "next/server";

export async function POST(request) {
    try {
        const apiKey = process.env.IMAGE_API_KEY;

        if (!apiKey || apiKey.trim() === "") {
            return NextResponse.json(
                { error: "IMAGE_API_KEY is not configured. Add it to your .env.local file." },
                { status: 500 }
            );
        }

        let body;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { error: "Invalid JSON in request body." },
                { status: 400 }
            );
        }

        const { prompt, model } = body;

        if (!prompt?.trim()) {
            return NextResponse.json(
                { error: "Prompt is required." },
                { status: 400 }
            );
        }

        const baseUrl = process.env.IMAGE_API_BASE_URL || "https://api.openai.com/v1";

        const response = await fetch(`${baseUrl}/images/generations`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: model || "gpt-image-1-mini",
                prompt: prompt.trim(),
                n: 1,
                size: "1024x1024",
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(
                { error: data.error?.message || data.message || `Image API error (${response.status})` },
                { status: response.status }
            );
        }

        const imageUrl = data.data?.[0]?.url || data.data?.[0]?.b64_json;
        if (!imageUrl) {
            return NextResponse.json(
                { error: "No image returned from API." },
                { status: 502 }
            );
        }

        return NextResponse.json({ imageUrl });
    } catch (err) {
        console.error("[API /api/image/generate]", err);
        return NextResponse.json(
            { error: err.message || "Internal server error." },
            { status: 500 }
        );
    }
}

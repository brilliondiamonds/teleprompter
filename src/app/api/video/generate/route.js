import { NextResponse } from "next/server";
import { submitVideoJob } from "@/lib/zai-client";

export async function POST(request) {
    try {
        const apiKey = process.env.ZAI_API_KEY;

        if (!apiKey || apiKey === "your_zai_api_key_here") {
            return NextResponse.json(
                { error: "ZAI_API_KEY is not configured. Add it to your .env file." },
                { status: 500 }
            );
        }

        const body = await request.json();
        const { prompt, model, duration, size } = body;

        if (!prompt || !prompt.trim()) {
            return NextResponse.json(
                { error: "Prompt is required." },
                { status: 400 }
            );
        }

        const result = await submitVideoJob(prompt, { model, duration, size }, apiKey);

        return NextResponse.json(result);
    } catch (err) {
        console.error("Video Generate Error:", err);
        return NextResponse.json(
            { error: err.message || "Failed to submit video generation job." },
            { status: 500 }
        );
    }
}

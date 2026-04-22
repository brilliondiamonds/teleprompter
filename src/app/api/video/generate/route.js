import { NextResponse } from "next/server";
import { submitVideoJob } from "@/lib/zai-client";
import { classifyError } from "@/lib/errors";

export async function POST(request) {
    try {
        const apiKey = process.env.ZAI_API_KEY;

        if (!apiKey || apiKey === "your_zai_api_key_here" || apiKey.trim() === "") {
            return NextResponse.json(
                { error: "ZAI_API_KEY is not configured. Add it to your .env.local file.", code: "CONFIG_ERROR" },
                { status: 500 }
            );
        }

        let body;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { error: "Invalid JSON in request body.", code: "PARSE_ERROR" },
                { status: 400 }
            );
        }

        const { prompt, model, duration, size } = body;

        if (!prompt?.trim()) {
            return NextResponse.json(
                { error: "Prompt is required.", code: "VALIDATION_ERROR" },
                { status: 400 }
            );
        }

        const result = await submitVideoJob(prompt, { model, duration, size }, apiKey);

        return NextResponse.json(result);
    } catch (err) {
        console.error("[API /video/generate]", err);
        const classified = classifyError(err);
        return NextResponse.json(
            { error: classified.message, code: classified.code },
            { status: 500 }
        );
    }
}

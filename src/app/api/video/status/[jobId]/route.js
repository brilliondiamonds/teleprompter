import { NextResponse } from "next/server";
import { pollJobStatus } from "@/lib/zai-client";
import { classifyError } from "@/lib/errors";

export async function GET(request, { params }) {
    try {
        const apiKey = process.env.ZAI_API_KEY;

        if (!apiKey || apiKey === "your_zai_api_key_here" || apiKey.trim() === "") {
            return NextResponse.json(
                { error: "ZAI_API_KEY is not configured.", code: "CONFIG_ERROR" },
                { status: 500 }
            );
        }

        const { jobId } = await params;

        if (!jobId) {
            return NextResponse.json(
                { error: "Job ID is required.", code: "VALIDATION_ERROR" },
                { status: 400 }
            );
        }

        const result = await pollJobStatus(jobId, apiKey);

        return NextResponse.json({ jobId, ...result });
    } catch (err) {
        console.error("[API /video/status]", err);
        const classified = classifyError(err);
        return NextResponse.json(
            { error: classified.message, code: classified.code },
            { status: 500 }
        );
    }
}

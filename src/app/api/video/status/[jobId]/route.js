import { NextResponse } from "next/server";
import { pollJobStatus } from "@/lib/zai-client";

export async function GET(request, { params }) {
    try {
        const apiKey = process.env.ZAI_API_KEY;

        if (!apiKey || apiKey === "your_zai_api_key_here") {
            return NextResponse.json(
                { error: "ZAI_API_KEY is not configured." },
                { status: 500 }
            );
        }

        const { jobId } = await params;

        if (!jobId) {
            return NextResponse.json(
                { error: "Job ID is required." },
                { status: 400 }
            );
        }

        const result = await pollJobStatus(jobId, apiKey);

        return NextResponse.json({ jobId, ...result });
    } catch (err) {
        console.error("Video Status Error:", err);
        return NextResponse.json(
            { error: err.message || "Failed to check video status." },
            { status: 500 }
        );
    }
}

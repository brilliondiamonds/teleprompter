/**
 * ZAI Video Generation API Client
 * Handles submission and polling of CogVideoX video generation jobs.
 */
import { AppError, VideoGenerationError, ConfigurationError, classifyError } from "./errors";

const ZAI_BASE_URL = "https://api.z.ai/v1";

/**
 * Validate that the API key is present and not a placeholder.
 */
function validateApiKey(apiKey) {
    if (!apiKey || apiKey === "your_zai_api_key_here" || apiKey.trim() === "") {
        throw new ConfigurationError(
            "ZAI_API_KEY is not configured. Add it to your .env.local file.",
            { details: "Create .env.local in the project root and add: ZAI_API_KEY=your_api_key" }
        );
    }
}

/**
 * Submit a video generation job to the ZAI API.
 */
export async function submitVideoJob(prompt, options = {}, apiKey) {
    validateApiKey(apiKey);

    if (!prompt?.trim()) {
        throw new AppError("Visual prompt is required.", { code: "VALIDATION_ERROR" });
    }

    const { model = "cogvideox-2", duration = 6, size = "1280x720" } = options;

    const body = {
        prompt: prompt.trim(),
        model,
        duration: Math.max(2, Math.min(10, Number(duration) || 6)),
        size,
    };

    try {
        const response = await fetch(`${ZAI_BASE_URL}/video/generate`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();

        if (!response.ok) {
            const message = data.error || data.message || `API returned status ${response.status}`;
            if (response.status === 401 || response.status === 403) {
                throw new ConfigurationError(`ZAI API authentication failed: ${message}`);
            }
            if (response.status === 429) {
                throw new VideoGenerationError(`Rate limited: ${message}. Please wait and try again.`);
            }
            throw new VideoGenerationError(message);
        }

        if (!data.jobId && !data.id) {
            throw new VideoGenerationError("API did not return a job ID.");
        }

        return {
            jobId: data.jobId || data.id,
            status: data.status || "pending",
        };
    } catch (err) {
        if (err instanceof AppError) throw err;
        const classified = classifyError(err);
        throw new VideoGenerationError(`Failed to submit video job: ${classified.message}`);
    }
}

/**
 * Poll a video generation job status.
 */
export async function pollJobStatus(jobId, apiKey) {
    validateApiKey(apiKey);

    if (!jobId) {
        throw new AppError("Job ID is required.", { code: "VALIDATION_ERROR" });
    }

    try {
        const response = await fetch(`${ZAI_BASE_URL}/video/status/${encodeURIComponent(jobId)}`, {
            headers: {
                "Authorization": `Bearer ${apiKey}`,
            },
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                status: "failed",
                error: data.error || data.message || `Status check failed (${response.status})`,
            };
        }

        return {
            status: data.status || "processing",
            progress: data.progress || 0,
            videoUrl: data.videoUrl || data.output?.videoUrl || data.url || null,
            error: data.error || null,
        };
    } catch (err) {
        if (err instanceof AppError) throw err;
        const classified = classifyError(err);
        return {
            status: "error",
            error: `Network error: ${classified.message}`,
        };
    }
}

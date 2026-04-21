/**
 * z.ai API Client for CogVideoX Video Generation
 *
 * This client communicates with the z.ai video generation API.
 * The base URL is configurable — swap it below if the endpoint changes.
 */

// ─── Configurable Base URL ───────────────────────────────────────────────────
const ZAI_BASE_URL = "https://api.z.ai/v1";
// Alternative endpoints to try if the above doesn't work:
// const ZAI_BASE_URL = "https://api.zhipuai.ai/v4";
// const ZAI_BASE_URL = "https://open.bigmodel.cn/api/paas/v4";

const VIDEO_GENERATIONS_ENDPOINT = `${ZAI_BASE_URL}/video/generations`;

const DEFAULT_MODEL = "cogvideox-2";
const DEFAULT_SIZE = "1280x720";
const DEFAULT_DURATION = 6;
const POLL_INTERVAL_MS = 5000;
const POLL_TIMEOUT_MS = 600000; // 10 minutes

/**
 * Submit a video generation job to z.ai
 * @param {string} prompt - Cinematic prompt for the scene
 * @param {object} options
 * @param {string} [options.model] - Model name
 * @param {string} [options.size] - Resolution string e.g. "1280x720"
 * @param {number} [options.duration] - Duration in seconds
 * @param {string} apiKey - API key (read server-side only)
 * @returns {Promise<{jobId: string, status: string}>}
 */
export async function submitVideoJob(prompt, options = {}, apiKey) {
    if (!apiKey) throw new Error("ZAI_API_KEY is not configured.");

    const body = {
        model: options.model || DEFAULT_MODEL,
        prompt,
        size: options.size || DEFAULT_SIZE,
        duration: options.duration || DEFAULT_DURATION,
    };

    const response = await fetch(VIDEO_GENERATIONS_ENDPOINT, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        throw new Error(`z.ai API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    return {
        jobId: data.id,
        status: data.status || "processing",
    };
}

/**
 * Poll the status of a video generation job
 * @param {string} jobId - The job ID returned by submitVideoJob
 * @param {string} apiKey - API key
 * @returns {Promise<{status: string, videoUrl?: string, error?: string}>}
 */
export async function pollJobStatus(jobId, apiKey) {
    if (!apiKey) throw new Error("ZAI_API_KEY is not configured.");
    if (!jobId) throw new Error("Job ID is required.");

    const url = `${VIDEO_GENERATIONS_ENDPOINT}/${jobId}`;

    const response = await fetch(url, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${apiKey}`,
        },
    });

    if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        throw new Error(`z.ai status check error (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    const result = {
        status: data.status || "processing",
    };

    if (data.status === "completed" && data.output?.url) {
        result.videoUrl = data.output.url;
        result.duration = data.output.duration;
    }

    if (data.status === "failed") {
        result.error = data.error || "Video generation failed.";
    }

    return result;
}

/**
 * Wait for a video generation job to complete, polling at regular intervals
 * @param {string} jobId - The job ID
 * @param {string} apiKey - API key
 * @param {function} [onProgress] - Optional callback invoked on each poll with {status, elapsed}
 * @returns {Promise<string>} The video URL when completed
 */
export async function waitForVideo(jobId, apiKey, onProgress) {
    const startTime = Date.now();

    while (true) {
        const elapsed = Date.now() - startTime;

        if (elapsed > POLL_TIMEOUT_MS) {
            throw new Error("Video generation timed out after 10 minutes.");
        }

        const result = await pollJobStatus(jobId, apiKey);

        if (onProgress) {
            onProgress({ status: result.status, elapsed });
        }

        if (result.status === "completed" && result.videoUrl) {
            return result.videoUrl;
        }

        if (result.status === "failed") {
            throw new Error(result.error || "Video generation failed.");
        }

        // Wait before polling again
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }
}

import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind classes with clsx support
 */
export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

/**
 * Retry a function with exponential backoff
 */
export async function retry(fn, { maxRetries = 3, baseDelay = 1000 } = {}) {
    let lastError;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn();
        } catch (err) {
            lastError = err;
            if (attempt < maxRetries - 1) {
                const delay = baseDelay * Math.pow(2, attempt);
                await new Promise((r) => setTimeout(r, delay));
            }
        }
    }
    throw lastError;
}

/**
 * Simple hash for cache keys
 */
export function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0;
    }
    return hash.toString(36);
}

/**
 * Format token count estimate (~4 chars per token)
 */
export function estimateTokens(text) {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
}

/**
 * Format number with K/M suffix
 */
export function formatNumber(num) {
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
    if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
    return num.toString();
}

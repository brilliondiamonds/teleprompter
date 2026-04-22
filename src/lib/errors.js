/**
 * Custom error types for the application.
 * Each error type carries a machine-readable code and a user-friendly message.
 */

export class AppError extends Error {
    constructor(message, { code = "UNKNOWN", status = 500, details = null } = {}) {
        super(message);
        this.name = "AppError";
        this.code = code;
        this.status = status;
        this.details = details;
    }

    toJSON() {
        return {
            error: this.message,
            code: this.code,
            details: this.details,
        };
    }
}

export class ValidationError extends AppError {
    constructor(message, details = null) {
        super(message, { code: "VALIDATION_ERROR", status: 400, details });
        this.name = "ValidationError";
    }
}

export class AuthenticationError extends AppError {
    constructor(message = "Authentication required") {
        super(message, { code: "AUTH_ERROR", status: 401 });
        this.name = "AuthenticationError";
    }
}

export class ConfigurationError extends AppError {
    constructor(message, details = null) {
        super(message, { code: "CONFIG_ERROR", status: 500, details });
        this.name = "ConfigurationError";
    }
}

export class ExternalServiceError extends AppError {
    constructor(service, message, { status = 502, details = null } = {}) {
        super(`${service}: ${message}`, { code: "EXTERNAL_SERVICE_ERROR", status, details });
        this.name = "ExternalServiceError";
        this.service = service;
    }
}

export class VideoGenerationError extends AppError {
    constructor(message, { jobId = null, sceneId = null, details = null } = {}) {
        super(message, { code: "VIDEO_GENERATION_ERROR", status: 502, details });
        this.name = "VideoGenerationError";
        this.jobId = jobId;
        this.sceneId = sceneId;
    }
}

export class ScriptGenerationError extends AppError {
    constructor(message, { details = null } = {}) {
        super(message, { code: "SCRIPT_GENERATION_ERROR", status: 502, details });
        this.name = "ScriptGenerationError";
    }
}

/**
 * Classify an unknown error into a user-friendly message.
 */
export function classifyError(err) {
    if (err instanceof AppError) {
        return { message: err.message, code: err.code, recoverable: err.status < 500 };
    }

    if (err.name === "TypeError" && err.message.includes("fetch")) {
        return { message: "Network error. Please check your connection.", code: "NETWORK_ERROR", recoverable: true };
    }

    if (err.name === "AbortError") {
        return { message: "Request was cancelled.", code: "ABORTED", recoverable: true };
    }

    if (err.message?.includes("JSON")) {
        return { message: "Received an invalid response from the server.", code: "PARSE_ERROR", recoverable: true };
    }

    return {
        message: err.message || "An unexpected error occurred.",
        code: "UNKNOWN",
        recoverable: false,
    };
}

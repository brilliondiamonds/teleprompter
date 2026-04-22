import { DEFAULT_MODULE_TYPES } from "./module-types";

const STORAGE_KEY = "teleprompter_module_types";

/**
 * Load module types from localStorage.
 * Falls back to defaults if nothing is stored or data is corrupt.
 */
export function loadModuleTypes() {
    if (typeof window === "undefined") return { ...DEFAULT_MODULE_TYPES };

    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { ...DEFAULT_MODULE_TYPES };

        const parsed = JSON.parse(raw);
        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
            console.warn("[Storage] Corrupt module types in localStorage, resetting to defaults.");
            return { ...DEFAULT_MODULE_TYPES };
        }

        return parsed;
    } catch (err) {
        console.warn("[Storage] Failed to load module types:", err.message);
        return { ...DEFAULT_MODULE_TYPES };
    }
}

/**
 * Persist module types to localStorage.
 */
export function saveModuleTypes(types) {
    if (typeof window === "undefined") return;

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(types));
    } catch (err) {
        console.error("[Storage] Failed to save module types:", err.message);
    }
}

/**
 * Storage controller — thin abstraction for future migration to IndexedDB or remote.
 */
export const storage = {
    loadModuleTypes,
    saveModuleTypes,
};

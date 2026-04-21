import { create } from "zustand";
import { storage, DEFAULT_MODULE_TYPES } from "@/lib/storage";
import { enhancePrompt, analyzePrompt, generateAutoPilotModules, mutateModules } from "@/lib/glm";

export const usePromptStore = create((set, get) => ({
    moduleTypes: storage.loadModuleTypes(),
    activeModules: [],
    generatedPrompt: "",
    generatedNegativePrompt: "",
    generatedJson: {},

    // GLM-5.1 Enhancement State
    enhancedPrompt: "",
    isEnhancing: false,
    enhancementMode: "quick", // "quick" | "deep" | "model-tuned"
    enhancementError: null,
    useEnhanced: false,

    // GLM-5.1 Analysis State
    promptAnalysis: null,
    isAnalyzing: false,
    
    // 2076 Phase State
    isAutoPiloting: false,
    autoPilotError: null,
    isMutating: false,
    mutateError: null,
    mutatedVariants: [],

    // Image model sync
    selectedImageModel: "gpt-image-1-mini",

    // Persistence
    saveDb: () => {
        storage.saveModuleTypes(get().moduleTypes);
    },

    // Module Management
    addModule: (typeKey) => {
        const { moduleTypes } = get();
        const type = moduleTypes[typeKey];
        if (!type) return;

        const newModule = {
            id: Math.random().toString(36).substr(2, 9),
            type: typeKey,
            value: type.options[0] || "custom",
            customValue: "",
            weight: 1.0,
            isNegative: false,
            isLocked: false
        };
        set((state) => ({ activeModules: [...state.activeModules, newModule] }));
        get().generate();
    },

    removeModule: (id) => {
        set((state) => ({
            activeModules: state.activeModules.filter((m) => m.id !== id)
        }));
        get().generate();
    },

    updateModule: (id, updates) => {
        set((state) => ({
            activeModules: state.activeModules.map((m) =>
                m.id === id ? { ...m, ...updates } : m
            )
        }));
        get().generate();
    },

    toggleModuleType: (id) => {
        set((state) => ({
            activeModules: state.activeModules.map((m) =>
                m.id === id ? { ...m, isNegative: !m.isNegative } : m
            )
        }));
        get().generate();
    },

    updateModuleWeight: (id, weight) => {
        set((state) => ({
            activeModules: state.activeModules.map((m) =>
                m.id === id ? { ...m, weight: parseFloat(weight) } : m
            )
        }));
        get().generate();
    },

    toggleModuleLock: (id) => {
        set((state) => ({
            activeModules: state.activeModules.map((m) =>
                m.id === id ? { ...m, isLocked: !m.isLocked } : m
            )
        }));
    },

    setModules: (modules) => {
        set({ activeModules: modules });
        get().generate();
    },

    // GLM-5.1 Enhancement Actions
    setEnhancementMode: (mode) => set({ enhancementMode: mode }),

    toggleUseEnhanced: () => set((state) => ({ useEnhanced: !state.useEnhanced })),

    setSelectedImageModel: (model) => set({ selectedImageModel: model }),

    enhance: async () => {
        const { generatedPrompt, enhancementMode, selectedImageModel } = get();
        if (!generatedPrompt) return;

        set({ isEnhancing: true, enhancementError: null });

        try {
            const { enhanced, cached } = await enhancePrompt(generatedPrompt, {
                mode: enhancementMode,
                targetModel: enhancementMode === "model-tuned" ? selectedImageModel : null,
            });
            set({ enhancedPrompt: enhanced, useEnhanced: true, isEnhancing: false });
        } catch (err) {
            console.error("Enhancement Error:", err);
            set({ enhancementError: err.message, isEnhancing: false });
        }
    },

    analyze: async () => {
        const { generatedPrompt, enhancedPrompt, useEnhanced } = get();
        const promptToAnalyze = useEnhanced && enhancedPrompt ? enhancedPrompt : generatedPrompt;
        if (!promptToAnalyze) return;

        set({ isAnalyzing: true });

        try {
            const analysis = await analyzePrompt(promptToAnalyze);
            set({ promptAnalysis: analysis, isAnalyzing: false });
        } catch (err) {
            console.error("Analysis Error:", err);
            set({ isAnalyzing: false });
        }
    },

    // Get the active prompt (enhanced or raw)
    getActivePrompt: () => {
        const { useEnhanced, enhancedPrompt, generatedPrompt } = get();
        return useEnhanced && enhancedPrompt ? enhancedPrompt : generatedPrompt;
    },

    // 2076 Actions
    autoPilot: async (emotionString) => {
        set({ isAutoPiloting: true, autoPilotError: null });
        try {
            const rawModules = await generateAutoPilotModules(emotionString);
            
            const { moduleTypes } = get();
            const newActiveModules = rawModules.map(rm => {
                const typeId = rm.type && typeof rm.type === 'string' ? rm.type.toUpperCase().replace(/\s+/g, "_") : "DETAIL";
                // Add type to DB if it doesn't exist
                if (!moduleTypes[typeId]) {
                    moduleTypes[typeId] = {
                        id: typeId.toLowerCase(),
                        label: typeId.charAt(0) + typeId.slice(1).toLowerCase(),
                        options: [rm.value],
                        placeholder: `e.g. ${rm.value}`
                    };
                } else if (!moduleTypes[typeId].options.includes(rm.value)) {
                    moduleTypes[typeId].options.push(rm.value);
                }

                return {
                    id: Math.random().toString(36).substr(2, 9),
                    type: typeId,
                    value: rm.value || "custom",
                    customValue: "",
                    weight: rm.weight || 1.0,
                    isNegative: !!rm.isNegative,
                    isLocked: false
                };
            });

            set({ moduleTypes, activeModules: newActiveModules, isAutoPiloting: false });
            get().saveDb();
            get().generate();
        } catch (err) {
            console.error("Auto-Pilot Error:", err);
            set({ autoPilotError: err.message, isAutoPiloting: false });
        }
    },

    mutatePrompt: async () => {
        const { activeModules } = get();
        const locked = activeModules.filter(m => m.isLocked);
        const unlocked = activeModules.filter(m => !m.isLocked);
        
        if (unlocked.length === 0) {
            set({ mutateError: "No unlocked modules to mutate." });
            return;
        }

        set({ isMutating: true, mutateError: null, mutatedVariants: [] });
        try {
            // we map unlocked back to simple JSON for the mutation request
            const lockedPayload = locked.map(m => ({ type: m.type, value: m.customValue || m.value, weight: m.weight, isNegative: m.isNegative }));
            const unlockedPayload = unlocked.map(m => ({ type: m.type, value: m.customValue || m.value, weight: m.weight, isNegative: m.isNegative }));
            
            const variants = await mutateModules(lockedPayload, unlockedPayload);
            set({ mutatedVariants: variants, isMutating: false });
        } catch (err) {
            console.error("Mutate Error:", err);
            set({ mutateError: err.message, isMutating: false });
        }
    },

    applyVariant: (variantModules) => {
        const { activeModules, moduleTypes } = get();
        const locked = activeModules.filter(m => m.isLocked);
        
        const newUnlocked = variantModules.map(rm => {
            const typeId = rm.type && typeof rm.type === 'string' ? rm.type.toUpperCase().replace(/\s+/g, "_") : "DETAIL";
            if (!moduleTypes[typeId]) {
                moduleTypes[typeId] = {
                    id: typeId.toLowerCase(),
                    label: typeId.charAt(0) + typeId.slice(1).toLowerCase(),
                    options: [rm.value],
                    placeholder: `e.g. ${rm.value}`
                };
            } else if (!moduleTypes[typeId].options.includes(rm.value)) {
                moduleTypes[typeId].options.push(rm.value);
            }

            return {
                id: Math.random().toString(36).substr(2, 9),
                type: typeId,
                value: rm.value || "custom",
                customValue: "",
                weight: rm.weight || 1.0,
                isNegative: !!rm.isNegative,
                isLocked: false
            };
        });

        set({ 
            moduleTypes,
            activeModules: [...locked, ...newUnlocked],
            mutatedVariants: [] // clear variants after applying
        });
        get().saveDb();
        get().generate();
    },

    // JSON Parsing & Sync
    parseAndSyncJson: (jsonString) => {
        try {
            const data = JSON.parse(jsonString);
            const newModuleTypes = { ...get().moduleTypes };
            const newActiveModules = [];
            let modulesChanged = false;

            Object.entries(data).forEach(([key, value]) => {
                const typeId = key.toUpperCase().replace(/\s+/g, "_");

                if (!newModuleTypes[typeId]) {
                    newModuleTypes[typeId] = {
                        id: key.toLowerCase(),
                        label: key.charAt(0) + key.slice(1).toLowerCase(),
                        options: [],
                        placeholder: `e.g. ${value}`
                    };
                    modulesChanged = true;
                }

                const values = Array.isArray(value) ? value : [value];
                values.forEach(val => {
                    if (!newModuleTypes[typeId].options.includes(val)) {
                        newModuleTypes[typeId].options.push(val);
                        modulesChanged = true;
                    }

                    newActiveModules.push({
                        id: Math.random().toString(36).substr(2, 9),
                        type: typeId,
                        value: val,
                        customValue: "",
                        weight: 1.0,
                        isNegative: false,
                        isLocked: false
                    });
                });
            });

            if (modulesChanged) {
                set({ moduleTypes: newModuleTypes });
                get().saveDb();
            }

            set({ activeModules: newActiveModules });
            get().generate();
            return { success: true };
        } catch (err) {
            console.error("Parse Error:", err);
            return { success: false, error: err.message };
        }
    },

    // Final Assembly
    generate: () => {
        const { activeModules, moduleTypes } = get();

        const positiveModules = activeModules.filter(m => !m.isNegative);
        const negativeModules = activeModules.filter(m => m.isNegative);

        const formatModuleValue = (m) => {
            const val = m.customValue || m.value;
            if (!val) return null;
            // Weighted syntax: (concept:1.5)
            if (m.weight && m.weight !== 1.0) {
                return `(${val}:${m.weight.toFixed(1)})`;
            }
            return val;
        };

        const promptString = positiveModules
            .map(formatModuleValue)
            .filter(Boolean)
            .join(", ");

        const generatedNegativePrompt = negativeModules
            .map(formatModuleValue)
            .filter(Boolean)
            .join(", ");

        const promptJson = {};
        activeModules.forEach((m) => {
            const type = moduleTypes[m.type];
            if (!type) return;
            const key = type.label.toLowerCase().replace(/\s+/g, "_");
            const val = m.customValue || m.value;
            
            // Format for JSON: include negativity/weight if applicable
            const jsonVal = (m.weight !== 1.0 || m.isNegative) ? 
                { value: val, weight: m.weight, isNegative: m.isNegative } : val;

            if (promptJson[key]) {
                if (Array.isArray(promptJson[key])) {
                    promptJson[key].push(jsonVal);
                } else {
                    promptJson[key] = [promptJson[key], jsonVal];
                }
            } else {
                promptJson[key] = jsonVal;
            }
        });

        // Reset enhancement when raw prompt changes
        set({
            generatedPrompt: promptString,
            generatedNegativePrompt: generatedNegativePrompt,
            generatedJson: promptJson,
            enhancedPrompt: "",
            useEnhanced: false,
            promptAnalysis: null,
        });
    },
}));

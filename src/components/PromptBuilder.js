"use client";

import { usePromptStore } from "@/store/usePromptStore";
import { useState, useEffect, useRef } from "react";
import {
    Copy, Check, Sparkles, Layers, Image as ImageIcon,
    Zap, Plus, Trash2, Code, FileJson, GripVertical,
    ChevronDown, Settings2, RefreshCcw, Database,
    Brain, ArrowRight, Loader2, ToggleLeft, ToggleRight,
    Wand2, ScanSearch, AlertCircle, Lock, Unlock, Dna,
    Video
} from "lucide-react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { cn } from "@/lib/utils";
import ImageGeneration from "./ImageGeneration";
import PromptAnalysis from "./PromptAnalysis";
import NeuralInput from "./NeuralInput";
import QuantumMutator from "./QuantumMutator";
import VideoStudio from "./VideoStudio";
import ErrorBoundary from "./ErrorBoundary";
import { useVideoStore } from "@/store/useVideoStore";

const ENHANCEMENT_MODES = [
    { id: "quick", label: "Quick", desc: "Fast single rewrite" },
    { id: "deep", label: "Deep", desc: "Layered + atmospheric" },
    { id: "model-tuned", label: "Model", desc: "Optimized for target model" },
];

export default function PromptBuilder() {
    const {
        moduleTypes,
        activeModules,
        addModule,
        removeModule,
        updateModule,
        generatedPrompt: generatedPrompt,
        generatedNegativePrompt: generatedNegativePrompt,
        generatedJson: generatedJson,
        generate: generate,
        parseAndSyncJson: parseAndSyncJson,
        setModules: setModules,
        // GLM-5.1
        enhancedPrompt,
        isEnhancing,
        enhancementMode,
        enhancementError,
        useEnhanced,
        promptAnalysis,
        isAnalyzing,
        selectedImageModel,
        setEnhancementMode,
        toggleUseEnhanced,
        enhance,
        analyze,
        getActivePrompt,
        toggleModuleType,
        updateModuleWeight,
        isMutating,
        mutatePrompt,
        toggleModuleLock,
    } = usePromptStore((state) => state);

    const [copied, setCopied] = useState(false);
    const [viewMode, setViewMode] = useState("string"); // "string" | "json"
    const [showAddMenu, setShowAddMenu] = useState(false);
    const [syncLoading, setSyncLoading] = useState(false);
    const menuRef = useRef(null);

    // Initialize generate on mount
    useEffect(() => {
        generate();
    }, []);

    // Close menu on click outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowAddMenu(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleCopy = () => {
        const activePrompt = getActivePrompt();
        const text = viewMode === "string" ? activePrompt : JSON.stringify(generatedJson, null, 2);
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSync = async () => {
        setSyncLoading(true);
        parseAndSyncJson(JSON.stringify(generatedJson));
        setTimeout(() => {
            setSyncLoading(false);
        }, 800);
    };

    const activePrompt = getActivePrompt();

    return (
        <div className="flex flex-col lg:flex-row gap-8 w-full max-w-7xl mx-auto p-4 lg:p-8 animate-in fade-in duration-700">
            {/* Left Column: Modular Workspace */}
            <div className="w-full lg:w-3/5 flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-accent/20 border border-accent/20">
                            <Layers className="w-5 h-5 text-accent" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold uppercase tracking-tight">Modular Designer</h2>
                            <p className="text-white/40 text-xs flex items-center gap-1">
                                <Database className="w-3 h-3" /> Persistent Local DB Active
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-2 relative" ref={menuRef}>
                        <button
                            onClick={() => useVideoStore.getState().openStudio(activePrompt)}
                            disabled={!activePrompt}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 active:scale-95 shadow-[0_0_15px_rgba(16,185,129,0.15)] disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <Video className="w-5 h-5" />
                            <span className="hidden sm:inline">Video Studio</span>
                        </button>

                        <button
                            onClick={mutatePrompt}
                            disabled={isMutating}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all hover:bg-violet-500/20 text-violet-400 border border-violet-500/30 active:scale-95 shadow-[0_0_15px_rgba(139,92,246,0.15)]"
                        >
                            {isMutating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Dna className="w-5 h-5" />}
                            <span className="hidden sm:inline">Mutate</span>
                        </button>
                    
                        <button
                            onClick={() => setShowAddMenu(!showAddMenu)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all active:scale-95 border",
                                showAddMenu
                                    ? "bg-accent text-white border-accent shadow-[0_0_20px_rgba(237,61,99,0.3)]"
                                    : "bg-white/5 border-white/10 text-white hover:bg-white/10"
                            )}
                        >
                            <Plus className="w-5 h-5" />
                            <span>Add Block</span>
                        </button>

                        <AnimatePresence>
                            {showAddMenu && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute right-0 top-full mt-2 w-56 glass-card p-2 z-50 border-white/10 shadow-2xl backdrop-blur-2xl"
                                >
                                    <div className="text-[10px] font-bold uppercase tracking-widest text-white/30 px-3 py-2">Select Category</div>
                                    {Object.entries(moduleTypes).map(([key, type]) => (
                                        <button
                                            key={key}
                                            onClick={() => {
                                                addModule(key);
                                                setShowAddMenu(false);
                                            }}
                                            className="w-full text-left px-3 py-2 rounded-lg hover:bg-accent/20 hover:text-accent transition-colors flex items-center justify-between group"
                                        >
                                            <span className="text-sm font-medium">{type.label}</span>
                                            <Plus className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                <div className="w-full mb-2">
                    <NeuralInput />
                </div>

                {/* Module Stack */}
                <div className="flex flex-col gap-4">
                    <Reorder.Group axis="y" values={activeModules} onReorder={setModules} className="flex flex-col gap-3">
                        <AnimatePresence mode="popLayout">
                            {activeModules.map((module) => (
                                <Reorder.Item
                                    key={module.id}
                                    value={module}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        style={{ 
                                            borderColor: module.isNegative ? 'rgba(239, 68, 68, 0.4)' : (module.weight > 1.2 ? `hsla(347, 85%, 59%, ${Math.min(module.weight / 2, 0.8)})` : 'rgba(255, 255, 255, 0.05)'),
                                            boxShadow: !module.isNegative && module.weight > 1.2 ? `0 0 ${module.weight * 10}px rgba(237, 61, 99, ${module.weight * 0.1})` : 'none'
                                        }}
                                        whileHover={{ scale: 1.01, rotateX: 2 }}
                                        whileTap={{ scale: 0.99 }}
                                        className={cn(
                                            "glass-card p-5 group flex items-center gap-4 transition-all duration-300 transform-gpu",
                                            module.isNegative ? "bg-red-500/[0.02]" : "hover:border-white/10",
                                            module.isLocked ? "border-violet-500/30 bg-violet-500/5 shadow-[0_0_15px_rgba(139,92,246,0.1)]" : ""
                                        )}
                                    >
                                    <div className="cursor-grab active:cursor-grabbing opacity-20 hover:opacity-100 transition-opacity">
                                        <GripVertical className="w-5 h-5" />
                                    </div>

                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="flex flex-col gap-1.5">
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-accent/60 ml-0.5">
                                                {moduleTypes[module.type]?.label || module.type}
                                            </span>
                                            <div className="relative">
                                                <select
                                                    value={module.value}
                                                    onChange={(e) => updateModule(module.id, { value: e.target.value, customValue: "" })}
                                                    className="w-full appearance-none bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white/90 focus:outline-none focus:border-accent/40 transition-all cursor-pointer"
                                                >
                                                    {(moduleTypes[module.type]?.options || []).map((opt) => (
                                                        <option key={opt} value={opt} className="bg-[#0a0a0b] text-white">
                                                            {opt}
                                                        </option>
                                                    ))}
                                                        <option value="custom" className="bg-[#0a0a0b] text-accent">-- Valore Personalizzato --</option>
                                                    </select>
                                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-20 pointer-events-none" />
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between gap-4">
                                                <div className="flex-1 flex flex-col gap-1.5">
                                                    <div className="flex items-center justify-between ml-0.5">
                                                        <span className={cn("text-[10px] font-bold uppercase tracking-widest", module.isNegative ? "text-red-500/60" : "text-white/20")}>
                                                            {module.isNegative ? "Negative Toggle" : "Weight"} {module.weight !== 1.0 && !module.isNegative && `(${module.weight.toFixed(1)})`}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <button 
                                                            onClick={() => toggleModuleType(module.id)}
                                                            className={cn(
                                                                "flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
                                                                module.isNegative ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-white/5 text-white/40 border-white/10 hover:text-white/80"
                                                            )}
                                                        >
                                                            {module.isNegative ? "NEG" : "POS"}
                                                        </button>
                                                        {!module.isNegative && (
                                                            <div className="w-full flex items-center gap-2">
                                                                <span className="text-[10px] text-white/30">0.1</span>
                                                                <input
                                                                    type="range"
                                                                    min="0.1"
                                                                    max="2.0"
                                                                    step="0.1"
                                                                    value={module.weight}
                                                                    onChange={(e) => updateModuleWeight(module.id, e.target.value)}
                                                                    className="w-full h-1 bg-white/10 rounded-full appearance-none outline-none accent-[#ed3d63]"
                                                                />
                                                                <span className="text-[10px] text-white/30">2.0</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {(module.value === "custom" || module.customValue) && (
                                                <div className="flex flex-col gap-1.5 md:col-span-2">
                                                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/20 ml-0.5">
                                                        Dettaglio Custom
                                                    </span>
                                                    <input
                                                        type="text"
                                                        value={module.customValue}
                                                        onChange={(e) => updateModule(module.id, { customValue: e.target.value })}
                                                        placeholder={moduleTypes[module.type]?.placeholder}
                                                        className={cn(
                                                            "w-full border rounded-xl px-4 py-2 text-sm text-white focus:outline-none transition-all shadow-[inset_0_1px_4px_rgba(0,0,0,0.4)]",
                                                            module.isNegative ? "bg-red-500/5 focus:border-red-500 border-red-500/20" : "bg-accent/5 focus:border-accent border-accent/20"
                                                        )}
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            <button
                                                onClick={() => toggleModuleLock(module.id)}
                                                className={cn(
                                                    "p-2.5 rounded-xl transition-all active:scale-90",
                                                    module.isLocked ? "bg-violet-500/20 text-violet-400 border border-violet-500/30 shadow-[0_0_10px_rgba(139,92,246,0.3)]" : "hover:bg-white/10 text-white/20 hover:text-white/60"
                                                )}
                                                title={module.isLocked ? "Unlock Module" : "Lock for mutation"}
                                            >
                                                {module.isLocked ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
                                            </button>
                                            <button
                                                onClick={() => removeModule(module.id)}
                                                className="p-2.5 rounded-xl hover:bg-red-500/10 text-white/20 hover:text-red-500 transition-all active:scale-90"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </Reorder.Item>
                            ))}
                        </AnimatePresence>
                    </Reorder.Group>

                    {activeModules.length === 0 && (
                        <div className="py-20 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-3xl opacity-20 grayscale">
                            <Sparkles className="w-12 h-12 mb-3" />
                            <p className="text-sm font-medium italic">Il tuo spazio creativo è vuoto. Aggiungi un blocco per iniziare.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Column: Output & Vision */}
            <div className="w-full lg:w-2/5 flex flex-col gap-6">
                {/* Live Preview Card */}
                <div className="glass-card p-8 relative overflow-hidden group border-accent/10">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex p-1 bg-white/5 rounded-xl border border-white/5">
                            <button
                                onClick={() => setViewMode("string")}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                                    viewMode === "string" ? "bg-accent text-white shadow-lg shadow-accent/20" : "text-white/40 hover:text-white/60"
                                )}
                            >
                                <Code className="w-3.5 h-3.5" /> STRING
                            </button>
                            <button
                                onClick={() => setViewMode("json")}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                                    viewMode === "json" ? "bg-white/10 text-white shadow-lg" : "text-white/40 hover:text-white/60"
                                )}
                            >
                                <FileJson className="w-3.5 h-3.5" /> JSON
                            </button>
                        </div>

                        <div className="flex gap-2">
                            {viewMode === "json" && (
                                <button
                                    onClick={handleSync}
                                    disabled={syncLoading}
                                    className="p-2 rounded-full bg-white/5 hover:bg-emerald-500/20 text-white/40 hover:text-emerald-500 transition-all border border-transparent hover:border-emerald-500/30"
                                    title="Sync values to Database"
                                >
                                    <RefreshCcw className={cn("w-4 h-4", syncLoading && "animate-spin")} />
                                </button>
                            )}
                            <button
                                onClick={handleCopy}
                                className={cn(
                                    "flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold transition-all duration-300 shadow-xl",
                                    copied ? "bg-emerald-500 text-white" : "bg-white/10 hover:bg-accent text-white"
                                )}
                            >
                                {copied ? <><Check className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                            </button>
                        </div>
                    </div>

                    {/* Prompt Display */}
                    <div className="bg-black/60 rounded-2xl p-6 min-h-[160px] border border-white/5 flex flex-col justify-center shadow-2xl relative z-10">
                        {viewMode === "string" ? (
                            <div className="flex flex-col gap-3">
                                {/* Enhanced badge */}
                                {useEnhanced && enhancedPrompt && (
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="glm-badge">
                                            <Brain className="w-3 h-3" />
                                            Enhanced by GLM-5.1
                                        </span>
                                    </div>
                                )}
                                <p className="text-lg font-medium leading-relaxed font-mono selection:bg-accent selection:text-white break-words">
                                    {activePrompt || "Building mission parameters..."}
                                </p>
                                
                                {/* Negative Prompts */}
                                {generatedNegativePrompt && !useEnhanced && (
                                    <div className="mt-4 pt-4 border-t border-red-500/20">
                                        <div className="text-[10px] font-bold uppercase tracking-widest text-red-500/60 mb-2">Negative Prompts</div>
                                        <p className="text-sm font-medium leading-relaxed font-mono text-red-400/80 break-words">
                                            {generatedNegativePrompt}
                                        </p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <pre className="text-sm font-mono text-emerald-400/90 overflow-x-auto selection:bg-emerald-500/30">
                                {JSON.stringify(generatedJson, null, 2)}
                            </pre>
                        )}

                        <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center opacity-40">
                            <span className="text-[10px] font-bold uppercase tracking-widest">{activePrompt.length} Characters</span>
                            <span className="text-[10px] font-bold uppercase tracking-widest lowercase italic">
                                {useEnhanced && enhancedPrompt ? "glm-5.1 enhanced" : viewMode === "json" ? "database-linked preview" : "assembled string"}
                            </span>
                        </div>
                    </div>

                    {/* Background Glow */}
                    <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-accent/10 blur-[120px] rounded-full pointer-events-none" />
                </div>

                {/* GLM-5.1 Enhancement Panel */}
                <div className="glass-card p-6 border-violet-500/10 bg-violet-500/[0.02]">
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-violet-500/20">
                                <Brain className="w-5 h-5 text-violet-400" />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold uppercase tracking-wider">GLM-5.1 Intelligence</h2>
                                <p className="text-[10px] text-white/30">Prompt Enhancement Engine</p>
                            </div>
                        </div>

                        {/* Enhanced toggle */}
                        {enhancedPrompt && (
                            <button
                                onClick={toggleUseEnhanced}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
                                    useEnhanced
                                        ? "bg-violet-500/20 border-violet-500/30 text-violet-400"
                                        : "bg-white/5 border-white/10 text-white/40"
                                )}
                            >
                                {useEnhanced ?
                                    <ToggleRight className="w-4 h-4" /> :
                                    <ToggleLeft className="w-4 h-4" />
                                }
                                {useEnhanced ? "Enhanced ON" : "Enhanced OFF"}
                            </button>
                        )}
                    </div>

                    {/* Enhancement Mode Selector */}
                    <div className="flex gap-2 mb-4">
                        {ENHANCEMENT_MODES.map((mode) => (
                            <button
                                key={mode.id}
                                onClick={() => setEnhancementMode(mode.id)}
                                className={cn(
                                    "flex-1 flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl text-xs font-bold transition-all border",
                                    enhancementMode === mode.id
                                        ? "bg-violet-500/15 border-violet-500/30 text-violet-400"
                                        : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:text-white/60"
                                )}
                            >
                                <span className="uppercase tracking-wider text-[11px]">{mode.label}</span>
                                <span className="text-[9px] font-normal opacity-60">{mode.desc}</span>
                            </button>
                        ))}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        <button
                            onClick={enhance}
                            disabled={isEnhancing || !generatedPrompt}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold transition-all duration-300",
                                isEnhancing
                                    ? "bg-violet-500/20 text-violet-400 cursor-wait"
                                    : !generatedPrompt
                                        ? "bg-white/5 text-white/20 cursor-not-allowed"
                                        : "bg-violet-500 hover:bg-violet-400 text-white shadow-[0_0_25px_rgba(139,92,246,0.3)] hover:shadow-[0_0_35px_rgba(139,92,246,0.4)] active:scale-95"
                            )}
                        >
                            {isEnhancing ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Enhancing...</span>
                                </>
                            ) : (
                                <>
                                    <Wand2 className="w-4 h-4" />
                                    <span>Enhance</span>
                                </>
                            )}
                        </button>

                        <button
                            onClick={analyze}
                            disabled={isAnalyzing || (!generatedPrompt && !enhancedPrompt)}
                            className={cn(
                                "flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold transition-all",
                                isAnalyzing
                                    ? "bg-white/5 text-white/40 cursor-wait"
                                    : !generatedPrompt && !enhancedPrompt
                                        ? "bg-white/5 text-white/20 cursor-not-allowed"
                                        : "bg-white/5 hover:bg-violet-500/10 text-white/60 hover:text-violet-400 border border-white/5 hover:border-violet-500/20 active:scale-95"
                            )}
                        >
                            {isAnalyzing ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <ScanSearch className="w-4 h-4" />
                            )}
                            <span>Analyze</span>
                        </button>
                    </div>

                    {/* Enhancement Error */}
                    <AnimatePresence>
                        {enhancementError && (
                            <motion.div
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                className="mt-3 flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs"
                            >
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                <span>{enhancementError}</span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Before / After Preview */}
                    <AnimatePresence>
                        {enhancedPrompt && generatedPrompt && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-4 overflow-hidden"
                            >
                                <div className="text-[10px] font-bold uppercase tracking-widest text-white/20 mb-2">Before → After</div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-black/40 rounded-xl p-3 border border-white/5">
                                        <div className="text-[9px] font-bold uppercase tracking-widest text-white/20 mb-2">Raw</div>
                                        <p className="text-[11px] text-white/40 leading-relaxed line-clamp-4 font-mono">{generatedPrompt}</p>
                                    </div>
                                    <div className="bg-violet-500/5 rounded-xl p-3 border border-violet-500/10">
                                        <div className="text-[9px] font-bold uppercase tracking-widest text-violet-400/60 mb-2 flex items-center gap-1">
                                            <Brain className="w-2.5 h-2.5" /> Enhanced
                                        </div>
                                        <p className="text-[11px] text-white/70 leading-relaxed line-clamp-4 font-mono">{enhancedPrompt}</p>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Prompt Analysis */}
                <PromptAnalysis
                    analysis={promptAnalysis}
                    loading={isAnalyzing}
                    onSuggestionClick={(s) => {
                        // Add suggestion as a new custom module
                        const typeKey = s.category?.toUpperCase() || "DETAIL";
                        addModule(typeKey);
                    }}
                />

                {/* Puter Vision Engine */}
                <div className="glass-card p-6 border-white/5 bg-white/[0.02]">
                    <ImageGeneration prompt={activePrompt} useEnhanced={useEnhanced && !!enhancedPrompt} />
                </div>

                <div className="glass-card p-6 border-accent/20 bg-accent/5">
                    <div className="flex items-center gap-2 mb-3 text-accent text-xs font-bold uppercase tracking-tighter">
                        <Zap className="w-4 h-4 shadow-accent/50 filter drop-shadow-lg" />
                        Agency Intelligence
                    </div>
                    <p className="text-xs text-white/50 leading-relaxed italic">
                        <strong className="text-violet-400/80">GLM-5.1</strong> enhances your raw blocks into professional prompts optimized for each image model.
                        "Syncing" in JSON mode will auto-expand your local database with new categories and values.
                    </p>
                </div>
            </div>
            
            <QuantumMutator />
            <ErrorBoundary>
                <VideoStudio />
            </ErrorBoundary>
        </div>
    );
}

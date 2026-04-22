"use client";

import { useState, useEffect } from "react";
import { usePromptStore } from "@/store/usePromptStore";
import { ImageIcon, Loader2, Download, ExternalLink, RefreshCw, Layers, Brain } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const MODELS = [
    { id: "gpt-image-1-mini", name: "GPT Image Mini" },
    { id: "gpt-image-1", name: "GPT Image 1" },
    { id: "dall-e-3", name: "DALL-E 3" },
];

export default function ImageGeneration({ prompt, useEnhanced = false }) {
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedModel, setSelectedModel] = useState(MODELS[0].id);

    const setSelectedImageModel = usePromptStore((s) => s.setSelectedImageModel);

    useEffect(() => {
        setSelectedImageModel(selectedModel);
    }, [selectedModel, setSelectedImageModel]);

    const generateImage = async () => {
        if (!prompt) return;
        setLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/image/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt, model: selectedModel }),
            });

            const data = await response.json();

            if (!response.ok || data.error) {
                throw new Error(data.error || "Failed to generate image.");
            }

            const imgSrc = data.imageUrl;
            if (!imgSrc) throw new Error("No image returned from API.");

            const modelConfig = MODELS.find((m) => m.id === selectedModel);

            setImages((prev) => [{
                src: imgSrc,
                id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
                enhanced: useEnhanced,
                model: modelConfig?.name || selectedModel,
            }, ...prev]);
        } catch (err) {
            console.error("Image Generation Error:", err);
            setError(err.message || "Failed to generate image.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-6 mt-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-accent/20">
                        <ImageIcon className="w-5 h-5 text-accent" />
                    </div>
                    <h2 className="text-xl font-bold uppercase tracking-wider">Vision Engine</h2>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group/select">
                        <select
                            value={selectedModel}
                            onChange={(e) => setSelectedModel(e.target.value)}
                            className="appearance-none bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 pr-10 text-sm font-medium text-white/80 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-all cursor-pointer hover:bg-white/10"
                        >
                            {MODELS.map((m) => (
                                <option key={m.id} value={m.id} className="bg-[#0a0a0b] text-white">
                                    {m.name}
                                </option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                            <Layers className="w-4 h-4" />
                        </div>
                    </div>

                    <button
                        onClick={generateImage}
                        disabled={loading || !prompt}
                        className={cn(
                            "flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all duration-300",
                            loading || !prompt
                                ? "bg-white/5 text-white/20 cursor-not-allowed"
                                : "bg-accent hover:bg-accent/80 text-white shadow-[0_0_20px_rgba(237,61,99,0.3)] hover:scale-105 active:scale-95"
                        )}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Visualizing...</span>
                            </>
                        ) : (
                            <>
                                <RefreshCw className="w-4 h-4" />
                                <span>Generate Vision</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {error && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm"
                >
                    {error}
                </motion.div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <AnimatePresence mode="popLayout">
                    {images.map((img) => (
                        <motion.div
                            key={img.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            layout
                            className="glass-card overflow-hidden group relative aspect-square"
                        >
                            <img
                                src={img.src}
                                alt="Generated AI"
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            />

                            {img.enhanced && (
                                <div className="absolute top-3 left-3 z-20">
                                    <span className="glm-badge text-[9px]">
                                        <Brain className="w-2.5 h-2.5" />
                                        GLM-5.1
                                    </span>
                                </div>
                            )}

                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-4">
                                <button
                                    onClick={() => window.open(img.src, '_blank')}
                                    className="p-3 rounded-full bg-white/10 hover:bg-accent transition-colors"
                                >
                                    <ExternalLink className="w-5 h-5 text-white" />
                                </button>
                                <a
                                    href={img.src}
                                    download={`teleprompter-vision-${img.id}.png`}
                                    className="p-3 rounded-full bg-white/10 hover:bg-accent transition-colors"
                                >
                                    <Download className="w-5 h-5 text-white" />
                                </a>
                            </div>
                        </motion.div>
                    ))}
                    {!loading && images.length === 0 && (
                        <div className="col-span-full py-20 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-3xl opacity-20">
                            <ImageIcon className="w-16 h-16 mb-4" />
                            <p className="font-medium tracking-tighter">Your agency visions will appear here</p>
                        </div>
                    )}
                    {loading && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="glass-card aspect-square flex flex-col items-center justify-center gap-4 border-accent/20 bg-accent/5 backdrop-blur-3xl"
                        >
                            <div className="relative">
                                <Loader2 className="w-12 h-12 text-accent animate-spin" />
                                <div className="absolute inset-0 bg-accent/20 blur-xl animate-pulse rounded-full" />
                            </div>
                            <p className="text-accent font-bold uppercase tracking-widest text-xs">Processing Neural Link...</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

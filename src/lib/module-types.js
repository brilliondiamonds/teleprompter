/**
 * Default module types for the Teleprompter prompt builder.
 * Each type defines a category label, selectable options, and a placeholder for custom values.
 */
export const DEFAULT_MODULE_TYPES = {
    SUBJECT: {
        id: "subject",
        label: "Subject",
        options: ["woman", "man", "child", "elderly person", "couple", "group", "animal", "robot", "fantasy creature", "custom"],
        placeholder: "e.g. cyberpunk samurai",
    },
    STYLE: {
        id: "style",
        label: "Style",
        options: ["photorealistic", "cinematic", "anime", "oil painting", "watercolor", "digital art", "3D render", "pixel art", "concept art", "custom"],
        placeholder: "e.g. moody film noir",
    },
    LIGHTING: {
        id: "lighting",
        label: "Lighting",
        options: ["golden hour", "studio lighting", "neon glow", "dramatic shadows", "soft diffused", "rim lighting", "volumetric", "natural light", "custom"],
        placeholder: "e.g. candlelight flicker",
    },
    COMPOSITION: {
        id: "composition",
        label: "Composition",
        options: ["close-up", "medium shot", "wide angle", "bird's eye", "low angle", "dutch angle", "symmetrical", "rule of thirds", "custom"],
        placeholder: "e.g. extreme close-up on eyes",
    },
    MOOD: {
        id: "mood",
        label: "Mood",
        options: ["serene", "dramatic", "mysterious", "whimsical", "melancholic", "epic", "romantic", "dark", "ethereal", "custom"],
        placeholder: "e.g. hauntingly beautiful",
    },
    COLOR: {
        id: "color",
        label: "Color",
        options: ["warm tones", "cool tones", "monochrome", "pastel", "vibrant", "muted", "complementary contrast", "neon", "custom"],
        placeholder: "e.g. teal and orange",
    },
    DETAIL: {
        id: "detail",
        label: "Detail",
        options: ["hyper-detailed", "intricate patterns", "clean minimal", "textured", "ornate", "weathered", "pristine", "custom"],
        placeholder: "e.g. fine fabric weave visible",
    },
    BACKGROUND: {
        id: "background",
        label: "Background",
        options: ["blurred bokeh", "urban cityscape", "natural landscape", "abstract", "solid color", "interior", "space", "underwater", "custom"],
        placeholder: "e.g. rain-soaked Tokyo street",
    },
    CAMERA: {
        id: "camera",
        label: "Camera",
        options: ["Canon EOS R5", "Hasselblad", "Leica M11", "iPhone 15 Pro", "ARRI Alexa", "RED V-Raptor", "custom"],
        placeholder: "e.g. Sony A7IV 85mm f/1.4",
    },
    ARTIST: {
        id: "artist",
        label: "Artist",
        options: ["Greg Rutkowski", "Artgerm", "Alphonse Mucha", "James Gurney", "Craig Mullins", "custom"],
        placeholder: "e.g. in the style of Wes Anderson",
    },
    QUALITY: {
        id: "quality",
        label: "Quality",
        options: ["masterpiece", "best quality", "ultra HD", "8K", "high resolution", "sharp focus", "professional", "custom"],
        placeholder: "e.g. award-winning photography",
    },
    MEDIUM: {
        id: "medium",
        label: "Medium",
        options: ["photograph", "illustration", "painting", "sketch", "screenshot", "render", "collage", "custom"],
        placeholder: "e.g. Polaroid instant photo",
    },
};

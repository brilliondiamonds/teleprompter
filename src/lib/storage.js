const STORAGE_KEY = "teleprompter_module_types";

export const DEFAULT_MODULE_TYPES = {
    SUBJECT: {
        id: "subject",
        label: "Soggetto",
        options: ["Ritratti cinematici", "Paesaggi epici", "Mecha futuristici", "Creature mistiche", "Architettura brutalista"],
        placeholder: "e.g. un astronauta perduto"
    },
    STYLE: {
        id: "style",
        label: "Stile Visivo",
        options: ["Photorealistic", "Cyberpunk", "Minimalist", "Surrealism", "Vaporwave", "Oil Painting", "3D Render"],
        placeholder: "e.g. iper-dettagliato"
    },
    LIGHTING: {
        id: "lighting",
        label: "Illuminazione",
        options: ["Golden Hour", "Dramatic Rim", "Neon Glow", "Soft Ambient", "Volumetric Fog", "Studio Lighting"],
        placeholder: "e.g. luce naturale filtrata"
    },
    CAMERA: {
        id: "camera",
        label: "Ottica & Inquadratura",
        options: ["85mm Portrait", "Wide Angle 24mm", "Macro Lens", "Top-Down View", "Fisheye", "Cinematic Pan"],
        placeholder: "e.g. f/1.8 focus"
    },
    ARTIST: {
        id: "artist",
        label: "Ispirazione Artista",
        options: ["Simon Stålenhag", "Zdzisław Beksiński", "Syd Mead", "Hayao Miyazaki", "H.R. Giger"],
        placeholder: "e.g. Caravaggio"
    },
};

export const storage = {
    loadModuleTypes: () => {
        if (typeof window === "undefined") return DEFAULT_MODULE_TYPES;
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : DEFAULT_MODULE_TYPES;
    },

    saveModuleTypes: (types) => {
        if (typeof window === "undefined") return;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(types));
    }
};

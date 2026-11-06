export interface ThemePalette {
  id: "azul" | "esmeralda" | "roxo" | "vermelho" | "cinza" | "ambar" | "lavanda" | "ardosia";
  name: string;
  // RGB values for jsPDF
  primaryRgb: [number, number, number];
  secondaryRgb: [number, number, number];
  subRgb: [number, number, number];
  minorRgb: [number, number, number];
  accentRgb: [number, number, number];
  dividerRgb: [number, number, number];
  softBgRgb: [number, number, number];
  borderRgb: [number, number, number];
  calloutBorderRgb: [number, number, number];
  calloutBgRgb: [number, number, number];
  tableHeaderFillRgb: [number, number, number];
  tableRowAltRgb: [number, number, number];
  badgeBgRgb: [number, number, number];
  badgeTextRgb: [number, number, number];

  // Tailwind CSS class names for on-screen components
  tailwind: {
    primaryText: string;
    secondaryText: string;
    subText: string;
    minorText: string;
    accentBg: string;
    dividerBorder: string;
    calloutBorder: string;
    calloutBg: string;
    tableHeaderBg: string;
    tableRowAltBg: string;
    badgeBg: string;
    badgeText: string;
  };
}

export const THEME_PALETTES: Record<string, ThemePalette> = {
  // 1. AZUL: Ateliê
  azul: {
    id: "azul",
    name: "Azul",
    primaryRgb: [30, 58, 138],        // #1E3A8A (Blue 900)
    secondaryRgb: [29, 78, 216],      // #1D4ED8 (Blue 700)
    subRgb: [37, 99, 235],            // #2563EB (Blue 600)
    minorRgb: [59, 130, 246],         // #3B82F6 (Blue 500)
    accentRgb: [37, 99, 235],         // #2563EB (Blue 600)
    dividerRgb: [191, 219, 254],      // #BFDBFE (Blue 200)
    softBgRgb: [239, 246, 255],       // #EFF6FF (Blue 50)
    borderRgb: [191, 219, 254],       // #BFDBFE
    calloutBorderRgb: [37, 99, 235],  // #2563EB
    calloutBgRgb: [239, 246, 255],    // #EFF6FF
    tableHeaderFillRgb: [30, 58, 138],// #1E3A8A
    tableRowAltRgb: [239, 246, 255],  // #EFF6FF
    badgeBgRgb: [219, 234, 254],      // #DBEAFE
    badgeTextRgb: [30, 58, 138],      // #1E3A8A
    tailwind: {
      primaryText: "text-blue-900 dark:text-blue-300",
      secondaryText: "text-blue-800 dark:text-blue-400",
      subText: "text-blue-700 dark:text-blue-400",
      minorText: "text-blue-600 dark:text-blue-500",
      accentBg: "bg-blue-600",
      dividerBorder: "border-blue-200 dark:border-blue-800",
      calloutBorder: "border-blue-500",
      calloutBg: "bg-blue-50/70 dark:bg-blue-950/20",
      tableHeaderBg: "bg-blue-800 text-white",
      tableRowAltBg: "bg-blue-50/40 dark:bg-blue-950/10",
      badgeBg: "bg-blue-100 dark:bg-blue-950/50",
      badgeText: "text-blue-800 dark:text-blue-300",
    },
  },

  // 2. ESMERALDA: Tutoria
  esmeralda: {
    id: "esmeralda",
    name: "Esmeralda",
    primaryRgb: [6, 95, 70],          // #065F46 (Emerald 800)
    secondaryRgb: [4, 120, 87],       // #047857 (Emerald 700)
    subRgb: [5, 150, 105],            // #059669 (Emerald 600)
    minorRgb: [16, 185, 129],         // #10B981 (Emerald 500)
    accentRgb: [5, 150, 105],         // #059669
    dividerRgb: [167, 243, 208],      // #A7F3D0 (Emerald 200)
    softBgRgb: [240, 253, 244],       // #F0FDF4 (Emerald 50)
    borderRgb: [167, 243, 208],       // #A7F3D0
    calloutBorderRgb: [5, 150, 105],  // #059669
    calloutBgRgb: [240, 253, 244],    // #F0FDF4
    tableHeaderFillRgb: [6, 95, 70],  // #065F46
    tableRowAltRgb: [240, 253, 244],  // #F0FDF4
    badgeBgRgb: [209, 250, 229],      // #D1FAE5
    badgeTextRgb: [6, 95, 70],        // #065F46
    tailwind: {
      primaryText: "text-emerald-900 dark:text-emerald-300",
      secondaryText: "text-emerald-800 dark:text-emerald-400",
      subText: "text-emerald-700 dark:text-emerald-400",
      minorText: "text-emerald-600 dark:text-emerald-500",
      accentBg: "bg-emerald-600",
      dividerBorder: "border-emerald-200 dark:border-emerald-800",
      calloutBorder: "border-emerald-500",
      calloutBg: "bg-emerald-50/70 dark:bg-emerald-950/20",
      tableHeaderBg: "bg-emerald-800 text-white",
      tableRowAltBg: "bg-emerald-50/40 dark:bg-emerald-950/10",
      badgeBg: "bg-emerald-100 dark:bg-emerald-950/50",
      badgeText: "text-emerald-800 dark:text-emerald-300",
    },
  },

  // 3. ROXO: Transcrição
  roxo: {
    id: "roxo",
    name: "Roxo",
    primaryRgb: [88, 28, 135],        // #581C87 (Purple 900)
    secondaryRgb: [109, 40, 217],     // #6D28D9 (Purple 700)
    subRgb: [124, 58, 237],           // #7C3AED (Purple 600)
    minorRgb: [139, 92, 246],         // #8B5CF6 (Purple 500)
    accentRgb: [124, 58, 237],        // #7C3AED
    dividerRgb: [221, 214, 254],      // #DDD6FE (Purple 200)
    softBgRgb: [250, 245, 255],       // #FAF5FF (Purple 50)
    borderRgb: [221, 214, 254],       // #DDD6FE
    calloutBorderRgb: [124, 58, 237], // #7C3AED
    calloutBgRgb: [250, 245, 255],    // #FAF5FF
    tableHeaderFillRgb: [88, 28, 135],// #581C87
    tableRowAltRgb: [250, 245, 255],  // #FAF5FF
    badgeBgRgb: [237, 233, 254],      // #EDE9FE
    badgeTextRgb: [88, 28, 135],      // #581C87
    tailwind: {
      primaryText: "text-purple-900 dark:text-purple-300",
      secondaryText: "text-purple-800 dark:text-purple-400",
      subText: "text-purple-700 dark:text-purple-400",
      minorText: "text-purple-600 dark:text-purple-500",
      accentBg: "bg-purple-600",
      dividerBorder: "border-purple-200 dark:border-purple-800",
      calloutBorder: "border-purple-500",
      calloutBg: "bg-purple-50/70 dark:bg-purple-950/20",
      tableHeaderBg: "bg-purple-800 text-white",
      tableRowAltBg: "bg-purple-50/40 dark:bg-purple-950/10",
      badgeBg: "bg-purple-100 dark:bg-purple-950/50",
      badgeText: "text-purple-800 dark:text-purple-300",
    },
  },

  // 4. VERMELHO: Gravação de Aula
  vermelho: {
    id: "vermelho",
    name: "Vermelho",
    primaryRgb: [153, 27, 27],        // #991B1B (Red 800)
    secondaryRgb: [185, 28, 28],      // #B91C1C (Red 700)
    subRgb: [220, 38, 38],            // #DC2626 (Red 600)
    minorRgb: [239, 68, 68],          // #EF4444 (Red 500)
    accentRgb: [220, 38, 38],         // #DC2626
    dividerRgb: [254, 202, 202],      // #FECACA (Red 200)
    softBgRgb: [254, 242, 242],       // #FEF2F2 (Red 50)
    borderRgb: [254, 202, 202],       // #FECACA
    calloutBorderRgb: [220, 38, 38],  // #DC2626
    calloutBgRgb: [254, 242, 242],    // #FEF2F2
    tableHeaderFillRgb: [153, 27, 27],// #991B1B
    tableRowAltRgb: [254, 242, 242],  // #FEF2F2
    badgeBgRgb: [254, 226, 226],      // #FEE2E2
    badgeTextRgb: [153, 27, 27],      // #991B1B
    tailwind: {
      primaryText: "text-red-900 dark:text-red-300",
      secondaryText: "text-red-800 dark:text-red-400",
      subText: "text-red-700 dark:text-red-400",
      minorText: "text-red-600 dark:text-red-500",
      accentBg: "bg-red-600",
      dividerBorder: "border-red-200 dark:border-red-800",
      calloutBorder: "border-red-500",
      calloutBg: "bg-red-50/70 dark:bg-red-950/20",
      tableHeaderBg: "bg-red-800 text-white",
      tableRowAltBg: "bg-red-50/40 dark:bg-red-950/10",
      badgeBg: "bg-red-100 dark:bg-red-950/50",
      badgeText: "text-red-800 dark:text-red-300",
    },
  },

  // 5. CINZA ESCURO: Quadro de Aula (Resumo)
  cinza: {
    id: "cinza",
    name: "Cinza Escuro",
    primaryRgb: [24, 24, 27],         // #18181B (Zinc 900)
    secondaryRgb: [39, 39, 42],       // #27272A (Zinc 800)
    subRgb: [63, 63, 70],             // #3F3F46 (Zinc 700)
    minorRgb: [82, 82, 91],           // #52525B (Zinc 600)
    accentRgb: [63, 63, 70],          // #3F3F46
    dividerRgb: [212, 212, 216],      // #D4D4D8 (Zinc 300)
    softBgRgb: [244, 244, 245],       // #F4F4F5 (Zinc 100)
    borderRgb: [212, 212, 216],       // #D4D4D8
    calloutBorderRgb: [63, 63, 70],   // #3F3F46
    calloutBgRgb: [244, 244, 245],    // #F4F4F5
    tableHeaderFillRgb: [39, 39, 42], // #27272A
    tableRowAltRgb: [244, 244, 245],  // #F4F4F5
    badgeBgRgb: [228, 228, 231],      // #E4E4E7
    badgeTextRgb: [24, 24, 27],       // #18181B
    tailwind: {
      primaryText: "text-zinc-900 dark:text-zinc-100",
      secondaryText: "text-zinc-800 dark:text-zinc-200",
      subText: "text-zinc-700 dark:text-zinc-300",
      minorText: "text-zinc-600 dark:text-zinc-400",
      accentBg: "bg-zinc-700",
      dividerBorder: "border-zinc-300 dark:border-zinc-700",
      calloutBorder: "border-zinc-600",
      calloutBg: "bg-zinc-100/70 dark:bg-zinc-900/30",
      tableHeaderBg: "bg-zinc-800 text-white",
      tableRowAltBg: "bg-zinc-100/40 dark:bg-zinc-900/20",
      badgeBg: "bg-zinc-200 dark:bg-zinc-800",
      badgeText: "text-zinc-900 dark:text-zinc-200",
    },
  },

  // Aliases for compatibility
  lavanda: {
    id: "lavanda",
    name: "Lavanda",
    primaryRgb: [88, 28, 135],
    secondaryRgb: [109, 40, 217],
    subRgb: [124, 58, 237],
    minorRgb: [139, 92, 246],
    accentRgb: [124, 58, 237],
    dividerRgb: [221, 214, 254],
    softBgRgb: [250, 245, 255],
    borderRgb: [221, 214, 254],
    calloutBorderRgb: [124, 58, 237],
    calloutBgRgb: [250, 245, 255],
    tableHeaderFillRgb: [88, 28, 135],
    tableRowAltRgb: [250, 245, 255],
    badgeBgRgb: [237, 233, 254],
    badgeTextRgb: [88, 28, 135],
    tailwind: {
      primaryText: "text-purple-900 dark:text-purple-300",
      secondaryText: "text-purple-800 dark:text-purple-400",
      subText: "text-purple-700 dark:text-purple-400",
      minorText: "text-purple-600 dark:text-purple-500",
      accentBg: "bg-purple-600",
      dividerBorder: "border-purple-200 dark:border-purple-800",
      calloutBorder: "border-purple-500",
      calloutBg: "bg-purple-50/70 dark:bg-purple-950/20",
      tableHeaderBg: "bg-purple-800 text-white",
      tableRowAltBg: "bg-purple-50/40 dark:bg-purple-950/10",
      badgeBg: "bg-purple-100 dark:bg-purple-950/50",
      badgeText: "text-purple-800 dark:text-purple-300",
    },
  },

  ardosia: {
    id: "ardosia",
    name: "Ardósia",
    primaryRgb: [15, 23, 42],
    secondaryRgb: [30, 41, 59],
    subRgb: [51, 65, 85],
    minorRgb: [71, 85, 105],
    accentRgb: [37, 99, 235],
    dividerRgb: [203, 213, 225],
    softBgRgb: [248, 250, 252],
    borderRgb: [203, 213, 225],
    calloutBorderRgb: [37, 99, 235],
    calloutBgRgb: [248, 250, 252],
    tableHeaderFillRgb: [30, 41, 59],
    tableRowAltRgb: [248, 250, 252],
    badgeBgRgb: [226, 232, 240],
    badgeTextRgb: [30, 41, 59],
    tailwind: {
      primaryText: "text-slate-900 dark:text-slate-100",
      secondaryText: "text-slate-800 dark:text-slate-200",
      subText: "text-slate-700 dark:text-slate-300",
      minorText: "text-slate-600 dark:text-slate-400",
      accentBg: "bg-blue-600",
      dividerBorder: "border-slate-200 dark:border-slate-800",
      calloutBorder: "border-blue-500",
      calloutBg: "bg-slate-50/70 dark:bg-slate-900/30",
      tableHeaderBg: "bg-slate-800 text-white",
      tableRowAltBg: "bg-slate-50/40 dark:bg-slate-900/20",
      badgeBg: "bg-slate-100 dark:bg-slate-800",
      badgeText: "text-slate-800 dark:text-slate-200",
    },
  },

  ambar: {
    id: "ambar",
    name: "Âmbar",
    primaryRgb: [120, 53, 15],
    secondaryRgb: [146, 64, 14],
    subRgb: [180, 83, 9],
    minorRgb: [217, 119, 6],
    accentRgb: [180, 83, 9],
    dividerRgb: [253, 230, 138],
    softBgRgb: [255, 251, 235],
    borderRgb: [253, 230, 138],
    calloutBorderRgb: [217, 119, 6],
    calloutBgRgb: [255, 251, 235],
    tableHeaderFillRgb: [120, 53, 15],
    tableRowAltRgb: [255, 251, 235],
    badgeBgRgb: [254, 243, 199],
    badgeTextRgb: [146, 64, 14],
    tailwind: {
      primaryText: "text-amber-900 dark:text-amber-300",
      secondaryText: "text-amber-800 dark:text-amber-400",
      subText: "text-amber-700 dark:text-amber-400",
      minorText: "text-amber-600 dark:text-amber-500",
      accentBg: "bg-amber-600",
      dividerBorder: "border-amber-200 dark:border-amber-800",
      calloutBorder: "border-amber-500",
      calloutBg: "bg-amber-50/70 dark:bg-amber-950/20",
      tableHeaderBg: "bg-amber-800 text-white",
      tableRowAltBg: "bg-amber-50/40 dark:bg-amber-950/10",
      badgeBg: "bg-amber-100 dark:bg-amber-950/50",
      badgeText: "text-amber-800 dark:text-amber-300",
    },
  },
};

/**
 * Resolves theme palette based on explicit color/module name or deterministic hash.
 * - "azul" / "atelie" -> Azul
 * - "esmeralda" / "tutoria" -> Esmeralda
 * - "roxo" / "transcricao" -> Roxo
 * - "vermelho" / "audio" / "gravacao" -> Vermelho
 * - "cinza" / "quadro" / "image-reader" -> Cinza Escuro
 */
export function getThemePalette(seedOrTitleOrTheme?: string): ThemePalette {
  if (!seedOrTitleOrTheme) {
    return THEME_PALETTES.azul;
  }

  const normalized = seedOrTitleOrTheme.trim().toLowerCase();

  // Direct matches
  if (normalized === "azul" || normalized.includes("atelie") || normalized.includes("ateliê")) {
    return THEME_PALETTES.azul;
  }
  if (normalized === "esmeralda" || normalized.includes("tutoria")) {
    return THEME_PALETTES.esmeralda;
  }
  if (
    normalized === "roxo" ||
    normalized === "lavanda" ||
    normalized.includes("transcricao") ||
    normalized.includes("transcrição")
  ) {
    return THEME_PALETTES.roxo;
  }
  if (
    normalized === "vermelho" ||
    normalized.includes("audio") ||
    normalized.includes("áudio") ||
    normalized.includes("gravacao") ||
    normalized.includes("gravação")
  ) {
    return THEME_PALETTES.vermelho;
  }
  if (
    normalized === "cinza" ||
    normalized.includes("cinza") ||
    normalized === "ardosia" ||
    normalized.includes("quadro") ||
    normalized.includes("image-reader") ||
    normalized.includes("lousa")
  ) {
    return THEME_PALETTES.cinza;
  }
  if (normalized === "ambar" || normalized === "âmbar") {
    return THEME_PALETTES.ambar;
  }

  // If a known palette key exists
  if (THEME_PALETTES[normalized]) {
    return THEME_PALETTES[normalized];
  }

  // Fallback hash
  const keys = ["azul", "esmeralda", "roxo", "vermelho", "cinza"] as const;
  let hash = 0;
  for (let i = 0; i < seedOrTitleOrTheme.length; i++) {
    hash = (hash << 5) - hash + seedOrTitleOrTheme.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % keys.length;
  return THEME_PALETTES[keys[index]];
}

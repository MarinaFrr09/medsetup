"use client";

import React, { useRef, useState } from "react";
import { Download, Copy, Check, Image as ImageIcon, Sparkles, ArrowDown, ArrowRight, CornerDownRight, Layout, Columns2 } from "lucide-react";
import { toPng } from "html-to-image";
import { exportBoardToPdf } from "@/lib/pdf-export";
import toast from "react-hot-toast";
import MedicalIllustration, { IllustrationType } from "./MedicalIllustration";

export interface FlowStep {
  text: string;
  emphasis?: string;
  illustration?: string;
  arrow?: "down" | "right" | "fork" | "none";
  bulletPoints?: string[];
}

export interface Branch {
  direction?: "down" | "right";
  container?: "dashed_bubble" | "flow_chain" | "card";
  title?: string;
  color?: string;
  bulletPoints?: string[];
  chainSteps?: string[];
  endBadge?: string;
  illustration?: string;
}

export interface SubCluster {
  badgeNumber?: string;
  title?: string;
  bulletPoints?: string[];
  container?: string;
  chainSteps?: string[];
  endBadge?: string;
}

export interface PillItem {
  label: string;
  color?: string;
  subTitle?: string;
  bulletPoints?: string[];
}

export interface BracketList {
  title: string;
  items: string[];
}

export interface BoardCluster {
  id: string;
  title?: string;
  subtitle?: string;
  headerStyle?: "highlighter_pink" | "highlighter_green" | "highlighter_blue" | "highlighter_purple" | "highlighter_amber";
  doodleRays?: boolean;
  badgeNumber?: string;
  container?: "transparent" | "card" | "cloud" | "dashed_bubble" | "bracket";
  dashedHeaderLine?: boolean;
  flowSteps?: FlowStep[];
  branches?: Branch[];
  subClusters?: SubCluster[];
  bracketList?: BracketList;
  pills?: PillItem[];
  bulletPoints?: string[];
  incomingArrow?: { style?: string; label?: string };
  incomingDashedArrow?: { style?: string; label?: string };
  connectorLabel?: string;
}

export interface BoardColumn {
  id: string;
  title?: string;
  clusters: BoardCluster[];
}

export interface BoardData {
  title?: string;
  subtitle?: string;
  themeStyle?: string;
  illustrationType?: IllustrationType | string;
  columns?: BoardColumn[];
  legends?: Array<{ abbr: string; meaning: string }>;

  // legacy fields compat
  layoutType?: "numbered_flow" | "comparison_grid" | "sections_with_sidebar" | "concept_cards" | "flow_tree" | "alert_panels";
  mainSteps?: any[];
  sidePanels?: any[];
  comparisonColumns?: any[];
  conceptCards?: any[];
  branches?: any[];
  alertPanels?: any[];
  footerQuote?: string;
}

interface DigitalBoardProps {
  data: BoardData;
  originalImageUrl?: string | null;
}

const DEFAULT_THEME = {
  id: "studygram_pastel",
  name: "Padrão",
  boardBg: "#FFFFFF",
  frameBorder: "#E2E8F0",
  textPrimary: "#1E293B",
  pink: { bg: "#FCE7F3", text: "#BE185D", border: "#FBCFE8", stroke: "#E11D48" },
  green: { bg: "#DCFCE7", text: "#15803D", border: "#BBF7D0", stroke: "#16A34A" },
  blue: { bg: "#E0F2FE", text: "#0369A1", border: "#BAE6FD", stroke: "#0284C7" },
  purple: { bg: "#F3E8FF", text: "#7E22CE", border: "#E9D5FF", stroke: "#9333EA" },
  amber: { bg: "#FEF3C7", text: "#B45309", border: "#FDE68A", stroke: "#D97706" },
};

// Helper to adapt legacy data format to columns
function adaptLegacyToColumns(data: BoardData): BoardColumn[] {
  if (data.columns && data.columns.length > 0) {
    return data.columns;
  }

  const cols: BoardColumn[] = [];

  // Column 1: Main steps or concept cards
  if (data.mainSteps && data.mainSteps.length > 0) {
    const c1Steps: FlowStep[] = data.mainSteps.map((s: any) => ({
      text: s.title || s.step || "Passo",
      emphasis: s.number ? `(${s.number}º)` : undefined,
      bulletPoints: s.subItems || (s.description ? [s.description] : []),
      arrow: "down",
    }));

    cols.push({
      id: "col_1",
      title: "Fluxo Principal",
      clusters: [
        {
          id: "clust_main",
          title: data.title || "Conduta / Processo",
          headerStyle: "highlighter_pink",
          doodleRays: true,
          flowSteps: c1Steps,
        },
      ],
    });
  } else if (data.conceptCards && data.conceptCards.length > 0) {
    const c1: BoardCluster[] = data.conceptCards.slice(0, 2).map((cc: any, idx: number) => ({
      id: `cc_${idx}`,
      title: cc.title,
      headerStyle: idx === 0 ? "highlighter_pink" : "highlighter_blue",
      bulletPoints: cc.items || [],
      container: "card",
    }));
    cols.push({ id: "col_1", title: "Conceitos", clusters: c1 });
  }

  // Column 2: Side panels or branches
  if (data.sidePanels && data.sidePanels.length > 0) {
    const c2: BoardCluster[] = data.sidePanels.map((sp: any, idx: number) => ({
      id: `sp_${idx}`,
      title: sp.title,
      headerStyle: idx === 0 ? "highlighter_green" : "highlighter_amber",
      doodleRays: true,
      bulletPoints: sp.items || [],
      container: "dashed_bubble",
    }));
    cols.push({ id: "col_2", title: "Rastreamento e Alertas", clusters: c2 });
  }

  // Column 3: Alerts or comparison
  if (data.alertPanels && data.alertPanels.length > 0) {
    const c3: BoardCluster[] = data.alertPanels.map((ap: any, idx: number) => ({
      id: `ap_${idx}`,
      title: ap.title,
      headerStyle: "highlighter_pink",
      container: "cloud",
      bulletPoints: ap.items || [],
    }));
    cols.push({ id: "col_3", title: "Repercussões e Alertas", clusters: c3 });
  }

  if (cols.length === 0) {
    cols.push({
      id: "col_default",
      clusters: [
        {
          id: "clust_default",
          title: data.title || "Quadro Clínico",
          headerStyle: "highlighter_pink",
          doodleRays: true,
          bulletPoints: ["Informações processadas com sucesso."],
        },
      ],
    });
  }

  return cols;
}

// Balance clusters into horizontal columns so the digital whiteboard is genuinely landscape (horizontal)
function balanceClustersToHorizontalColumns(rawCols: BoardColumn[]): BoardColumn[] {
  if (!rawCols || rawCols.length === 0) return [];

  const allClusters: BoardCluster[] = [];
  rawCols.forEach((c) => {
    if (c.clusters && c.clusters.length > 0) {
      allClusters.push(...c.clusters);
    }
  });

  if (allClusters.length === 0) return rawCols;

  // If already 3 or more columns and each column has at most 2 clusters, it is already well-distributed horizontally
  const maxInACol = Math.max(...rawCols.map((c) => c.clusters.length));
  if (rawCols.length >= 3 && maxInACol <= 2) {
    return rawCols;
  }

  // If there are 3 or more clusters, distribute them across 3 (or 4) columns to guarantee horizontal landscape
  if (allClusters.length >= 3) {
    const targetCols = allClusters.length >= 7 ? 4 : 3;
    const balanced: BoardColumn[] = Array.from({ length: targetCols }, (_, i) => ({
      id: `col_h_${i + 1}`,
      title: rawCols[i]?.title || `Coluna ${i + 1}`,
      clusters: [],
    }));

    const basePerCol = Math.floor(allClusters.length / targetCols);
    const remainder = allClusters.length % targetCols;

    let clusterIdx = 0;
    for (let colIdx = 0; colIdx < targetCols; colIdx++) {
      const countForThisCol = basePerCol + (colIdx < remainder ? 1 : 0);
      for (let j = 0; j < countForThisCol; j++) {
        if (clusterIdx < allClusters.length) {
          balanced[colIdx].clusters.push(allClusters[clusterIdx]);
          clusterIdx++;
        }
      }
    }

    return balanced.filter((c) => c.clusters.length > 0);
  }

  return rawCols;
}

export default function DigitalBoard({ data, originalImageUrl }: DigitalBoardProps) {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const currentTheme = DEFAULT_THEME;
  const [viewMode, setViewMode] = useState<"side_by_side" | "board_only">("board_only");

  const title = data.title || "QUADRO DIGITAL DE ESTUDOS";
  const subtitle = data.subtitle || "";
  const rawColumns = adaptLegacyToColumns(data);
  const columns = balanceClustersToHorizontalColumns(rawColumns);

  const colCount = columns.length;
  const gridLayoutClass =
    viewMode === "side_by_side"
      ? colCount <= 2
        ? "grid-cols-1 md:grid-cols-2"
        : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
      : colCount === 1
      ? "grid-cols-1 max-w-2xl mx-auto"
      : colCount === 2
      ? "grid-cols-1 md:grid-cols-2"
      : colCount === 3
      ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
      : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4";

  // Infer micro-illustration
  const inferIllustration = (): string => {
    if (data.illustrationType) return data.illustrationType;
    const str = `${title} ${subtitle}`.toLowerCase();
    if (str.includes("hpv") || str.includes("virus") || str.includes("viral")) return "virus";
    if (str.includes("dna") || str.includes("gen") || str.includes("cromossom")) return "dna";
    if (str.includes("epitel") || str.includes("celula") || str.includes("basal") || str.includes("pele")) return "cells_layer";
    if (str.includes("papanicolau") || str.includes("citolog") || str.includes("lamina")) return "microscope";
    if (str.includes("card") || str.includes("coraç") || str.includes("arter")) return "heart";
    if (str.includes("pulm") || str.includes("respirat") || str.includes("asma")) return "lungs";
    if (str.includes("neuro") || str.includes("cefale") || str.includes("cerebr")) return "brain";
    return "general";
  };

  const illustration = inferIllustration();

  // 1. Download PNG Image (Exact user request: "fazendo literalmente uma imagem de um quadro")
  const handleDownloadPNG = async () => {
    if (!boardRef.current) return;
    setIsExporting(true);
    try {
      const fullWidth = boardRef.current.scrollWidth || boardRef.current.offsetWidth || 1400;
      const fullHeight = boardRef.current.scrollHeight || boardRef.current.offsetHeight || 800;
      const dataUrl = await toPng(boardRef.current, {
        pixelRatio: 2.5,
        backgroundColor: "#FFFFFF",
        cacheBust: true,
        width: fullWidth,
        height: fullHeight,
        style: {
          width: `${fullWidth}px`,
          height: `${fullHeight}px`,
          maxWidth: "none",
          maxHeight: "none",
          margin: "0",
          transform: "none",
        },
      });
      const link = document.createElement("a");
      const cleanName = title.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 30);
      link.download = `quadro-digital-${cleanName}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Imagem do Quadro baixada com sucesso (Alta Resolução PNG)!");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao gerar imagem do quadro.");
    } finally {
      setIsExporting(false);
    }
  };

  // 2. Copy Image directly to clipboard
  const handleCopyImage = async () => {
    if (!boardRef.current) return;
    try {
      const fullWidth = boardRef.current.scrollWidth || boardRef.current.offsetWidth || 1400;
      const fullHeight = boardRef.current.scrollHeight || boardRef.current.offsetHeight || 800;
      const dataUrl = await toPng(boardRef.current, {
        pixelRatio: 2,
        backgroundColor: "#FFFFFF",
        width: fullWidth,
        height: fullHeight,
        style: {
          width: `${fullWidth}px`,
          height: `${fullHeight}px`,
          maxWidth: "none",
          maxHeight: "none",
          margin: "0",
          transform: "none",
        },
      });
      const blob = await (await fetch(dataUrl)).blob();
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setCopied(true);
      toast.success("Imagem do Quadro copiada para a área de transferência!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Não foi possível copiar imagem.");
    }
  };

  // 3. Download PDF (Landscape A4 unclipped proportional fit)
  const handleDownloadPDF = async () => {
    if (!boardRef.current) return;
    setIsExporting(true);
    try {
      const cleanName = title.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 30);
      await exportBoardToPdf({
        boardElement: boardRef.current,
        filename: `quadro-digital-${cleanName}.pdf`,
      });
      toast.success("Quadro salvo em PDF no formato horizontal (Landscape A4 completo sem cortes)!");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao gerar PDF.");
    } finally {
      setIsExporting(false);
    }
  };

  // Resolve palette for a given header style
  const getHeaderTheme = (style?: string) => {
    const s = style || "highlighter_pink";
    if (s.includes("green")) return currentTheme.green;
    if (s.includes("blue")) return currentTheme.blue;
    if (s.includes("purple")) return currentTheme.purple;
    if (s.includes("amber")) return currentTheme.amber;
    return currentTheme.pink;
  };

  return (
    <div className="space-y-6">
      {/* Top Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-[#1A1D27] p-4 rounded-2xl border border-gray-200 dark:border-[#2a2d3a] shadow-xs">
        {/* Single View Mode Toggle */}
        <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-1 rounded-xl border border-gray-200/60 dark:border-gray-700/60">
          <button
            type="button"
            onClick={() => setViewMode("board_only")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === "board_only"
                ? "bg-white dark:bg-[#1A1D27] text-blue-600 dark:text-blue-400 shadow-2xs"
                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            <Layout className="w-3.5 h-3.5" />
            <span>Apenas Quadro</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("side_by_side")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === "side_by_side"
                ? "bg-white dark:bg-[#1A1D27] text-blue-600 dark:text-blue-400 shadow-2xs"
                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            <Columns2 className="w-3.5 h-3.5" />
            <span>Lado a Lado</span>
          </button>
        </div>

        {/* Export buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleCopyImage}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer shadow-2xs"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copiado!" : "Copiar Imagem"}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPNG}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs cursor-pointer disabled:opacity-50 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? "Gerando Imagem..." : "Baixar Imagem (PNG)"}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white rounded-xl shadow-xs cursor-pointer disabled:opacity-50 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Salvar em PDF</span>
          </button>
        </div>
      </div>

      {/* Main Container Area */}
      <div
        className={`w-full ${
          viewMode === "side_by_side"
            ? "grid grid-cols-1 lg:grid-cols-2 gap-6 items-start"
            : "w-full flex justify-center"
        }`}
      >
        {/* Original photo preview (when side-by-side) */}
        {viewMode === "side_by_side" && (
          <div className="bg-white dark:bg-[#1A1D27] rounded-3xl border border-gray-200 dark:border-[#2a2d3a] p-5 shadow-sm flex flex-col sticky top-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                <ImageIcon className="w-4 h-4 text-blue-500" /> Foto Original do Quadro (Enviada)
              </div>
              {originalImageUrl && (
                <a
                  href={originalImageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline"
                >
                  Abrir imagem ampliada ↗
                </a>
              )}
            </div>
            {originalImageUrl ? (
              <div className="rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-2 flex items-center justify-center flex-1 min-h-[450px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={originalImageUrl}
                  alt="Foto original do quadro"
                  className="w-full h-auto object-contain max-h-[80vh] rounded-xl shadow-xs"
                />
              </div>
            ) : (
              <div className="rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 p-8 flex flex-col items-center justify-center text-center flex-1 min-h-[350px] bg-gray-50/50 dark:bg-gray-900/50">
                <ImageIcon className="w-10 h-10 text-gray-400 mb-3" />
                <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
                  Nenhuma foto enviada nesta sessão
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs">
                  Quando você envia uma foto no topo, ela é exibida aqui lado a lado com o quadro digital para comparação direta.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ─── O QUADRO BRANCO DIGITALIZADO E DIGITADO (PADRÃO STUDYGRAM) ─── */}
        <div className="w-full flex justify-center overflow-x-auto p-1">
          <div
            ref={boardRef}
            className="w-full rounded-3xl select-none relative shadow-xl overflow-hidden transition-all"
            style={{
              maxWidth: viewMode === "side_by_side" ? "100%" : "1400px",
              minHeight: "700px",
              backgroundColor: currentTheme.boardBg,
              border: `4px solid ${currentTheme.frameBorder}`,
              color: currentTheme.textPrimary,
              padding: viewMode === "side_by_side" ? "28px 24px" : "36px 40px",
              fontFamily: "'Nunito', 'Inter', -apple-system, sans-serif",
              boxSizing: "border-box",
            }}
          >
            {/* Whiteboard Dry-Erase Frame Accents */}
            <div className="absolute top-2 left-4 flex items-center gap-1.5 opacity-40">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
            </div>
            <div className="absolute top-2 right-4 text-[10px] uppercase font-black tracking-widest text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-rose-400" />
              Quadro Digital • MedSetup
            </div>

            {/* ─── TOPO DO QUADRO: TÍTULO, SUBTÍTULO E ILUSTRAÇÃO ─── */}
            <div className="flex items-start justify-between gap-6 pb-6 mb-8 border-b-2 border-dashed border-slate-200">
              <div className="flex-1">
                {/* Main Topic Header with Pastel Marker Brush and Doodle Rays */}
                <div className="inline-flex items-center gap-3 relative">
                  {/* Left Doodle Rays */}
                  <div className="flex flex-col gap-0.5 text-rose-400 font-bold select-none text-xs -rotate-12">
                    <span>//</span>
                  </div>

                  <h1
                    className="font-handwriting font-bold text-3xl sm:text-4xl px-4 py-1.5 rounded-2xl tracking-wide shadow-2xs inline-block"
                    style={{
                      backgroundColor: currentTheme.pink.bg,
                      color: currentTheme.pink.text,
                      border: `1.5px solid ${currentTheme.pink.border}`,
                    }}
                  >
                    {title}
                  </h1>

                  {/* Right Doodle Rays */}
                  <div className="flex flex-col gap-0.5 text-rose-400 font-bold select-none text-xs rotate-12">
                    <span>\\</span>
                  </div>
                </div>

                {subtitle && (
                  <p className="text-sm font-bold text-slate-600 mt-2 max-w-2xl leading-relaxed">
                    {subtitle}
                  </p>
                )}
              </div>

              {/* Medical / Scientific Micro-Illustration */}
              <div className="flex-shrink-0 bg-white/90 p-2 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-center">
                <MedicalIllustration type={illustration} size={76} color={currentTheme.pink.stroke} />
              </div>
            </div>

            {/* ─── COLUNAS DO QUADRO (DISTRIBUIÇÃO ESPACIAL REAL) ─── */}
            <div className={`grid gap-6 sm:gap-8 items-start ${gridLayoutClass}`}>
              {columns.map((col, colIdx) => (
                <div key={col.id || colIdx} className="space-y-6 flex flex-col">
                  {col.clusters.map((cluster, cIdx) => {
                    const cTheme = getHeaderTheme(cluster.headerStyle);
                    const isCloud = cluster.container === "cloud" || cluster.headerStyle?.includes("cloud");
                    const isDashed = cluster.container === "dashed_bubble";
                    const isCard = cluster.container === "card";

                    return (
                      <div
                        key={cluster.id || cIdx}
                        className={`transition-all relative ${
                          isCloud
                            ? "cloud-border p-5 border-2 border-rose-300 bg-rose-50/50 text-slate-800"
                            : isDashed
                            ? "rounded-3xl p-5 border-2 border-dashed border-purple-300 bg-purple-50/40 text-slate-800"
                            : isCard
                            ? "rounded-2xl p-5 border-2 border-sky-200 bg-sky-50/40 text-slate-800"
                            : "space-y-4"
                        }`}
                      >
                        {/* Incoming bold arrow indicator */}
                        {cluster.incomingArrow && (
                          <div className="flex items-center gap-2 mb-2 text-emerald-700 font-bold text-xs">
                            <span className="text-xl">➔</span>
                            <span className="bg-emerald-100 px-2.5 py-0.5 rounded-lg border border-emerald-300">
                              {cluster.incomingArrow.label || "progressão"}
                            </span>
                          </div>
                        )}

                        {/* Incoming dashed rose arrow */}
                        {cluster.incomingDashedArrow && (
                          <div className="flex items-center gap-2 mb-2 text-rose-500 font-bold text-xs">
                            <span className="text-base">- - ➔</span>
                            <span>{cluster.incomingDashedArrow.label}</span>
                          </div>
                        )}

                        {/* Cluster Header / Title */}
                        {cluster.title && (
                          <div className="flex items-center gap-2 flex-wrap mb-3">
                            {cluster.badgeNumber && (
                              <div
                                className="w-7 h-7 rounded-full border-2 flex items-center justify-center font-bold text-xs shadow-2xs"
                                style={{
                                  borderColor: cTheme.stroke,
                                  color: cTheme.text,
                                  backgroundColor: cTheme.bg,
                                }}
                              >
                                {cluster.badgeNumber}
                              </div>
                            )}

                            <div className="inline-flex items-center gap-1.5">
                              {cluster.doodleRays && (
                                <span className="text-xs font-bold" style={{ color: cTheme.stroke }}>
                                  //
                                </span>
                              )}
                              <h3
                                className="font-handwriting font-bold text-xl sm:text-2xl px-3 py-1 rounded-xl shadow-2xs inline-block"
                                style={{
                                  backgroundColor: cTheme.bg,
                                  color: cTheme.text,
                                  border: `1.5px solid ${cTheme.border}`,
                                }}
                              >
                                {cluster.title}
                              </h3>
                              {cluster.subtitle && (
                                <span className="text-xs font-bold text-slate-500 ml-1">
                                  {cluster.subtitle}
                                </span>
                              )}
                              {cluster.doodleRays && (
                                <span className="text-xs font-bold" style={{ color: cTheme.stroke }}>
                                  \\
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Connector Label (e.g. "expressão de proteínas oncogênicas") */}
                        {cluster.connectorLabel && (
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-3 bg-white/80 p-2 rounded-xl border border-slate-200">
                            <span className="text-emerald-600 font-black text-sm">➔</span>
                            <span>{cluster.connectorLabel}</span>
                          </div>
                        )}

                        {/* 1. Sequential Flow Steps with Downward SVG Arrows */}
                        {cluster.flowSteps && cluster.flowSteps.length > 0 && (
                          <div className="space-y-2">
                            {cluster.flowSteps.map((step, sIdx) => (
                              <div key={sIdx} className="space-y-2">
                                <div className="flex items-start gap-3 bg-white/90 p-3 rounded-2xl border border-slate-200 shadow-2xs">
                                  {step.illustration && (
                                    <div className="flex-shrink-0 mt-0.5 p-1 bg-slate-50 rounded-xl border border-slate-100">
                                      <MedicalIllustration type={step.illustration} size={36} color={cTheme.stroke} />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="font-bold text-sm text-slate-900 leading-snug">
                                      {step.text}{" "}
                                      {step.emphasis && (
                                        <span className="font-extrabold ml-1 px-1.5 py-0.5 rounded-md text-xs" style={{ backgroundColor: cTheme.bg, color: cTheme.text }}>
                                          {step.emphasis}
                                        </span>
                                      )}
                                    </div>
                                    {step.bulletPoints && step.bulletPoints.length > 0 && (
                                      <ul className="mt-1 space-y-0.5">
                                        {step.bulletPoints.map((bp, bpIdx) => (
                                          <li key={bpIdx} className="flex items-start gap-1.5 text-xs text-slate-700 font-semibold">
                                            <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: cTheme.stroke }} />
                                            <span>{bp}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                  </div>
                                </div>

                                {step.arrow === "down" && (
                                  <div className="flex justify-center text-slate-400 my-1">
                                    <ArrowDown className="w-4 h-4 text-slate-400 stroke-[2.5]" />
                                  </div>
                                )}
                                {step.arrow === "fork" && (
                                  <div className="flex justify-around text-slate-400 my-1">
                                    <CornerDownRight className="w-4 h-4 text-slate-400 stroke-[2.5]" />
                                    <ArrowDown className="w-4 h-4 text-slate-400 stroke-[2.5]" />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* 2. Branches (e.g. Infecções Transitórias vs Replicação) */}
                        {cluster.branches && cluster.branches.length > 0 && (
                          <div className="space-y-4 pt-2">
                            {cluster.branches.map((br, brIdx) => {
                              const bTheme = getHeaderTheme(br.color);

                              if (br.container === "dashed_bubble") {
                                return (
                                  <div
                                    key={brIdx}
                                    className="rounded-3xl p-4 border-2 border-dashed border-purple-300 bg-purple-50/50 text-slate-900 shadow-2xs"
                                  >
                                    <div className="font-handwriting font-bold text-lg text-purple-900 mb-2 flex items-center gap-1.5">
                                      <span>//</span>
                                      <span>{br.title || "Infecções transitórias"}</span>
                                      <span>\\</span>
                                    </div>
                                    {br.bulletPoints && (
                                      <ul className="space-y-1">
                                        {br.bulletPoints.map((it, iIdx) => (
                                          <li key={iIdx} className="flex items-start gap-2 text-xs font-bold text-slate-700">
                                            <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 bg-purple-500" />
                                            <span>{it}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                  </div>
                                );
                              }

                              // flow_chain (lateral differentiation flow)
                              if (br.chainSteps && br.chainSteps.length > 0) {
                                return (
                                  <div key={brIdx} className="bg-white/95 rounded-2xl p-4 border border-rose-200 shadow-2xs space-y-2">
                                    {br.title && (
                                      <div className="font-bold text-xs text-rose-800 uppercase tracking-wider mb-1">
                                        {br.title}
                                      </div>
                                    )}
                                    {br.chainSteps.map((st, stIdx) => (
                                      <div key={stIdx} className="space-y-1.5">
                                        <div className="text-xs font-bold text-slate-800 bg-rose-50/60 p-2 rounded-xl border border-rose-100 flex items-center gap-2">
                                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0" />
                                          <span>{st}</span>
                                        </div>
                                        {stIdx < br.chainSteps!.length - 1 && (
                                          <div className="flex justify-center text-rose-400">
                                            <ArrowDown className="w-3.5 h-3.5" />
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                    {br.endBadge && (
                                      <div className="pt-2 flex items-center justify-between border-t border-rose-100 mt-2">
                                        <span className="font-handwriting font-bold text-base text-rose-600 px-3 py-1 rounded-xl bg-rose-100 border border-rose-200 shadow-2xs">
                                          {br.endBadge}
                                        </span>
                                        {br.illustration && (
                                          <MedicalIllustration type={br.illustration} size={36} color="#E11D48" />
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              }

                              return null;
                            })}
                          </div>
                        )}

                        {/* 3. SubClusters (e.g. Rastreamento steps, bracket lists) */}
                        {cluster.subClusters && cluster.subClusters.length > 0 && (
                          <div className="space-y-4 pt-1">
                            {cluster.subClusters.map((sub, scIdx) => (
                              <div key={scIdx} className="bg-white/90 p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                                <div className="flex items-center gap-2">
                                  {sub.badgeNumber && (
                                    <div className="w-6 h-6 rounded-full border-2 border-emerald-500 bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold text-xs flex-shrink-0">
                                      {sub.badgeNumber}
                                    </div>
                                  )}
                                  <h4 className="font-bold text-xs text-slate-900 leading-tight">
                                    {sub.title}
                                  </h4>
                                </div>
                                {sub.bulletPoints && (
                                  <ul className="space-y-1 pl-1">
                                    {sub.bulletPoints.map((bp, bpIdx) => (
                                      <li key={bpIdx} className="flex items-start gap-1.5 text-xs text-slate-700 font-semibold">
                                        <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 bg-emerald-500" />
                                        <span>{bp}</span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                                {sub.chainSteps && (
                                  <div className="space-y-1.5 pt-1">
                                    {sub.chainSteps.map((cs, csIdx) => (
                                      <div key={csIdx} className="text-xs font-semibold text-slate-800 bg-slate-50 p-2 rounded-xl border border-slate-200 flex items-center gap-2">
                                        <ArrowRight className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                                        <span>{cs}</span>
                                      </div>
                                    ))}
                                    {sub.endBadge && (
                                      <div className="pt-1.5">
                                        <span className="text-xs font-extrabold px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 border border-rose-300 inline-block">
                                          {sub.endBadge}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* 4. Bracket List (e.g. Epithelial cell layers) */}
                        {cluster.bracketList && (
                          <div className="bg-white/95 rounded-2xl p-4 border border-sky-200 shadow-2xs">
                            <div className="font-bold text-xs text-sky-900 mb-2">
                              {cluster.bracketList.title}
                            </div>
                            <div className="flex items-center gap-3">
                              {/* Curly Bracket SVG */}
                              <div className="text-3xl font-light text-sky-400 select-none">{"{"}</div>
                              <ul className="space-y-1 flex-1">
                                {cluster.bracketList.items.map((it, itIdx) => (
                                  <li key={itIdx} className="flex items-center gap-2 text-xs font-bold text-slate-700">
                                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500 flex-shrink-0" />
                                    <span>{it}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}

                        {/* 5. Pills (e.g. E5, E6, E7 oncogenic proteins) */}
                        {cluster.pills && cluster.pills.length > 0 && (
                          <div className="pt-2 space-y-3">
                            <div className="grid grid-cols-3 gap-2">
                              {cluster.pills.map((pill, pIdx) => (
                                <div
                                  key={pIdx}
                                  className="text-center py-1.5 px-2 rounded-xl font-black text-sm bg-emerald-100 text-emerald-900 border-2 border-emerald-300 shadow-2xs"
                                >
                                  {pill.label}
                                </div>
                              ))}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                              {cluster.pills.map((pill, pIdx) => (
                                <div key={pIdx} className="bg-white/90 p-3 rounded-2xl border border-emerald-200 shadow-2xs space-y-1">
                                  <div className="font-bold text-xs text-emerald-800">
                                    [{pill.label}] {pill.subTitle}
                                  </div>
                                  {pill.bulletPoints && (
                                    <ul className="space-y-0.5">
                                      {pill.bulletPoints.map((bp, bpIdx) => (
                                        <li key={bpIdx} className="text-[11px] font-semibold text-slate-700 flex items-start gap-1.5">
                                          <span className="w-1 h-1 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                                          <span>{bp}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 6. General Bullet Points (e.g. Alterações no epitélio) */}
                        {cluster.bulletPoints && cluster.bulletPoints.length > 0 && !cluster.branches && (
                          <ul className="space-y-1.5 pt-1">
                            {cluster.bulletPoints.map((bp, bpIdx) => (
                              <li key={bpIdx} className="flex items-start gap-2 text-xs font-bold text-slate-800">
                                <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: cTheme.stroke }} />
                                <span>{bp}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* ─── RODAPÉ DO QUADRO: LEGENDAS E NOTAS ─── */}
            {data.legends && data.legends.length > 0 && (
              <div className="mt-10 pt-4 border-t-2 border-dashed border-slate-200 flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-600">
                <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">
                  Termos Desabreviados:
                </span>
                {data.legends.map((lg, lgIdx) => (
                  <div key={lgIdx} className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg">
                    <span className="font-extrabold text-slate-800">{lg.abbr}:</span>
                    <span>{lg.meaning}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  CheckCircle2, 
  FileText, 
  Lightbulb, 
  ListCollapse, 
  GitBranch, 
  Copy, 
  Check, 
  ExternalLink,
  MessageSquareText,
  Sparkles,
  Zap,
  Loader2
} from "lucide-react";
import { useAppStore, MindMapItem } from "@/stores/useAppStore";
import toast from "react-hot-toast";
import TranscriptionDocumentViewer from "@/components/transcription/TranscriptionDocumentViewer";
import { normalizeMindMapNodesAndEdges } from "@/lib/mindmap-layout";

interface MindMapData {
  title?: string;
  nodes?: Array<{ id: string; label: string; type?: string; color?: string; position?: { x: number; y: number } }>;
  edges?: Array<{ id: string; source: string; target: string; type?: string }>;
}

interface TranscriptViewProps {
  data: {
    title?: string;
    rawTranscript?: string;
    cleanTranscript?: string;
    summary?: string;
    keyPoints?: string[];
    topics?: Array<{ title: string; content: string }>;
    mindMap?: MindMapData;
    expanded?: boolean;
  };
  onSaveAsMindMap?: () => void;
}

export default function TranscriptView({ data, onSaveAsMindMap }: TranscriptViewProps) {
  const router = useRouter();
  const { addMindMap, updateAudioRecording, audioRecordings } = useAppStore();
  const [activeTab, setActiveTab] = useState<"summary" | "mindmap" | "transcript">("summary");
  const [copied, setCopied] = useState(false);
  const [localSummary, setLocalSummary] = useState(data.summary || "");
  const [localTitle, setLocalTitle] = useState(data.title || "Resumo da Aula");
  const [localExpanded, setLocalExpanded] = useState(data.expanded || false);
  const [localMindMap, setLocalMindMap] = useState<MindMapData | undefined>(data.mindMap);
  const [isExpandingSummary, setIsExpandingSummary] = useState(false);
  const [isExpandingMindMap, setIsExpandingMindMap] = useState(false);

  // Keep local state in sync when data changes
  useEffect(() => {
    setLocalSummary(data.summary || "");
    setLocalTitle(data.title || "Resumo da Aula");
    setLocalExpanded(data.expanded || false);
    setLocalMindMap(data.mindMap);
  }, [data.summary, data.title, data.expanded, data.mindMap]);

  const handleSaveEditedSummary = (newContent: string, newTitle: string) => {
    setLocalSummary(newContent);
    setLocalTitle(newTitle);

    const existingRec = audioRecordings.find(
      (r) => r.processedData === data || r.title === data.title || r.title === localTitle
    );
    if (existingRec) {
      updateAudioRecording(existingRec.id, {
        title: newTitle,
        processedData: {
          ...existingRec.processedData,
          title: newTitle,
          summary: newContent,
          expanded: localExpanded,
        },
      });
    }
    toast.success("Resumo e título salvos com sucesso!");
  };

  const handleExpandSummary = async () => {
    setIsExpandingSummary(true);
    try {
      const textToExpand =
        data.cleanTranscript || data.rawTranscript || localSummary || data.summary || "";

      const res = await fetch("/api/ai/generate-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: textToExpand,
          expand: true,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Falha ao expandir resumo");
      }

      const json = await res.json();
      if (json.summary) {
        setLocalSummary(json.summary);
        setLocalExpanded(true);

        const existingRec = audioRecordings.find(
          (r) => r.processedData === data || r.title === data.title || r.title === localTitle
        );
        if (existingRec) {
          updateAudioRecording(existingRec.id, {
            processedData: {
              ...existingRec.processedData,
              summary: json.summary,
              expanded: true,
            },
          });
        }
        toast.success("Resumo Completo expandido e aprofundado com sucesso!");
      }
    } catch (err: any) {
      console.error("Erro expandindo resumo:", err);
      toast.error(err?.message || "Erro ao expandir resumo com IA.");
    } finally {
      setIsExpandingSummary(false);
    }
  };

  const handleExpandMindMap = async () => {
    setIsExpandingMindMap(true);
    try {
      const textToExpand =
        data.cleanTranscript || data.rawTranscript || localSummary || data.title || "";

      const res = await fetch("/api/ai/generate-mindmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Tema: ${localTitle || data.title}.\nConteúdo da Aula:\n${textToExpand.slice(0, 3500)}`,
          expand: true,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Falha ao expandir mapa mental");
      }

      const json = await res.json();
      if (json.nodes) {
        const updatedMindMap: MindMapData = {
          title: json.title || data.mindMap?.title || data.title,
          nodes: json.nodes,
          edges: json.edges || [],
        };
        setLocalMindMap(updatedMindMap);
        setLocalExpanded(true);

        const existingRec = audioRecordings.find(
          (r) => r.processedData === data || r.title === data.title || r.title === localTitle
        );
        if (existingRec) {
          updateAudioRecording(existingRec.id, {
            processedData: {
              ...existingRec.processedData,
              mindMap: updatedMindMap,
              expanded: true,
            },
          });
        }
        toast.success("Mapa Mental expandido com ramificações profundas!");
      }
    } catch (err: any) {
      console.error("Erro expandindo mapa mental:", err);
      toast.error(err?.message || "Erro ao expandir mapa mental com IA.");
    } finally {
      setIsExpandingMindMap(false);
    }
  };

  const handleCopySummary = () => {
    const textToCopy = `${localTitle || data.title || "Resumo da Aula"}\n\n${localSummary || data.summary || ""}\n\nPontos-Chave:\n${(data.keyPoints || []).map((p) => `- ${p}`).join("\n")}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    toast.success("Resumo copiado para a área de transferência!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenInEditor = () => {
    const mindMapData = localMindMap || data.mindMap;
    if (!mindMapData) {
      toast.error("Nenhum mapa mental disponível para abrir.");
      return;
    }

    const newId = Date.now().toString();
    const mapTitle = mindMapData.title || localTitle || data.title || "Mapa Mental da Aula";
    const rawNodes = mindMapData.nodes || [];
    const rawEdges = mindMapData.edges || [];

    // Ensure all nodes and edges are normalized with valid coordinates before saving & navigating
    const { nodes: positionedNodes, edges: positionedEdges } = normalizeMindMapNodesAndEdges(
      rawNodes,
      rawEdges,
      mapTitle
    );

    const newMap: MindMapItem = {
      id: newId,
      name: mapTitle,
      description: localSummary || data.summary || "Mapa mental gerado a partir da gravação de aula.",
      layout: "right",
      colorTheme: "blue",
      date: new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }),
      nodes: positionedNodes,
      edges: positionedEdges,
    };

    addMindMap(newMap);
    try {
      localStorage.setItem(`mindmap_${newId}`, JSON.stringify(newMap));
    } catch (e) {}

    toast.success("Mapa mental salvo! Abrindo editor...");
    router.push(`/mindmaps/${newId}`);
  };

  return (
    <div className="bg-white dark:bg-[#1A1D27] rounded-2xl border border-gray-200 dark:border-[#2a2d3a] overflow-hidden shadow-sm">
      {/* Header with Title and Tabs */}
      <div className="p-6 border-b border-gray-100 dark:border-[#2a2d3a] flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-50/40 via-purple-50/30 to-transparent dark:from-blue-950/20 dark:via-purple-950/10 dark:to-transparent">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 px-2.5 py-0.5 rounded-full border border-blue-200/60 dark:border-blue-800/40">
              <Sparkles className="w-3 h-3" /> Síntese Estruturada
            </span>
            {(localExpanded || data.expanded) && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500 text-white shadow-2xs">
                <Zap className="w-3 h-3 fill-white" /> CONTEÚDO EXPANDIDO
              </span>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-2">
            {localTitle || data.title || "Resumo da Aula"}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm mt-1">
            Conteúdo processado e organizado em tópicos claros para estudo eficiente.
          </p>
        </div>

        {/* Tab Switcher & Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopySummary}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors border border-gray-200 dark:border-[#2a2d3a] cursor-pointer shadow-sm"
          >
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? "Copiado" : "Copiar Resumo"}</span>
          </button>
        </div>
      </div>

      {/* Expanded Badge Banner */}
      {(localExpanded || data.expanded) && (
        <div className="mx-6 mt-4 flex items-center gap-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 px-4 py-2.5 rounded-xl text-xs font-bold shadow-2xs">
          <Zap className="w-4 h-4 flex-shrink-0 fill-amber-500 text-amber-500" />
          <span>Conteúdo Expandido — informações ricas, didáticas e aprofundadas com mapa mental completo.</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200 dark:border-[#2a2d3a] px-6 bg-gray-50 dark:bg-[#0F1117]/50 gap-2 items-center justify-between">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("summary")}
            className={`flex items-center gap-2 py-3 px-4 text-xs sm:text-sm font-medium border-b-2 transition-all cursor-pointer ${
              activeTab === "summary"
                ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 font-semibold"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Resumo Completo</span>
            {(localExpanded || data.expanded) && (
              <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("mindmap")}
            className={`flex items-center gap-2 py-3 px-4 text-xs sm:text-sm font-medium border-b-2 transition-all cursor-pointer ${
              activeTab === "mindmap"
                ? "border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400 font-semibold"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            <GitBranch className="w-4 h-4" />
            <span>Mapa Mental</span>
            {(localExpanded || data.expanded) && (
              <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("transcript")}
            className={`flex items-center gap-2 py-3 px-4 text-xs sm:text-sm font-medium border-b-2 transition-all cursor-pointer ${
              activeTab === "transcript"
                ? "border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400 font-semibold"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            <MessageSquareText className="w-4 h-4" />
            <span>Transcrição</span>
          </button>
        </div>
      </div>

      {/* Tab Contents */}
      <div className="p-6">
        {/* TAB 1: RESUMO COMPLETO FORMATADO NO MODELO DE TRANSCRIÇÃO E ATELIÊ */}
        {activeTab === "summary" && (
          <div className="space-y-6">
            {/* Document Viewer exatamente no mesmo modelo de Transcrição e Ateliê com paleta vermelha */}
            <TranscriptionDocumentViewer
              content={localSummary || data.summary || "Resumo detalhado gerado com sucesso."}
              title={localTitle || data.title}
              editable={true}
              theme="vermelho"
              categoryLabel="Gravacao"
              onSaveContent={(newContent) => handleSaveEditedSummary(newContent, localTitle)}
            />

            {/* Pontos-Chave */}
            {data.keyPoints && data.keyPoints.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3.5 text-emerald-600 dark:text-emerald-400">
                  <Lightbulb className="w-5 h-5" />
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    Pontos-Chave para Memorização
                  </h3>
                </div>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {data.keyPoints.map((point, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 p-3.5 rounded-xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 shadow-xs"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-800 dark:text-gray-200 text-xs sm:text-sm font-medium leading-relaxed">
                        {point}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Tópicos Abordados */}
            {data.topics && data.topics.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3.5 text-purple-600 dark:text-purple-400">
                  <ListCollapse className="w-5 h-5" />
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    Tópicos Aprofundados
                  </h3>
                </div>
                <div className="space-y-3">
                  {data.topics.map((topic, i) => (
                    <details
                      key={i}
                      open={i === 0}
                      className="group bg-gray-50 dark:bg-[#0F1117]/60 rounded-xl border border-gray-200 dark:border-[#2a2d3a] overflow-hidden"
                    >
                      <summary className="flex cursor-pointer items-center justify-between p-4 font-semibold text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800/40 transition-colors text-sm">
                        <span>{topic.title}</span>
                        <span className="text-gray-400 group-open:rotate-180 transition-transform text-xs">
                          ▼
                        </span>
                      </summary>
                      <div className="px-4 pb-4 text-gray-600 dark:text-gray-300 text-xs sm:text-sm leading-relaxed border-t border-gray-100 dark:border-gray-800 pt-3">
                        {topic.content}
                      </div>
                    </details>
                  ))}
                </div>
              </section>
            )}

            {/* Botão Expandir Resumo Completo (Posicionado na Parte Inferior) */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-blue-50/60 via-amber-50/40 to-transparent dark:from-blue-950/20 dark:via-amber-950/10 dark:to-transparent p-4 rounded-2xl border border-blue-100 dark:border-[#2a2d3a] mt-6">
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white text-xs sm:text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Aprofundar Resumo da Aula com IA</span>
                  {(localExpanded || data.expanded) && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white flex items-center gap-1">
                      <Zap className="w-2.5 h-2.5 fill-white" /> EXPANDIDO
                    </span>
                  )}
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {(localExpanded || data.expanded)
                    ? "Versão aprofundada com mecanismos detalhados, contexto clínico e explicações completas."
                    : "Gere uma expansão completa com mecanismos aprofundados, correlações e tópicos extras."}
                </p>
              </div>

              <button
                type="button"
                onClick={handleExpandSummary}
                disabled={isExpandingSummary}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-sm cursor-pointer disabled:opacity-60 ${
                  localExpanded || data.expanded
                    ? "bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700"
                    : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-amber-500/20"
                }`}
              >
                {isExpandingSummary ? (
                  <Loader2 className="w-4 h-4 animate-spin text-current" />
                ) : (
                  <Zap className={`w-4 h-4 ${localExpanded || data.expanded ? "text-amber-600 fill-amber-600" : "fill-white text-white"}`} />
                )}
                <span>
                  {isExpandingSummary
                    ? "Expandindo Resumo..."
                    : localExpanded || data.expanded
                    ? "Re-expandir Resumo (IA)"
                    : "Expandir Resumo Completo (IA)"}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: MAPA MENTAL GERADO */}
        {activeTab === "mindmap" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-purple-50 dark:bg-purple-950/20 p-4 rounded-xl border border-purple-200 dark:border-purple-900/40">
              <div>
                <h4 className="font-semibold text-purple-900 dark:text-purple-300 flex items-center gap-2 text-sm">
                  <GitBranch className="w-4 h-4" />
                  <span>Mapa Mental Estruturado da Aula</span>
                  {(localExpanded || data.expanded) && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white flex items-center gap-1">
                      <Zap className="w-2.5 h-2.5 fill-white" /> EXPANDIDO
                    </span>
                  )}
                </h4>
                <p className="text-xs text-purple-700 dark:text-purple-400 mt-0.5">
                  Conexões e ramificações conceituais extraídas do áudio
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Botão Expandir Mapa Mental (Idêntico ao da Leitura de Imagem) */}
                <button
                  type="button"
                  onClick={handleExpandMindMap}
                  disabled={isExpandingMindMap}
                  className={`flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-60 ${
                    localExpanded || data.expanded
                      ? "bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700"
                      : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-amber-500/20"
                  }`}
                >
                  {isExpandingMindMap ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-current" />
                  ) : (
                    <Zap className={`w-3.5 h-3.5 ${localExpanded || data.expanded ? "text-amber-600 fill-amber-600" : "fill-white text-white"}`} />
                  )}
                  <span>
                    {isExpandingMindMap
                      ? "Expandindo Mapa..."
                      : localExpanded || data.expanded
                      ? "Re-expandir Mapa (IA)"
                      : "Expandir Mapa Mental (IA)"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenInEditor}
                  className="flex items-center justify-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-xs font-medium transition-colors shadow-sm cursor-pointer"
                >
                  <span>Abrir no Editor</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Visual Mind Map Concept Tree */}
            <div className="p-6 bg-gray-50 dark:bg-[#0F1117] rounded-xl border border-gray-200 dark:border-[#2a2d3a] flex flex-col items-center">
              {/* Central Node */}
              <div className="px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-2xl shadow-lg text-center max-w-sm text-sm sm:text-base">
                {localMindMap?.title || data.mindMap?.title || localTitle || data.title || "Tema da Aula"}
              </div>

              <div className="w-0.5 h-6 bg-gray-300 dark:bg-gray-700 my-1" />

              {/* Subnodes Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full mt-2">
                {((localMindMap?.nodes && localMindMap.nodes.length > 1)
                  ? localMindMap.nodes.filter((n) => n.id !== "1" && n.id !== "root")
                  : (data.mindMap?.nodes && data.mindMap.nodes.length > 1)
                  ? data.mindMap.nodes.filter((n) => n.id !== "1" && n.id !== "root")
                  : (data.topics || []).map((t, idx) => ({
                      id: `t-${idx}`,
                      label: t.title,
                      color: idx % 2 === 0 ? "#10B981" : "#8B5CF6",
                    }))
                ).map((node: any, idx: number) => (
                  <div
                    key={node.id || idx}
                    className="p-4 rounded-xl bg-white dark:bg-[#1A1D27] border-2 shadow-sm flex flex-col justify-between"
                    style={{ borderColor: node.data?.color || node.color || "#3B82F6" }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: node.data?.color || node.color || "#3B82F6" }}
                      />
                      <h5 className="font-semibold text-xs sm:text-sm text-gray-900 dark:text-white">
                        {node.data?.label || node.label}
                      </h5>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: TRANSCRIÇÃO LIMPA */}
        {activeTab === "transcript" && (
          <div className="space-y-4">
            <div className="p-5 bg-gray-50 dark:bg-[#0F1117] rounded-xl border border-gray-200 dark:border-[#2a2d3a]">
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Transcrição Completa e Polida:
              </h4>
              <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap font-sans">
                {data.cleanTranscript || data.rawTranscript || "Transcrição da aula processada com sucesso."}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

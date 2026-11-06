"use client";

import React, { useRef, useState, useMemo, useCallback, useEffect } from "react";
import {
  ReactFlow,
  Background,
  MiniMap,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
  Node,
  Edge,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  GitBranch,
  ArrowRight,
  Sparkles,
  Save,
  FileDown,
  Maximize2,
  Plus,
  Minus,
  Map as MapIcon,
  Check,
  ExternalLink,
  Layers,
  BookOpen,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAppStore, MindMapItem } from "@/stores/useAppStore";
import { exportMindMapToPdf } from "@/lib/pdf-export";
import { calculateBalancedMindMapLayout, RawMindMapNode, DEFAULT_MINDMAP_PALETTE } from "@/lib/mindmap-layout";
import TopicNode from "@/components/mindmap/NodeTypes/TopicNode";
import SubtopicNode from "@/components/mindmap/NodeTypes/SubtopicNode";
import NoteNode from "@/components/mindmap/NodeTypes/NoteNode";
import toast from "react-hot-toast";

const nodeTypes = {
  topic: TopicNode,
  subtopic: SubtopicNode,
  note: NoteNode,
};

interface EmbeddedMindMapViewProps {
  data: {
    title?: string;
    summary?: string;
    nodes?: any[];
    edges?: any[];
    columns?: any[];
  };
}

function InnerEmbeddedMindMap({ data }: EmbeddedMindMapViewProps) {
  const router = useRouter();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useReactFlow();
  const { addMindMap } = useAppStore();

  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isMiniMapOpen, setIsMiniMapOpen] = useState(false);

  const title = data.title || "Mapa Mental Extraído da Imagem";

  // Build positioned nodes and edges with fallback adaptation
  const initialElements = useMemo(() => {
    // 1. Direct positioned nodes and edges from API
    if (data.nodes && Array.isArray(data.nodes) && data.nodes.length > 0 && data.nodes[0]?.position) {
      return {
        nodes: data.nodes as Node[],
        edges: (data.edges || []) as Edge[],
      };
    }

    // 2. Raw unpositioned nodes from Gemini
    if (data.nodes && Array.isArray(data.nodes) && data.nodes.length > 0) {
      const layout = calculateBalancedMindMapLayout(data.nodes as RawMindMapNode[], title);
      return {
        nodes: layout.nodes as unknown as Node[],
        edges: layout.edges as unknown as Edge[],
      };
    }

    // 3. Fallback: adapt legacy columns into mindmap hierarchy
    if (data.columns && Array.isArray(data.columns) && data.columns.length > 0) {
      const rawNodes: RawMindMapNode[] = [
        { id: "root", type: "topic", label: title, color: "#2563EB", children: [] },
      ];

      data.columns.forEach((col: any, cIdx: number) => {
        const colId = `sub_${cIdx}`;
        const colLabel = col.title || `Ramo ${cIdx + 1}`;
        const colChildren: string[] = [];

        if (col.clusters && Array.isArray(col.clusters)) {
          col.clusters.forEach((cl: any, clIdx: number) => {
            const clId = `note_${cIdx}_${clIdx}`;
            colChildren.push(clId);
            rawNodes.push({
              id: clId,
              type: "note",
              label: cl.title || cl.text || `Conceito ${clIdx + 1}`,
              color: DEFAULT_MINDMAP_PALETTE[(cIdx + 1) % DEFAULT_MINDMAP_PALETTE.length],
              children: [],
            });
          });
        }

        rawNodes[0].children?.push(colId);
        rawNodes.push({
          id: colId,
          type: "subtopic",
          label: colLabel,
          color: DEFAULT_MINDMAP_PALETTE[(cIdx + 1) % DEFAULT_MINDMAP_PALETTE.length],
          children: colChildren,
        });
      });

      const layout = calculateBalancedMindMapLayout(rawNodes, title);
      return {
        nodes: layout.nodes as unknown as Node[],
        edges: layout.edges as unknown as Edge[],
      };
    }

    // 4. Safe default topic
    const defaultRaw: RawMindMapNode[] = [
      { id: "root", type: "topic", label: title, color: "#2563EB", children: ["sub_1", "sub_2"] },
      { id: "sub_1", type: "subtopic", label: "Conceitos Principais", color: "#059669", children: [] },
      { id: "sub_2", type: "subtopic", label: "Aplicações e Conduta", color: "#7C3AED", children: [] },
    ];
    const layout = calculateBalancedMindMapLayout(defaultRaw, title);
    return {
      nodes: layout.nodes as unknown as Node[],
      edges: layout.edges as unknown as Edge[],
    };
  }, [data, title]);

  const [nodes, setNodes] = useState<Node[]>(initialElements.nodes);
  const [edges, setEdges] = useState<Edge[]>(initialElements.edges);

  useEffect(() => {
    setNodes(initialElements.nodes);
    setEdges(initialElements.edges);
    setTimeout(() => {
      reactFlowInstance?.fitView({ padding: 0.25, duration: 400 });
    }, 150);
  }, [initialElements, reactFlowInstance]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  // MIGRAR PARA MAPAS MENTAIS (Direct transition to official Mind Maps section)
  const handleMigrateToMindMaps = () => {
    const newId = `mindmap_${Date.now()}`;
    const newMap: MindMapItem = {
      id: newId,
      name: title,
      description: data.summary || "Mapa mental gerado a partir de imagem.",
      layout: "balanced",
      colorTheme: "studyflow",
      date: new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }),
      nodes,
      edges,
    };

    addMindMap(newMap);
    try {
      localStorage.setItem(`mindmap_${newId}`, JSON.stringify(newMap));
    } catch (e) {
      console.warn("Falha ao salvar no localStorage", e);
    }

    setIsSaved(true);
    toast.success("Mapa mental migrado com sucesso para Mapas Mentais!");
    router.push(`/mindmaps/${newId}`);
  };

  // Salvar na Galeria (permanece na tela)
  const handleSaveToGallery = () => {
    const newId = `mindmap_${Date.now()}`;
    const newMap: MindMapItem = {
      id: newId,
      name: title,
      description: data.summary || "Mapa mental gerado a partir de imagem.",
      layout: "balanced",
      colorTheme: "studyflow",
      date: new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }),
      nodes,
      edges,
    };

    addMindMap(newMap);
    try {
      localStorage.setItem(`mindmap_${newId}`, JSON.stringify(newMap));
    } catch (e) {
      console.warn("Falha ao salvar no localStorage", e);
    }

    setIsSaved(true);
    toast.success("Mapa mental salvo na sua Galeria de Mapas Mentais!");
  };

  // Exportar PDF em alta resolução landscape
  const handleExportPdf = async () => {
    if (!reactFlowWrapper.current) return;
    setIsExportingPdf(true);
    try {
      await exportMindMapToPdf({
        element: reactFlowWrapper.current,
        nodes,
        filename: `mapa-mental-${title.toLowerCase().replace(/[^a-z0-9]/g, "-")}.pdf`,
        exportFormat: "a4-landscape",
      });
      toast.success("Mapa mental exportado em PDF com sucesso!");
    } catch (err) {
      console.error("Erro exportando PDF:", err);
      toast.error("Erro ao gerar PDF do mapa.");
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#1A1D27] p-4 rounded-2xl border border-gray-200 dark:border-[#2a2d3a] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20">
            <GitBranch className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-xs sm:max-w-md">
                {title}
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
                {nodes.length} conceitos
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {data.summary || "Mapa mental interativo gerado com o motor de Mapas Mentais do MedSetup"}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* MIGRAR PARA MAPAS MENTAIS (Primary CTA) */}
          <button
            type="button"
            onClick={handleMigrateToMindMaps}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:via-indigo-700 hover:to-blue-700 text-white rounded-xl shadow-md shadow-purple-500/25 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            title="Salvar e abrir no editor completo de Mapas Mentais"
          >
            <GitBranch className="w-4 h-4" />
            <span>Migrar para Mapas Mentais</span>
            <ArrowRight className="w-3.5 h-3.5 opacity-90" />
          </button>

          {/* Salvar na Galeria */}
          <button
            type="button"
            onClick={handleSaveToGallery}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl border border-gray-200 dark:border-gray-700 transition-colors cursor-pointer"
          >
            {isSaved ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Save className="w-3.5 h-3.5" />}
            <span>{isSaved ? "Salvo na Galeria" : "Salvar na Galeria"}</span>
          </button>

          {/* Exportar PDF */}
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-white dark:bg-[#1A1D27] hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-xl border border-gray-200 dark:border-[#2a2d3a] shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <FileDown className="w-3.5 h-3.5 text-purple-500" />
            <span>{isExportingPdf ? "Gerando PDF..." : "Salvar em PDF"}</span>
          </button>

          {/* Centralizar */}
          <button
            type="button"
            onClick={() => reactFlowInstance?.fitView({ padding: 0.25, duration: 400 })}
            className="p-2 rounded-xl bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 transition-colors cursor-pointer"
            title="Centralizar visualização"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Interactive ReactFlow Mind Map Canvas */}
      <div
        ref={reactFlowWrapper}
        className="w-full h-[620px] rounded-3xl border-2 border-purple-200 dark:border-[#2a2d3a] bg-slate-50/60 dark:bg-[#0B0D13] relative overflow-hidden shadow-lg select-none"
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          minZoom={0.2}
          maxZoom={2}
          defaultEdgeOptions={{
            type: "smoothstep",
            animated: false,
            style: { stroke: "#64748B", strokeWidth: 2 },
          }}
          className="react-flow-canvas"
        >
          {/* Subtle Grid Dots Background */}
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#64748B" className="opacity-30" />

          {/* Floating Navigation Controls */}
          <div className="absolute bottom-5 right-5 z-20 flex items-center gap-1.5 p-1.5 rounded-2xl bg-white/95 dark:bg-[#1A1D27]/95 backdrop-blur-md border border-gray-200 dark:border-[#2A2D3A] shadow-xl text-gray-700 dark:text-gray-300">
            <button
              type="button"
              onClick={() => reactFlowInstance.zoomIn({ duration: 300 })}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-[#252836] hover:text-purple-600 dark:hover:text-purple-400 transition-colors cursor-pointer"
              title="Aproximar zoom (+)"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => reactFlowInstance.zoomOut({ duration: 300 })}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-[#252836] hover:text-purple-600 dark:hover:text-purple-400 transition-colors cursor-pointer"
              title="Afastar zoom (-)"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => reactFlowInstance.fitView({ padding: 0.25, duration: 400 })}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-[#252836] hover:text-purple-600 dark:hover:text-purple-400 transition-colors cursor-pointer"
              title="Ajustar visualização à tela"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <div className="w-[1px] h-5 bg-gray-200 dark:bg-[#2A2D3A] my-auto" />
            <button
              type="button"
              onClick={() => setIsMiniMapOpen((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold shadow-2xs transition-all cursor-pointer ${
                isMiniMapOpen
                  ? "bg-purple-600 text-white border-purple-500 shadow-purple-500/25"
                  : "bg-transparent hover:bg-gray-100 dark:hover:bg-[#252836] border-transparent text-gray-700 dark:text-gray-300"
              }`}
              title="Alternar visualização do Minimapa"
            >
              <MapIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Minimapa</span>
            </button>
          </div>

          {/* Minimap (Collapsible) */}
          {isMiniMapOpen && (
            <MiniMap
              position="bottom-right"
              style={{
                width: 190,
                height: 120,
              }}
              className="rounded-2xl border border-gray-200 dark:border-[#2a2d3a] bg-white/95 dark:bg-[#1A1D27]/95 shadow-2xl backdrop-blur-md hidden md:block overflow-hidden !bottom-20 !right-5 !m-0"
              nodeColor={(n) => {
                if (n.type === "topic") return (n.data?.color as string) || "#2563EB";
                if (n.type === "subtopic") return (n.data?.color as string) || "#059669";
                return "#475569";
              }}
              maskColor="rgba(0, 0, 0, 0.15)"
            />
          )}
        </ReactFlow>
      </div>
    </div>
  );
}

export default function EmbeddedMindMapView(props: EmbeddedMindMapViewProps) {
  return (
    <ReactFlowProvider>
      <InnerEmbeddedMindMap {...props} />
    </ReactFlowProvider>
  );
}

"use client";

import React, { useCallback, useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import {
  ReactFlow,
  Background,
  MiniMap,
  BackgroundVariant,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
  Edge,
  Connection,
  Node,
  useReactFlow,
  ReactFlowProvider,
  SelectionMode,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Sparkles,
  Save,
  Download,
  FileDown,
  Layout,
  FileText,
  Loader2,
  Copy,
  Maximize2,
  Minimize2,
  Palette,
  Type,
  Grid,
  Search,
  Undo2,
  Redo2,
  Sliders,
  ChevronDown,
  ChevronRight,
  Eye,
  GitBranch,
  CircleDot,
  Network,
  Share2,
  Image as ImageIcon,
  Check,
  X,
  Lightbulb,
  AlertTriangle,
  HelpCircle,
  Activity,
  Layers,
  Map as MapIcon,
  Minus,
  BarChart3,
  BookOpen,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { toPng } from "html-to-image";
import TopicNode from "@/components/mindmap/NodeTypes/TopicNode";
import SubtopicNode from "@/components/mindmap/NodeTypes/SubtopicNode";
import NoteNode from "@/components/mindmap/NodeTypes/NoteNode";
import { exportElementToPdf, exportMindMapToPdf, renderMindMapToImage } from "@/lib/pdf-export";
import { copyRichText } from "@/lib/notion-export";
import {
  calculateMindMapLayout,
  calculateBalancedMindMapLayout,
  normalizeMindMapNodesAndEdges,
  resolveCollisions,
  DEFAULT_MINDMAP_PALETTE,
  MINDMAP_COLOR_THEMES,
  MindMapLayoutType,
  MindMapTheme,
} from "@/lib/mindmap-layout";
import { useAppStore, MindMapItem } from "@/stores/useAppStore";
import { cn } from "@/lib/utils";

const nodeTypes = {
  topic: TopicNode,
  subtopic: SubtopicNode,
  note: NoteNode,
};

const COLOR_OPTIONS = DEFAULT_MINDMAP_PALETTE;

const ICON_PRESETS = [
  { icon: "💡", label: "Ideia / Conceito" },
  { icon: "⚠️", label: "Atenção / Alerta" },
  { icon: "🔬", label: "Estudo / Análise" },
  { icon: "💊", label: "Fármaco / Tratamento" },
  { icon: "🎯", label: "Objetivo / Foco" },
  { icon: "⭐", label: "Importante / Prova" },
  { icon: "📌", label: "Fixado / Regra" },
  { icon: "✅", label: "Critério / Concluído" },
  { icon: "🔥", label: "Cai Sempre" },
  { icon: "⚡", label: "Rápido / Gatilho" },
];

export type NodeShapeType = "rounded" | "pill" | "square" | "bubble";

const SHAPE_OPTIONS: { id: NodeShapeType; label: string; icon: string; desc: string }[] = [
  { id: "rounded", label: "Arredondado", icon: "▢", desc: "Cantos suaves clássicos" },
  { id: "pill", label: "Cápsula / Pílula", icon: "⬭", desc: "Bordas ovais completas" },
  { id: "square", label: "Retangular", icon: "▭", desc: "Bordas retas e modernas" },
  { id: "bubble", label: "Balão de Fala", icon: "💬", desc: "Estilo balão com cauda" },
];

interface ContextMenuState {
  x: number;
  y: number;
  node: Node | null;
  type: "node" | "pane";
}

const LAYOUT_OPTIONS: { id: MindMapLayoutType; name: string; desc: string; icon: React.ReactNode }[] = [
  {
    id: "balanced",
    name: "Multidirecional Balanceado",
    desc: "Distribuição bilateral simétrica (Esq / Dir)",
    icon: <Layout className="w-4 h-4 text-blue-500" />,
  },
  {
    id: "radial",
    name: "Radial 360° Circular",
    desc: "Círculos concêntricos ao redor do tema",
    icon: <CircleDot className="w-4 h-4 text-purple-500" />,
  },
  {
    id: "topDown",
    name: "Árvore Hierárquica (Top-Down)",
    desc: "Níveis verticais de cima para baixo",
    icon: <Network className="w-4 h-4 text-emerald-500" />,
  },
  {
    id: "horizontalFlow",
    name: "Fluxo Lógico Horizontal",
    desc: "Sequência visual da esquerda para direita",
    icon: <GitBranch className="w-4 h-4 text-amber-500" />,
  },
  {
    id: "free",
    name: "Layout Livre 4D",
    desc: "Expansão ortogonal nas 4 direções",
    icon: <Grid className="w-4 h-4 text-indigo-500" />,
  },
  {
    id: "fishbone",
    name: "Espinha de Peixe (Ishikawa)",
    desc: "Diagrama causa-efeito e diagnósticos",
    icon: <Activity className="w-4 h-4 text-rose-500" />,
  },
];

function MindMapCanvas({ id }: { id: string }) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useReactFlow();

  const [mapTitle, setMapTitle] = useState("Mapa Mental");
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [currentLayout, setCurrentLayout] = useState<MindMapLayoutType>("balanced");
  const [activeTheme, setActiveTheme] = useState<string>("studyflow");

  // Edge styling
  const [edgeType, setEdgeType] = useState<"default" | "smoothstep" | "straight">("default");

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Panels & Zen Mode
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);
  const [isLayoutDropdownOpen, setIsLayoutDropdownOpen] = useState(false);
  const [isThemeDropdownOpen, setIsThemeDropdownOpen] = useState(false);
  const [isEdgeDropdownOpen, setIsEdgeDropdownOpen] = useState(false);
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const [isMiniMapOpen, setIsMiniMapOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [bgVariant, setBgVariant] = useState<BackgroundVariant>(BackgroundVariant.Dots);
  const [selectedEdgeData, setSelectedEdgeData] = useState<{
    edge: Edge;
    x: number;
    y: number;
  } | null>(null);
  const [isShapeDropdownOpen, setIsShapeDropdownOpen] = useState(false);

  // Async loading & AI
  const [isExpandingAI, setIsExpandingAI] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingPng, setIsExportingPng] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [mounted, setMounted] = useState(false);

  // Selection counts
  const selectedCount = nodes.filter((n) => n.selected || (selectedNode && n.id === selectedNode.id)).length;
  const hasSelection = selectedCount > 0;

  // Helper to attach inline editing callback to any node list
  const withInlineEditing = useCallback((nds: Node[]): Node[] => {
    return nds.map((n) => ({
      ...n,
      data: {
        ...n.data,
        onUpdateLabel: (newLabel: string) => {
          setNodes((current) => {
            const updated = current.map((item) =>
              item.id === n.id ? { ...item, data: { ...item.data, label: newLabel } } : item
            );
            try {
              const stored = localStorage.getItem(`mindmap_${id}`);
              if (stored) {
                const parsed = JSON.parse(stored);
                parsed.nodes = updated;
                localStorage.setItem(`mindmap_${id}`, JSON.stringify(parsed));
                useAppStore.getState().updateMindMap(parsed);
              }
            } catch {}
            return updated;
          });
          setSelectedNode((prev) =>
            prev && prev.id === n.id ? { ...prev, data: { ...prev.data, label: newLabel } } : prev
          );
        },
      },
    }));
  }, [id]);

  // Undo / Redo History Stacks
  const historyRef = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const isUndoRedoAction = useRef(false);
  const [, setHistoryVersion] = useState(0);

  // Helper to record history snapshot
  const pushHistorySnapshot = useCallback((newNodes: Node[], newEdges: Edge[]) => {
    if (isUndoRedoAction.current) return;
    const currentHist = historyRef.current.slice(0, historyIndexRef.current + 1);
    const nextHist = [...currentHist, { nodes: newNodes, edges: newEdges }].slice(-40);
    historyRef.current = nextHist;
    historyIndexRef.current = nextHist.length - 1;
    setHistoryVersion((v) => v + 1);

    try {
      const stored = localStorage.getItem(`mindmap_${id}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.nodes = newNodes;
        parsed.edges = newEdges;
        localStorage.setItem(`mindmap_${id}`, JSON.stringify(parsed));
      }
    } catch (e) {}
  }, [id]);

  const handleUndo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      isUndoRedoAction.current = true;
      historyIndexRef.current -= 1;
      const snapshot = historyRef.current[historyIndexRef.current];
      setNodes(withInlineEditing(snapshot.nodes));
      setEdges(snapshot.edges);
      setSelectedNode(null);
      setHistoryVersion((v) => v + 1);

      try {
        const stored = localStorage.getItem(`mindmap_${id}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.nodes = snapshot.nodes;
          parsed.edges = snapshot.edges;
          localStorage.setItem(`mindmap_${id}`, JSON.stringify(parsed));
        }
      } catch (e) {}

      setTimeout(() => {
        isUndoRedoAction.current = false;
      }, 50);
      toast.success("Desfeito (Undo)");
    }
  }, [id, withInlineEditing]);

  const handleRedo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      isUndoRedoAction.current = true;
      historyIndexRef.current += 1;
      const snapshot = historyRef.current[historyIndexRef.current];
      setNodes(withInlineEditing(snapshot.nodes));
      setEdges(snapshot.edges);
      setSelectedNode(null);
      setHistoryVersion((v) => v + 1);

      try {
        const stored = localStorage.getItem(`mindmap_${id}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.nodes = snapshot.nodes;
          parsed.edges = snapshot.edges;
          localStorage.setItem(`mindmap_${id}`, JSON.stringify(parsed));
        }
      } catch (e) {}

      setTimeout(() => {
        isUndoRedoAction.current = false;
      }, 50);
      toast.success("Refeito (Redo)");
    }
  }, [id, withInlineEditing]);

  // Fresh refs for shortcuts
  const nodesRef = useRef<Node[]>(nodes);
  nodesRef.current = nodes;
  const edgesRef = useRef<Edge[]>(edges);
  edgesRef.current = edges;
  const selectedNodeRef = useRef<Node | null>(selectedNode);
  selectedNodeRef.current = selectedNode;
  const selectedEdgeDataRef = useRef<{ edge: Edge; x: number; y: number } | null>(null);
  selectedEdgeDataRef.current = selectedEdgeData;
  const handleAddChildNodeRef = useRef<((preset?: any) => void) | null>(null);
  const handleAddSiblingNodeRef = useRef<(() => void) | null>(null);

  // Delete selected nodes (supports single & multi-selection, and Delete/Backspace keyboard shortcut)
  const handleDeleteSelected = useCallback(() => {
    const currentNodes = nodesRef.current;
    const currentEdges = edgesRef.current;
    const selNode = selectedNodeRef.current;

    const toDelete = currentNodes.filter((n) => n.selected || (selNode && n.id === selNode.id));
    if (toDelete.length === 0) return;

    if (currentNodes.length === 1 && toDelete[0]?.id === "root") {
      toast.error("Você não pode excluir o único nó restante.");
      return;
    }

    const toDeleteIds = new Set(toDelete.map((n) => n.id));
    const nextNodes = currentNodes.filter((n) => !toDeleteIds.has(n.id));

    if (nextNodes.length === 0) {
      toast.error("Você não pode excluir todos os nós do mapa.");
      return;
    }

    const nextEdges = currentEdges.filter(
      (e) => !toDeleteIds.has(e.source) && !toDeleteIds.has(e.target)
    );

    setNodes(nextNodes);
    setEdges(nextEdges);
    setSelectedNode(null);
    setContextMenu(null);
    setIsInspectorOpen(false);
    pushHistorySnapshot(nextNodes, nextEdges);

    const count = toDelete.length;
    toast.success(count === 1 ? "Balão excluído (Del)" : `${count} balões excluídos (Del)`);
  }, [pushHistorySnapshot]);

  // Delete selected edge / connection line
  const handleDeleteEdge = useCallback(
    (edgeToDelete?: Edge) => {
      const target = edgeToDelete || selectedEdgeDataRef.current?.edge;
      if (!target) return;

      const currentEdges = edgesRef.current;
      const nextEdges = currentEdges.filter((e) => e.id !== target.id);

      setEdges(nextEdges);
      setSelectedEdgeData(null);
      pushHistorySnapshot(nodesRef.current, nextEdges);

      toast.success("Linha de ligação excluída! (Ctrl+Z para desfazer)");
    },
    [pushHistorySnapshot]
  );

  // Duplicate selected nodes (single or multi-selection, and Ctrl+D shortcut)
  const handleDuplicateSelected = useCallback(() => {
    const currentNodes = nodesRef.current;
    const currentEdges = edgesRef.current;
    const selNode = selectedNodeRef.current;

    const toDuplicate = currentNodes.filter((n) => n.selected || (selNode && n.id === selNode.id));
    if (toDuplicate.length === 0) return;

    const idMap = new Map<string, string>();
    const timestamp = Date.now();

    const duplicatedNodes: Node[] = toDuplicate.map((n, idx) => {
      const newId = `node_dup_${timestamp}_${idx}`;
      idMap.set(n.id, newId);
      return {
        ...n,
        id: newId,
        position: {
          x: n.position.x + 70,
          y: n.position.y + 50,
        },
        selected: true,
        data: {
          ...n.data,
          label: `${n.data?.label || "Conceito"} (Cópia)`,
          onUpdateLabel: (newLabel: string) => {
            setNodes((current) =>
              current.map((item) =>
                item.id === newId ? { ...item, data: { ...item.data, label: newLabel } } : item
              )
            );
          },
        },
      };
    });

    // Replicate internal relationships among duplicated nodes
    const internalEdges = currentEdges.filter(
      (e) => idMap.has(e.source) && idMap.has(e.target)
    );
    const duplicatedEdges: Edge[] = internalEdges.map((e, idx) => ({
      ...e,
      id: `edge_dup_${timestamp}_${idx}`,
      source: idMap.get(e.source)!,
      target: idMap.get(e.target)!,
    }));

    const deselectOld = currentNodes.map((n) => ({ ...n, selected: false }));
    const nextNodes = [...deselectOld, ...duplicatedNodes];
    const nextEdges = [...currentEdges, ...duplicatedEdges];

    setNodes(nextNodes);
    setEdges(nextEdges);
    setSelectedNode(duplicatedNodes[0] || null);
    setContextMenu(null);
    pushHistorySnapshot(nextNodes, nextEdges);

    const count = duplicatedNodes.length;
    toast.success(count === 1 ? "Balão duplicado (Ctrl+D)" : `${count} balões duplicados (Ctrl+D)`);
  }, [pushHistorySnapshot]);

  // In-memory clipboard for balloon copy & paste (Ctrl+C and Ctrl+V)
  const clipboardNodesRef = useRef<Node[]>([]);
  const clipboardEdgesRef = useRef<Edge[]>([]);
  const pasteCountRef = useRef<number>(0);

  // Copy selected balloon(s) (Ctrl+C)
  const handleCopySelected = useCallback(() => {
    const currentNodes = nodesRef.current;
    const currentEdges = edgesRef.current;
    const selNode = selectedNodeRef.current;

    const toCopy = currentNodes.filter((n) => n.selected || (selNode && n.id === selNode.id));
    if (toCopy.length === 0) {
      toast("Selecione um balão clicando nele para copiar (Ctrl+C).", { icon: "ℹ️" });
      return;
    }

    clipboardNodesRef.current = toCopy;
    const toCopyIds = new Set(toCopy.map((n) => n.id));
    clipboardEdgesRef.current = currentEdges.filter(
      (e) => toCopyIds.has(e.source) && toCopyIds.has(e.target)
    );
    pasteCountRef.current = 0;

    const count = toCopy.length;
    toast.success(count === 1 ? "Balão copiado! (Ctrl+C)" : `${count} balões copiados! (Ctrl+C)`, {
      icon: "📋",
    });
  }, []);

  // Paste copied balloon(s) (Ctrl+V)
  const handlePaste = useCallback(() => {
    const copiedNodes = clipboardNodesRef.current;
    if (!copiedNodes || copiedNodes.length === 0) {
      toast("Nenhum balão copiado. Clique em um balão e pressione Ctrl+C primeiro.", {
        icon: "ℹ️",
      });
      return;
    }

    pasteCountRef.current += 1;
    const offset = 45 + ((pasteCountRef.current - 1) % 6) * 25;
    const idMap = new Map<string, string>();
    const timestamp = Date.now();

    const clonedNodes: Node[] = copiedNodes.map((n, idx) => {
      const newId = `node_copy_${timestamp}_${idx}`;
      idMap.set(n.id, newId);
      return {
        ...n,
        id: newId,
        position: {
          x: n.position.x + offset,
          y: n.position.y + offset,
        },
        selected: true,
        data: {
          ...n.data,
          onUpdateLabel: (newLabel: string) => {
            setNodes((current) =>
              current.map((item) =>
                item.id === newId ? { ...item, data: { ...item.data, label: newLabel } } : item
              )
            );
          },
        },
      };
    });

    // Replicate internal relationships among copied nodes
    const copiedEdges = clipboardEdgesRef.current;
    const clonedEdges: Edge[] = copiedEdges.map((e, idx) => ({
      ...e,
      id: `edge_copy_${timestamp}_${idx}`,
      source: idMap.get(e.source) || e.source,
      target: idMap.get(e.target) || e.target,
    }));

    const deselectExisting = nodesRef.current.map((n) => ({ ...n, selected: false }));
    const nextNodes = [...deselectExisting, ...clonedNodes];
    const nextEdges = [...edgesRef.current, ...clonedEdges];

    setNodes(nextNodes);
    setEdges(nextEdges);
    setSelectedNode(clonedNodes[0] || null);
    pushHistorySnapshot(nextNodes, nextEdges);

    const count = clonedNodes.length;
    toast.success(count === 1 ? "Balão colado! (Ctrl+V)" : `${count} balões colados! (Ctrl+V)`, {
      icon: "✨",
    });
  }, [pushHistorySnapshot]);

  // Select all nodes (Ctrl+A)
  const handleSelectAll = useCallback(() => {
    const updated = nodesRef.current.map((n) => ({ ...n, selected: true }));
    setNodes(updated);
    toast.success(`${updated.length} balões selecionados (Del para excluir)`);
  }, []);

  // Deselect all (Esc)
  const handleDeselectAll = useCallback(() => {
    setSelectedNode(null);
    setNodes((nds) => nds.map((n) => (n.selected ? { ...n, selected: false } : n)));
    setIsSearchOpen(false);
    setIsInspectorOpen(false);
    setIsLayoutDropdownOpen(false);
    setIsThemeDropdownOpen(false);
    setIsEdgeDropdownOpen(false);
    setIsExportDropdownOpen(false);
    setContextMenu(null);
  }, []);

  // Keyboard Shortcuts: Ctrl+Z (Undo), Ctrl+Y (Redo), Ctrl+C (Copy), Ctrl+V (Paste), Ctrl+A (Select All), Ctrl+D (Duplicate), Ctrl+F (Search), Delete/Backspace (Delete Node), Esc (Deselect)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing inside input or textarea
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      const isCmdOrCtrl = e.ctrlKey || e.metaKey;

      if (isCmdOrCtrl && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if (isCmdOrCtrl && e.key.toLowerCase() === "y") {
        e.preventDefault();
        handleRedo();
      } else if (isCmdOrCtrl && e.key.toLowerCase() === "c") {
        e.preventDefault();
        handleCopySelected();
      } else if (isCmdOrCtrl && e.key.toLowerCase() === "v") {
        e.preventDefault();
        handlePaste();
      } else if (isCmdOrCtrl && e.key.toLowerCase() === "a") {
        e.preventDefault();
        handleSelectAll();
      } else if (isCmdOrCtrl && e.key.toLowerCase() === "d") {
        e.preventDefault();
        handleDuplicateSelected();
      } else if (isCmdOrCtrl && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setIsSearchOpen(true);
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        if (selectedEdgeDataRef.current) {
          handleDeleteEdge(selectedEdgeDataRef.current.edge);
        } else {
          handleDeleteSelected();
        }
      } else if (e.key === "Tab") {
        if (selectedNodeRef.current) {
          e.preventDefault();
          handleAddChildNodeRef.current?.("subtopic");
        }
      } else if (e.key === "Enter" && !isCmdOrCtrl) {
        if (selectedNodeRef.current && selectedNodeRef.current.id !== "root") {
          e.preventDefault();
          handleAddSiblingNodeRef.current?.();
        }
      } else if (e.key === "Escape") {
        handleDeselectAll();
        if (isZenMode) setIsZenMode(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    handleUndo,
    handleRedo,
    handleCopySelected,
    handlePaste,
    handleDeleteSelected,
    handleDeleteEdge,
    handleDuplicateSelected,
    handleSelectAll,
    handleDeselectAll,
    isZenMode,
  ]);

  // Listen for AI selection assistant updates on mind map nodes
  useEffect(() => {
    const handleNodeAiUpdate = (e: Event) => {
      const custom = e as CustomEvent<{ nodeId?: string; newLabel?: string }>;
      const targetId = custom.detail?.nodeId || selectedNodeRef.current?.id;
      const newLabel = custom.detail?.newLabel;
      if (!targetId || typeof newLabel !== "string") return;

      const updatedNodes = nodesRef.current.map((n) =>
        n.id === targetId ? { ...n, data: { ...n.data, label: newLabel } } : n
      );
      setNodes(updatedNodes);
      setSelectedNode((prev) =>
        prev && prev.id === targetId ? { ...prev, data: { ...prev.data, label: newLabel } } : prev
      );
      pushHistorySnapshot(updatedNodes, edgesRef.current);
    };

    window.addEventListener("medsetup:update-mindmap-node", handleNodeAiUpdate);
    return () => window.removeEventListener("medsetup:update-mindmap-node", handleNodeAiUpdate);
  }, [pushHistorySnapshot]);

  useEffect(() => {
    setMounted(true);
    // Trava scroll externo do container principal para o mapa ocupar 100% da tela perfeitamente
    const mainEl = document.querySelector("main");
    if (mainEl) {
      const prevOverflow = mainEl.style.overflow;
      mainEl.style.overflow = "hidden";
      return () => {
        mainEl.style.overflow = prevOverflow;
      };
    }
  }, []);

  // Load map data from localStorage or fallback to store / template
  useEffect(() => {
    let mapData: any = null;
    try {
      const stored = localStorage.getItem(`mindmap_${id}`);
      if (stored) {
        mapData = JSON.parse(stored);
      }
    } catch (e) {
      console.warn("Could not load from localStorage:", e);
    }

    if (!mapData) {
      const storeMaps = useAppStore.getState().mindmaps || [];
      const foundInStore = storeMaps.find((m) => m.id === id);
      if (foundInStore) {
        mapData = foundInStore;
      }
    }

    const currentTitle = mapData?.name || "Mapa Mental";
    setMapTitle(currentTitle);

    const savedLayout = (mapData?.layout || "balanced") as MindMapLayoutType;
    setCurrentLayout(savedLayout);

    const normalized = normalizeMindMapNodesAndEdges(
      mapData?.nodes,
      mapData?.edges,
      currentTitle,
      savedLayout
    );

    const readyNodes = withInlineEditing(normalized.nodes as Node[]);
    const readyEdges = normalized.edges as Edge[];

    setNodes(readyNodes);
    setEdges(readyEdges);

    // Initial history state
    historyRef.current = [{ nodes: readyNodes, edges: readyEdges }];
    historyIndexRef.current = 0;

    // Ajusta a proporção automaticamente ao carregar o mapa para centralizar e enquadrar na tela
    setTimeout(() => {
      reactFlowInstance.fitView({ padding: 0.25, duration: 400 });
    }, 150);

    // Heal & Persist back
    if (mapData && mapData.id) {
      try {
        const healedData: MindMapItem = {
          ...mapData,
          id,
          name: currentTitle,
          nodes: normalized.nodes,
          edges: normalized.edges,
        };
        localStorage.setItem(`mindmap_${id}`, JSON.stringify(healedData));
        const storeMaps = useAppStore.getState().mindmaps || [];
        if (storeMaps.some((m) => m.id === id)) {
          useAppStore.getState().updateMindMap(healedData);
        } else {
          useAppStore.getState().addMindMap(healedData);
        }
      } catch (err) {
        console.warn("Could not persist healed mindmap:", err);
      }
    }
  }, [id, withInlineEditing]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((nds) => {
        const updated = applyNodeChanges(changes, nds);
        return updated;
      });
    },
    []
  );

  // Track node drag starting positions for Undo / Redo history
  const dragStartPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  const onNodeDragStart = useCallback((event: any, node: Node, draggedNodes?: Node[]) => {
    const posMap = new Map<string, { x: number; y: number }>();
    const allDragged = draggedNodes && draggedNodes.length > 0 ? draggedNodes : [node];
    allDragged.forEach((n) => {
      posMap.set(n.id, { x: n.position.x, y: n.position.y });
    });
    dragStartPositionsRef.current = posMap;
  }, []);

  const onNodeDragStop = useCallback(
    (event: any, node: Node, draggedNodes?: Node[]) => {
      const allDragged = draggedNodes && draggedNodes.length > 0 ? draggedNodes : [node];
      const startMap = dragStartPositionsRef.current;

      let hasMoved = false;
      for (const n of allDragged) {
        const startPos = startMap.get(n.id);
        if (startPos && (Math.abs(startPos.x - n.position.x) > 2 || Math.abs(startPos.y - n.position.y) > 2)) {
          hasMoved = true;
          break;
        }
      }

      if (hasMoved) {
        const draggedMap = new Map(allDragged.map((n) => [n.id, n]));
        const updatedNodes = nodesRef.current.map((n) => {
          const dragged = draggedMap.get(n.id);
          return dragged ? { ...n, position: { ...dragged.position } } : n;
        });

        pushHistorySnapshot(updatedNodes, edgesRef.current);
      }
      dragStartPositionsRef.current.clear();
    },
    [pushHistorySnapshot]
  );

  const onSelectionDragStart = useCallback((event: any, draggedNodes: Node[]) => {
    const posMap = new Map<string, { x: number; y: number }>();
    draggedNodes.forEach((n) => {
      posMap.set(n.id, { x: n.position.x, y: n.position.y });
    });
    dragStartPositionsRef.current = posMap;
  }, []);

  const onSelectionDragStop = useCallback(
    (event: any, draggedNodes: Node[]) => {
      const startMap = dragStartPositionsRef.current;
      let hasMoved = false;
      for (const n of draggedNodes) {
        const startPos = startMap.get(n.id);
        if (startPos && (Math.abs(startPos.x - n.position.x) > 2 || Math.abs(startPos.y - n.position.y) > 2)) {
          hasMoved = true;
          break;
        }
      }

      if (hasMoved) {
        const draggedMap = new Map(draggedNodes.map((n) => [n.id, n]));
        const updatedNodes = nodesRef.current.map((n) => {
          const dragged = draggedMap.get(n.id);
          return dragged ? { ...n, position: { ...dragged.position } } : n;
        });

        pushHistorySnapshot(updatedNodes, edgesRef.current);
      }
      dragStartPositionsRef.current.clear();
    },
    [pushHistorySnapshot]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((eds) => {
        const updated = applyEdgeChanges(changes, eds);
        return updated;
      });
    },
    []
  );

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => {
        const newEdge: Edge = {
          ...params,
          type: edgeType,
          animated: false,
          style: {
            stroke: "#6366F1",
            strokeWidth: 2,
          },
        } as Edge;
        const updated = addEdge(newEdge, eds);
        pushHistorySnapshot(nodes, updated);
        return updated;
      });
      toast.success("Relação conectada!");
    },
    [edgeType, nodes, pushHistorySnapshot]
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedEdgeData(null);
    setEdges((eds) => eds.map((e) => (e.selected ? { ...e, selected: false } : e)));
    const isMultiKey = event.ctrlKey || event.metaKey || event.shiftKey;
    if (isMultiKey) {
      // Toggle selection for clicked node in multi-select mode
      setNodes((nds) =>
        nds.map((n) => (n.id === node.id ? { ...n, selected: !n.selected } : n))
      );
      setSelectedNode(node);
    } else {
      setSelectedNode(node);
      setNodes((nds) =>
        nds.map((n) => (n.id === node.id ? { ...n, selected: true } : { ...n, selected: false }))
      );
      setIsInspectorOpen(true);
    }
    setContextMenu(null);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdgeData(null);
    setNodes((nds) => nds.map((n) => (n.selected ? { ...n, selected: false } : n)));
    setEdges((eds) => eds.map((e) => (e.selected ? { ...e, selected: false } : e)));
    setContextMenu(null);
    setIsLayoutDropdownOpen(false);
    setIsThemeDropdownOpen(false);
    setIsEdgeDropdownOpen(false);
    setIsExportDropdownOpen(false);
    setIsShapeDropdownOpen(false);
  }, []);

  // Click on Connection Line / Edge
  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.stopPropagation();
    setSelectedNode(null);
    setContextMenu(null);
    setSelectedEdgeData({
      edge,
      x: event.clientX,
      y: event.clientY,
    });
    setEdges((eds) =>
      eds.map((e) => ({
        ...e,
        selected: e.id === edge.id,
      }))
    );
  }, []);

  // Right-click on Connection Line / Edge
  const onEdgeContextMenu = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedNode(null);
    setContextMenu(null);
    setSelectedEdgeData({
      edge,
      x: event.clientX,
      y: event.clientY,
    });
    setEdges((eds) =>
      eds.map((e) => ({
        ...e,
        selected: e.id === edge.id,
      }))
    );
  }, []);

  // Right-Click Context Menu for Nodes
  const onNodeContextMenu = useCallback((event: React.MouseEvent | MouseEvent, node: Node) => {
    event.preventDefault();
    setSelectedNode(node);
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      node,
      type: "node",
    });
  }, []);

  // Right-Click Context Menu for Empty Canvas
  const onPaneContextMenu = useCallback((event: React.MouseEvent | MouseEvent) => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      node: null,
      type: "pane",
    });
  }, []);

  // Apply layout change
  const handleApplyLayout = (layoutType: MindMapLayoutType) => {
    setCurrentLayout(layoutType);
    setIsLayoutDropdownOpen(false);

    const themeObj = MINDMAP_COLOR_THEMES.find((t) => t.id === activeTheme);
    const palette = themeObj ? themeObj.palette : DEFAULT_MINDMAP_PALETTE;

    const rawList = nodes.map((n) => {
      const childEdges = edges.filter((e) => e.source === n.id);
      return {
        id: n.id,
        label: (n.data?.label as string) || "Conceito",
        type: (n.type as "topic" | "subtopic" | "note") || "subtopic",
        color: (n.data?.color as string) || palette[0],
        size: (n.data?.size as any) || "medium",
        icon: (n.data?.icon as string) || undefined,
        shape: (n.data?.shape as any) || undefined,
        children: childEdges.map((e) => e.target),
      };
    });

    const { nodes: organizedNodes, edges: organizedEdges } = calculateMindMapLayout(
      rawList,
      layoutType,
      mapTitle,
      palette
    );

    // Apply edge styling preferences
    const styledEdges = organizedEdges.map((e) => ({
      ...e,
      type: edgeType !== "default" ? edgeType : e.type || "default",
      animated: false,
      style: {
        ...e.style,
        strokeDasharray: undefined,
      },
    }));

    const finalNodes = withInlineEditing(organizedNodes as Node[]);
    setNodes(finalNodes);
    setEdges(styledEdges as Edge[]);
    pushHistorySnapshot(finalNodes, styledEdges as Edge[]);

    setTimeout(() => {
      reactFlowInstance.fitView({ padding: 0.2, duration: 600 });
    }, 50);

    const layoutName = LAYOUT_OPTIONS.find((l) => l.id === layoutType)?.name || layoutType;
    toast.success(`Layout "${layoutName}" aplicado!`);
  };

  // Apply 1-Click Color Theme
  const handleApplyColorTheme = (themeId: string) => {
    setActiveTheme(themeId);
    setIsThemeDropdownOpen(false);

    const theme = MINDMAP_COLOR_THEMES.find((t) => t.id === themeId);
    if (!theme) return;

    const palette = theme.palette;

    // Recolor nodes hierarchically
    const rootNode = nodes.find((n) => n.id === "root") || nodes[0];
    const updatedNodes = nodes.map((n) => {
      if (n.id === rootNode?.id) {
        return { ...n, data: { ...n.data, color: palette[0] } };
      }
      // Subtopics & Notes get colors from the palette based on branch
      const isSub = n.type === "subtopic";
      const charCodeSum = n.id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const colorIndex = (charCodeSum % (palette.length - 1)) + 1;
      const color = isSub ? palette[colorIndex] : palette[colorIndex];
      return {
        ...n,
        data: { ...n.data, color },
      };
    });

    // Update edge colors matching source node
    const updatedEdges = edges.map((e) => {
      const srcNode = updatedNodes.find((n) => n.id === e.source);
      const stroke = (srcNode?.data?.color as string) || "#6366F1";
      return {
        ...e,
        style: { ...e.style, stroke },
      };
    });

    setNodes(updatedNodes);
    setEdges(updatedEdges);
    pushHistorySnapshot(updatedNodes, updatedEdges);
    toast.success(`Tema "${theme.name}" aplicado a todo o mapa!`);
  };

  // Change selected node color
  const handleChangeNodeColor = (color: string) => {
    if (!selectedNode) return;
    const updatedNodes = nodes.map((n) =>
      n.id === selectedNode.id ? { ...n, data: { ...n.data, color } } : n
    );
    const updatedEdges = edges.map((e) =>
      e.source === selectedNode.id ? { ...e, style: { ...e.style, stroke: color } } : e
    );
    setNodes(updatedNodes);
    setEdges(updatedEdges);
    setSelectedNode((prev) => (prev ? { ...prev, data: { ...prev.data, color } } : null));
    pushHistorySnapshot(updatedNodes, updatedEdges);
  };

  // Change selected node size
  const handleChangeNodeSize = (size: "small" | "medium" | "large") => {
    if (!selectedNode) return;
    const updatedNodes = nodes.map((n) =>
      n.id === selectedNode.id ? { ...n, data: { ...n.data, size } } : n
    );
    setNodes(updatedNodes);
    setSelectedNode((prev) => (prev ? { ...prev, data: { ...prev.data, size } } : null));
    pushHistorySnapshot(updatedNodes, edges);
    toast.success(`Tamanho: ${size === "small" ? "Pequeno" : size === "medium" ? "Médio" : "Grande"}`);
  };

  // Change selected node icon
  const handleChangeNodeIcon = (icon?: string) => {
    if (!selectedNode) return;
    const updatedNodes = nodes.map((n) =>
      n.id === selectedNode.id ? { ...n, data: { ...n.data, icon: icon || undefined } } : n
    );
    setNodes(updatedNodes);
    setSelectedNode((prev) => (prev ? { ...prev, data: { ...prev.data, icon: icon || undefined } } : null));
    pushHistorySnapshot(updatedNodes, edges);
  };

  // Change selected node shape (supports single and multi-selection)
  const handleChangeNodeShape = (shape: NodeShapeType) => {
    const selNode = selectedNodeRef.current;
    const currentNodes = nodesRef.current;
    const currentEdges = edgesRef.current;

    const toUpdate = currentNodes.filter((n) => n.selected || (selNode && n.id === selNode.id));
    if (toUpdate.length === 0) return;

    const toUpdateIds = new Set(toUpdate.map((n) => n.id));
    const updatedNodes = currentNodes.map((n) =>
      toUpdateIds.has(n.id) ? { ...n, data: { ...n.data, shape } } : n
    );

    setNodes(updatedNodes);
    setSelectedNode((prev) => (prev ? { ...prev, data: { ...prev.data, shape } } : null));
    pushHistorySnapshot(updatedNodes, currentEdges);

    const shapeName =
      shape === "pill"
        ? "Cápsula / Pílula"
        : shape === "square"
        ? "Retangular"
        : shape === "bubble"
        ? "Balão de Fala"
        : "Arredondado";
    toast.success(`Formato alterado para "${shapeName}"!`);
  };

  const handleChangeEdgeCurve = (type: "default" | "smoothstep" | "straight") => {
    setEdgeType(type);
    const updatedEdges = edges.map((e) => ({ ...e, type }));
    setEdges(updatedEdges);
    pushHistorySnapshot(nodes, updatedEdges);
    toast.success(
      `Conector: ${type === "default" ? "Curva Bezier" : type === "smoothstep" ? "Ortogonal" : "Linha Reta"}`
    );
  };

  // Add child node
  const handleAddChildNode = (presetType: "subtopic" | "note" | "alert" | "concept" = "subtopic") => {
    const parentNode = selectedNode || nodes.find((n) => n.id === "root") || nodes[0];
    if (!parentNode) return;

    const newId = `node_${Date.now()}`;
    const parentPos = parentNode.position;
    const parentColor = (parentNode.data?.color as string) || "#2563EB";

    const isLeft = parentPos.x < 0;
    const offsetX = isLeft ? -380 : 380;
    const offsetY = Math.random() * 80 - 40;

    let nodeType: "topic" | "subtopic" | "note" = "subtopic";
    let nodeSize: "small" | "medium" | "large" = "medium";
    let nodeLabel = "Novo Subtópico";
    let nodeColor = parentColor;
    let nodeIcon: string | undefined = undefined;

    if (presetType === "note") {
      nodeType = "note";
      nodeSize = "small";
      nodeLabel = "Nova observação / detalhe";
      nodeColor = "#475569";
    } else if (presetType === "alert") {
      nodeType = "note";
      nodeSize = "small";
      nodeLabel = "Ponto Crítico / Pegadinha";
      nodeColor = "#E11D48";
      nodeIcon = "⚠️";
    } else if (presetType === "concept") {
      nodeType = "subtopic";
      nodeSize = "large";
      nodeLabel = "Conceito-Chave Essencial";
      nodeColor = "#7C3AED";
      nodeIcon = "💡";
    } else if (presetType === "subtopic") {
      const isParentRoot = parentNode.id === "root" || parentNode.type === "topic";
      if (!isParentRoot) {
        nodeType = "note";
        nodeSize = "small";
        nodeLabel = "Novo Subtópico";
        nodeColor = parentColor;
      }
    }

    const newNode: Node = {
      id: newId,
      type: nodeType,
      position: { x: parentPos.x + offsetX, y: parentPos.y + offsetY },
      data: {
        label: nodeLabel,
        color: nodeColor,
        size: nodeSize,
        icon: nodeIcon,
        direction: isLeft ? "left" : "right",
        onUpdateLabel: (newLabel: string) => {
          setNodes((current) =>
            current.map((item) =>
              item.id === newId ? { ...item, data: { ...item.data, label: newLabel } } : item
            )
          );
        },
      },
    };

    const newEdge: Edge = {
      id: `e_${parentNode.id}_${newId}`,
      source: parentNode.id,
      target: newId,
      sourceHandle: isLeft ? "source-left" : "source-right",
      targetHandle: isLeft ? "target-right" : "target-left",
      type: edgeType,
      animated: false,
      style: {
        stroke: nodeColor,
        strokeWidth: 2,
      },
    };

    const nextNodes = [...nodes, newNode];
    const nextEdges = [...edges, newEdge];
    setNodes(nextNodes);
    setEdges(nextEdges);
    setSelectedNode(newNode);
    setContextMenu(null);
    setIsInspectorOpen(true);
    pushHistorySnapshot(nextNodes, nextEdges);

    toast.success("Novo nó adicionado! Digite seu conteúdo.");
  };

  // Add sibling node (connected to the same parent as selected node)
  const handleAddSiblingNode = () => {
    const currentNodes = nodesRef.current;
    const currentEdges = edgesRef.current;
    const activeNode = selectedNodeRef.current;

    if (!activeNode || activeNode.id === "root") {
      handleAddChildNode("subtopic");
      return;
    }

    const incomingEdge = currentEdges.find((e) => e.target === activeNode.id);
    const parentId = incomingEdge ? incomingEdge.source : "root";
    const parentNode = currentNodes.find((n) => n.id === parentId) || currentNodes[0];

    const newId = `node_${Date.now()}`;
    const parentColor = (parentNode?.data?.color as string) || (activeNode.data?.color as string) || "#2563EB";

    const isLeft = activeNode.position.x < 0;
    const newPos = {
      x: activeNode.position.x,
      y: activeNode.position.y + 85,
    };

    const newNode: Node = {
      id: newId,
      type: "subtopic",
      position: newPos,
      data: {
        label: "Novo Balão Irmão",
        color: parentColor,
        size: "medium",
        shape: "rounded",
        onUpdateLabel: (newLabel: string) => {
          setNodes((current) =>
            current.map((item) =>
              item.id === newId ? { ...item, data: { ...item.data, label: newLabel } } : item
            )
          );
        },
      },
    };

    const newEdge: Edge = {
      id: `e_${parentId}_${newId}`,
      source: parentId,
      target: newId,
      sourceHandle: isLeft ? "source-left" : "source-right",
      targetHandle: isLeft ? "target-right" : "target-left",
      type: edgeType,
      animated: false,
      style: {
        stroke: parentColor,
        strokeWidth: 2,
      },
    };

    const deselectCurrent = currentNodes.map((n) => ({ ...n, selected: false }));
    const nextNodes = [...deselectCurrent, { ...newNode, selected: true }];
    const nextEdges = [...currentEdges, newEdge];

    setNodes(nextNodes);
    setEdges(nextEdges);
    setSelectedNode(newNode);
    setContextMenu(null);
    setIsInspectorOpen(true);
    pushHistorySnapshot(nextNodes, nextEdges);

    toast.success("Balão irmão criado! (Enter)");
  };

  handleAddChildNodeRef.current = handleAddChildNode;
  handleAddSiblingNodeRef.current = handleAddSiblingNode;

  // AI Superpowers (Expand, Examples, Explain)
  const handleAISuperpower = async (action: "expand" | "examples" | "explain") => {
    const target = selectedNode || nodes[0];
    if (!target) return;

    const label = (target.data?.label as string) || mapTitle;
    const parentColor = (target.data?.color as string) || "#2563EB";
    const parentSize = (target.data?.size as "small" | "medium" | "large") || "medium";

    setIsExpandingAI(true);
    setContextMenu(null);

    const toastId = toast.loading(
      action === "examples"
        ? "Gerando exemplos práticos com IA..."
        : action === "explain"
        ? "Gerando explicação clara com IA..."
        : "Expandindo 3 ramos com IA..."
    );

    try {
      const incomingEdge = edges.find((e) => e.target === target.id);
      const parentNode = incomingEdge ? nodes.find((n) => n.id === incomingEdge.source) : null;
      const parentLabel = (parentNode?.data?.label as string) || "";

      const res = await fetch("/api/ai/expand-mindmap-node", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodeLabel: label,
          mindMapTitle: mapTitle,
          parentLabel,
          action,
        }),
      });

      if (!res.ok) throw new Error("Falha na IA");

      const data = await res.json();
      const subtopics = data.subtopics || [];
      if (subtopics.length === 0) throw new Error("A IA não retornou subtópicos válidos.");

      const newNodes: Node[] = [];
      const newEdges: Edge[] = [];
      const isLeft = target.position.x < 0;
      const offsetX = isLeft ? -400 : 400;

      const isTargetRoot = target.id === "root" || target.type === "topic";

      subtopics.forEach((sub: any, idx: number) => {
        const newId = `ai_node_${Date.now()}_${idx}`;
        const subLabel = sub.label || `Subtópico ${idx + 1}`;
        const spacingY = 95;
        const offsetY = (idx - 1) * spacingY;

        // When expanding from any subtopic or detail node, always create a child note balloon ("balão pequeno como os outros")
        // Only if expanding directly from the central root topic, create a main subtopic pill.
        const nodeType: "subtopic" | "note" = isTargetRoot ? (sub.type || "subtopic") : "note";
        const nodeSize: "small" | "medium" | "large" = isTargetRoot ? (sub.size || "medium") : "small";

        newNodes.push({
          id: newId,
          type: nodeType,
          position: {
            x: target.position.x + offsetX,
            y: target.position.y + offsetY,
          },
          data: {
            label: subLabel,
            color: parentColor,
            size: nodeSize,
            icon: sub.icon || (action === "examples" ? "💡" : action === "explain" ? "🎯" : "📌"),
            direction: isLeft ? "left" : "right",
            onUpdateLabel: (newText: string) => {
              setNodes((current) =>
                current.map((item) =>
                  item.id === newId ? { ...item, data: { ...item.data, label: newText } } : item
                )
              );
            },
          },
        });

        newEdges.push({
          id: `e_${target.id}_${newId}`,
          source: target.id,
          target: newId,
          sourceHandle: isLeft ? "source-left" : "source-right",
          targetHandle: isLeft ? "target-right" : "target-left",
          type: edgeType,
          animated: false,
          style: {
            stroke: parentColor,
            strokeWidth: 2,
          },
        });
      });

      const combinedNodes = [...nodes, ...newNodes];
      const safeNodes = withInlineEditing(resolveCollisions(combinedNodes as any, 25) as Node[]);
      const nextEdges = [...edges, ...newEdges];
      setNodes(safeNodes);
      setEdges(nextEdges);
      pushHistorySnapshot(safeNodes, nextEdges);

      toast.success(
        action === "examples"
          ? "Exemplos práticos adicionados ao mapa!"
          : action === "explain"
          ? "Pontos explicativos gerados com sucesso!"
          : "3 novos ramos gerados com IA!",
        { id: toastId }
      );
    } catch (err) {
      toast.error("Não foi possível conectar com a IA no momento.", { id: toastId });
    } finally {
      setIsExpandingAI(false);
    }
  };

  // Search & Focus on Node
  const handleSearchNodes = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setNodes((nds) => nds.map((n) => ({ ...n, data: { ...n.data, isSearchMatch: false } })));
      return;
    }

    const q = query.toLowerCase();
    const updated = nodes.map((n) => {
      const match = (n.data?.label as string)?.toLowerCase().includes(q);
      return { ...n, data: { ...n.data, isSearchMatch: match } };
    });
    setNodes(updated);

    const firstMatch = updated.find((n) => n.data?.isSearchMatch);
    if (firstMatch) {
      reactFlowInstance.setCenter(firstMatch.position.x, firstMatch.position.y, {
        zoom: 1.3,
        duration: 500,
      });
      setSelectedNode(firstMatch);
    }
  };

  // Save map to localStorage & AppStore
  const handleSaveMap = () => {
    setIsSaving(true);
    try {
      const storeMaps = useAppStore.getState().mindmaps || [];
      const existingInStore = storeMaps.find((m) => m.id === id);
      let existingLocal: any = null;
      try {
        const raw = localStorage.getItem(`mindmap_${id}`);
        if (raw) existingLocal = JSON.parse(raw);
      } catch {}

      const payload: MindMapItem = {
        id,
        name: mapTitle,
        description: existingInStore?.description || existingLocal?.description || "",
        colorTheme: existingInStore?.colorTheme || existingLocal?.colorTheme || activeTheme || "blue",
        folderId: existingInStore?.folderId ?? existingLocal?.folderId ?? "folder-mm-geral",
        nodes,
        edges,
        layout: currentLayout,
        date: new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }),
      };
      localStorage.setItem(`mindmap_${id}`, JSON.stringify(payload));
      if (existingInStore) {
        useAppStore.getState().updateMindMap(payload);
      } else {
        useAppStore.getState().addMindMap(payload);
      }
      toast.success("Mapa mental salvo com sucesso!");
    } catch (e) {
      toast.error("Erro ao salvar mapa mental.");
    } finally {
      setIsSaving(false);
    }
  };

  // Export PDF with proportional or A4 or light-print modes
  const handleExportPDF = async (format: "proportional" | "a4-landscape" | "light-print" = "proportional") => {
    if (!reactFlowWrapper.current) return;
    setIsExportingPdf(true);
    setIsExportDropdownOpen(false);
    toast.loading(
      format === "light-print"
        ? "Gerando PDF com fundo claro e balões de impressão..."
        : format === "a4-landscape"
        ? "Gerando PDF em folha A4 Paisagem..."
        : "Gerando PDF proporcional em alta resolução...",
      { id: "export-pdf" }
    );

    try {
      const filename = `${mapTitle.toLowerCase().replace(/[^a-z0-9]/g, "_")}_mapa_mental.pdf`;
      const isDark = document.documentElement.classList.contains("dark");

      await exportMindMapToPdf({
        element: reactFlowWrapper.current,
        nodes,
        filename,
        isDark,
        exportFormat: format,
        customBackground: isDark ? "#0F1117" : "#FFFFFF",
      });

      toast.success(
        format === "light-print"
          ? "PDF com fundo claro para impressão baixado!"
          : format === "a4-landscape"
          ? "PDF em A4 Paisagem baixado!"
          : "PDF proporcional de alta definição baixado!",
        { id: "export-pdf" }
      );
    } catch (e: any) {
      console.error(e);
      toast.error("Erro ao exportar PDF do mapa mental.", { id: "export-pdf" });
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Export PNG (High-Res & Cropped to Mind Map bounds)
  const handleExportPNG = async () => {
    if (!reactFlowWrapper.current) return;
    setIsExportingPng(true);
    setIsExportDropdownOpen(false);
    toast.loading("Renderizando imagem PNG de alta definição...", { id: "export-png" });

    try {
      const isDark = document.documentElement.classList.contains("dark");
      const { dataUrl } = await renderMindMapToImage({
        element: reactFlowWrapper.current,
        nodes,
        isDark,
        customBackground: isDark ? "#0F1117" : "#FFFFFF",
      });

      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataUrl);
      downloadAnchor.setAttribute("download", `${mapTitle.toLowerCase().replace(/[^a-z0-9]/g, "_")}_mapa.png`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      toast.success("Imagem PNG salva com alta resolução!", { id: "export-png" });
    } catch (e) {
      console.error(e);
      toast.error("Erro ao gerar imagem PNG.", { id: "export-png" });
    } finally {
      setIsExportingPng(false);
    }
  };

  // Copy entire mind map structure as indented Markdown / rich text
  const handleCopyAsMarkdown = useCallback(async () => {
    const currentNodes = nodesRef.current;
    const currentEdges = edgesRef.current;
    const rootNode = currentNodes.find((n) => n.id === "root") || currentNodes[0];
    if (!rootNode) return;

    const childrenMap = new Map<string, string[]>();
    currentEdges.forEach((e) => {
      if (!childrenMap.has(e.source)) childrenMap.set(e.source, []);
      childrenMap.get(e.source)!.push(e.target);
    });

    const lines: string[] = [];
    lines.push(`# ${mapTitle}\n`);

    const visited = new Set<string>();

    const traverse = (nodeId: string, depth: number) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      const node = currentNodes.find((n) => n.id === nodeId);
      if (!node) return;

      const label = (node.data?.label as string) || "Conceito";
      const icon = node.data?.icon ? `${node.data.icon} ` : "";
      const isRoot = node.id === rootNode.id;

      if (!isRoot) {
        const indent = "  ".repeat(Math.max(0, depth - 1));
        if (depth === 1) {
          lines.push(`\n### ${icon}${label}`);
        } else if (node.type === "note") {
          lines.push(`${indent}> 📝 *${label}*`);
        } else {
          lines.push(`${indent}- ${icon}${label}`);
        }
      }

      const children = childrenMap.get(nodeId) || [];
      children.forEach((childId) => traverse(childId, depth + 1));
    };

    traverse(rootNode.id, 0);

    // Any remaining unvisited nodes
    currentNodes.forEach((n) => {
      if (!visited.has(n.id)) {
        lines.push(`- ${(n.data?.label as string) || "Conceito"}`);
      }
    });

    const fullMarkdown = lines.join("\n");
    await copyRichText(fullMarkdown);
    setIsExportDropdownOpen(false);
    toast.success("Estrutura copiada com formatação perfeita para qualquer aplicativo!", { icon: "📋" });
  }, [mapTitle]);

  // Generate Flashcard Deck from Mind Map
  const handleGenerateFlashcardsFromMap = useCallback(() => {
    const currentNodes = nodesRef.current;
    const currentEdges = edgesRef.current;
    const rootNode = currentNodes.find((n) => n.id === "root") || currentNodes[0];

    if (!rootNode || currentNodes.length < 2) {
      toast.error("Adicione mais balões ao mapa para gerar flashcards.");
      return;
    }

    const cards: { front: string; back: string }[] = [];

    currentEdges.forEach((e) => {
      const srcNode = currentNodes.find((n) => n.id === e.source);
      const tgtNode = currentNodes.find((n) => n.id === e.target);
      if (srcNode && tgtNode) {
        const srcLabel = ((srcNode.data?.label as string) || "").trim();
        const tgtLabel = ((tgtNode.data?.label as string) || "").trim();
        if (!tgtLabel) return;

        if (srcNode.id === rootNode.id) {
          cards.push({
            front: tgtLabel,
            back: `${mapTitle}: ${tgtLabel}`,
          });
        } else {
          if (tgtLabel.includes(":") || tgtLabel.includes(" - ") || tgtLabel.includes(" — ")) {
            const parts = tgtLabel.split(/[:—–-]/);
            cards.push({
              front: parts[0].trim(),
              back: parts.slice(1).join(" - ").trim(),
            });
          } else {
            cards.push({
              front: `${srcLabel} — ${tgtLabel}`,
              back: tgtLabel,
            });
          }
        }
      }
    });

    if (cards.length === 0) {
      currentNodes
        .filter((n) => n.id !== rootNode.id)
        .forEach((n) => {
          const lbl = ((n.data?.label as string) || "").trim();
          if (lbl) {
            cards.push({
              front: lbl,
              back: `${mapTitle}: ${lbl}`,
            });
          }
        });
    }

    const subjectName = (mapTitle || "Mapa Mental").trim();
    const folder = useAppStore.getState().getOrCreateFolder(subjectName, "both");

    const deckId = `deck_${Date.now()}`;
    const newDeck = {
      id: deckId,
      name: `${mapTitle} (Flashcards)`,
      description: `Gerado a partir do Mapa Mental "${mapTitle}" com ${cards.length} cartões.`,
      subject: subjectName,
      folderId: folder.id,
      cardCount: cards.length,
      cards: cards.map((c, i) => ({ id: `card_${Date.now()}_${i}`, ...c })),
    };

    useAppStore.getState().addDeck(newDeck);
    setIsExportDropdownOpen(false);
    toast.success(`🎉 Deck com ${cards.length} flashcards criado na pasta "${folder.name}" em Flashcards!`, {
      duration: 4000,
    });
  }, [mapTitle]);

  // Generate Questions from Mind Map
  const handleGenerateQuestionsFromMap = useCallback(() => {
    const currentNodes = nodesRef.current;
    const currentEdges = edgesRef.current;
    const rootNode = currentNodes.find((n) => n.id === "root") || currentNodes[0];

    if (!rootNode || currentNodes.length < 3) {
      toast.error("Adicione mais balões ao mapa para gerar questões.");
      return;
    }

    const nonRootNodes = currentNodes.filter((n) => n.id !== rootNode.id);
    const questionsList: any[] = [];
    const timestamp = Date.now();

    const parentChildrenMap = new Map<string, string[]>();
    currentEdges.forEach((e) => {
      if (!parentChildrenMap.has(e.source)) parentChildrenMap.set(e.source, []);
      const tgtNode = currentNodes.find((n) => n.id === e.target);
      if (tgtNode) {
        const label = ((tgtNode.data?.label as string) || "").trim();
        if (label) parentChildrenMap.get(e.source)!.push(label);
      }
    });

    parentChildrenMap.forEach((children, parentId) => {
      const parentNode = currentNodes.find((n) => n.id === parentId);
      if (!parentNode || children.length < 1) return;
      const parentLabel = ((parentNode.data?.label as string) || "").trim();

      children.forEach((correctChild) => {
        const otherLabels = nonRootNodes
          .map((n) => ((n.data?.label as string) || "").trim())
          .filter((l) => l && l !== correctChild && !children.includes(l));

        const fallbackDistractors = [
          "Ausência de correlação com o quadro clínico",
          "Achado inespecífico sem relevância patológica",
          "Processo degenerativo primário sem acometimento tecidual",
          "Alteração funcional transitória e reversível",
        ];

        const distractors = otherLabels.length >= 3
          ? otherLabels.slice(0, 3)
          : [...otherLabels, ...fallbackDistractors].slice(0, 3);

        const allOptions = [correctChild, ...distractors].sort(() => Math.random() - 0.5);
        const letterMap = ["a", "b", "c", "d"];
        const correctIndex = allOptions.indexOf(correctChild);

        questionsList.push({
          id: `q_map_${timestamp}_${questionsList.length}`,
          text: `Considerando o tema "${mapTitle}" e o conceito "${parentLabel}", assinale a alternativa que apresenta um achado ou aspecto diretamente relacionado:`,
          type: "multiple-choice",
          difficulty: "Médio",
          subject: mapTitle,
          options: allOptions.map((opt, oIdx) => ({
            id: letterMap[oIdx] || `opt_${oIdx}`,
            text: opt,
          })),
          answer: letterMap[correctIndex] || "a",
          explanation: `No tema "${mapTitle}", "${correctChild}" correlaciona-se com "${parentLabel}".`,
          date: "Hoje",
          status: "unanswered",
          timesAnswered: 0,
          timesCorrect: 0,
          timesIncorrect: 0,
        });
      });
    });

    if (questionsList.length === 0) {
      toast.error("Não foi possível gerar questões a partir deste mapa.");
      return;
    }

    const subjectName = (mapTitle || "Mapa Mental").trim();
    const folder = useAppStore.getState().getOrCreateFolder(subjectName, "both");

    const questionsWithFolder = questionsList.map((q) => ({
      ...q,
      subject: subjectName,
      folderId: folder.id,
    }));

    useAppStore.getState().addQuestions(questionsWithFolder);
    setIsExportDropdownOpen(false);
    toast.success(`🎉 ${questionsList.length} questões adicionadas na pasta "${folder.name}" em Questões!`, {
      duration: 4000,
    });
  }, [mapTitle]);

  // Batch change color for selected nodes
  const handleBatchChangeColor = useCallback(
    (color: string) => {
      const selNode = selectedNodeRef.current;
      const currentNodes = nodesRef.current;
      const currentEdges = edgesRef.current;

      const updatedNodes = currentNodes.map((n) => {
        if (n.selected || (selNode && n.id === selNode.id)) {
          return { ...n, data: { ...n.data, color } };
        }
        return n;
      });

      const updatedEdges = currentEdges.map((e) => {
        const src = updatedNodes.find((n) => n.id === e.source);
        if (src && (src.selected || (selNode && src.id === selNode.id))) {
          return { ...e, style: { ...e.style, stroke: color } };
        }
        return e;
      });

      setNodes(updatedNodes);
      setEdges(updatedEdges);
      pushHistorySnapshot(updatedNodes, updatedEdges);
      toast.success("Cor aplicada aos balões selecionados!");
    },
    [pushHistorySnapshot]
  );

  // Export JSON backup
  const handleExportJSON = () => {
    setIsExportDropdownOpen(false);
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify({ name: mapTitle, layout: currentLayout, nodes, edges }, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${mapTitle.toLowerCase().replace(/[^a-z0-9]/g, "_")}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success("Backup JSON exportado!");
  };

  if (!mounted) {
    return (
      <div className="flex flex-col h-full w-full items-center justify-center bg-gray-50 dark:bg-[#0F1117]">
        <div className="flex flex-col items-center gap-2.5">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          <p className="text-xs font-semibold text-gray-500">Abrindo estúdio de mapa mental...</p>
        </div>
      </div>
    );
  }

  const canUndo = historyIndexRef.current > 0;
  const canRedo = historyIndexRef.current < historyRef.current.length - 1;

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-gray-50 dark:bg-[#0F1117] relative select-none">
      {/* ─── TOP MASTER TOOLBAR (HIDDEN IN ZEN MODE) ─── */}
      {!isZenMode && (
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-[#2a2d3a] bg-white dark:bg-[#1A1D27] px-3 sm:px-5 py-2 z-30 shadow-2xs">
          {/* Left: Back, Title & Quick Undo/Redo */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/mindmaps"
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
              title="Voltar aos Mapas"
            >
              <ArrowLeft size={16} />
            </Link>

            <input
              type="text"
              value={mapTitle}
              onChange={(e) => setMapTitle(e.target.value)}
              className="font-bold text-sm sm:text-base text-gray-900 dark:text-white bg-transparent border-b border-transparent hover:border-gray-300 dark:hover:border-gray-700 focus:border-blue-500 outline-none px-1.5 py-0.5 truncate max-w-[160px] sm:max-w-[260px]"
              title="Clique para renomear o mapa"
            />

            <div className="hidden sm:flex items-center gap-1 border-l border-gray-200 dark:border-gray-800 pl-2">
              <button
                type="button"
                onClick={handleUndo}
                disabled={!canUndo}
                className={cn(
                  "p-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer",
                  !canUndo && "opacity-30 cursor-not-allowed"
                )}
                title="Desfazer (Ctrl+Z)"
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleRedo}
                disabled={!canRedo}
                className={cn(
                  "p-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer",
                  !canRedo && "opacity-30 cursor-not-allowed"
                )}
                title="Refazer (Ctrl+Y)"
              >
                <Redo2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Center: Layout Selector Dropdown & Theme Palette */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Layouts Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsLayoutDropdownOpen((prev) => !prev);
                  setIsThemeDropdownOpen(false);
                  setIsExportDropdownOpen(false);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer border border-transparent hover:border-gray-300 dark:hover:border-gray-600"
                title="Escolher algoritmo de organização do mapa mental"
              >
                <Layout className="w-3.5 h-3.5 text-blue-500" />
                <span className="hidden md:inline">Layout:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {LAYOUT_OPTIONS.find((l) => l.id === currentLayout)?.name.split(" ")[0]}
                </span>
                <ChevronDown className="w-3 h-3 text-gray-400" />
              </button>

              {isLayoutDropdownOpen && (
                <div
                  className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-72 bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-[#2a2d3a] rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-2.5 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-800">
                    Modelos de Estrutura Visual
                  </div>
                  <div className="space-y-1 mt-1">
                    {LAYOUT_OPTIONS.map((layout) => (
                      <button
                        key={layout.id}
                        type="button"
                        onClick={() => handleApplyLayout(layout.id)}
                        className={cn(
                          "w-full px-2.5 py-2 text-left rounded-xl flex items-start gap-2.5 transition-colors cursor-pointer",
                          currentLayout === layout.id
                            ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold"
                            : "hover:bg-gray-100 dark:hover:bg-gray-800/80 text-gray-700 dark:text-gray-200"
                        )}
                      >
                        <div className="p-1 rounded-lg bg-gray-100 dark:bg-gray-800 mt-0.5">{layout.icon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold flex items-center justify-between">
                            <span>{layout.name}</span>
                            {currentLayout === layout.id && <Check className="w-3.5 h-3.5 text-blue-600" />}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Themes Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsThemeDropdownOpen((prev) => !prev);
                  setIsLayoutDropdownOpen(false);
                  setIsExportDropdownOpen(false);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer border border-transparent hover:border-gray-300 dark:hover:border-gray-600"
                title="Paletas cromáticas profissionais em 1 clique"
              >
                <Palette className="w-3.5 h-3.5 text-purple-500" />
                <span className="hidden lg:inline">Cores</span>
                <ChevronDown className="w-3 h-3 text-gray-400" />
              </button>

              {isThemeDropdownOpen && (
                <div
                  className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-64 bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-[#2a2d3a] rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-2.5 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-800">
                    Temas Cromáticos Globais
                  </div>
                  <div className="space-y-1 mt-1">
                    {MINDMAP_COLOR_THEMES.map((thm) => (
                      <button
                        key={thm.id}
                        type="button"
                        onClick={() => handleApplyColorTheme(thm.id)}
                        className={cn(
                          "w-full px-2.5 py-2 text-left rounded-xl flex items-center justify-between transition-colors cursor-pointer",
                          activeTheme === thm.id
                            ? "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold"
                            : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200"
                        )}
                      >
                        <div>
                          <div className="text-xs font-semibold">{thm.name}</div>
                          <div className="flex items-center gap-1 mt-1">
                            {thm.palette.slice(0, 5).map((color, cIdx) => (
                              <div
                                key={cIdx}
                                className="w-3 h-3 rounded-full border border-white/40 shadow-2xs"
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                        </div>
                        {activeTheme === thm.id && <Check className="w-3.5 h-3.5 text-purple-600" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Linhas / Conectores Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsEdgeDropdownOpen((prev) => !prev);
                  setIsLayoutDropdownOpen(false);
                  setIsThemeDropdownOpen(false);
                  setIsExportDropdownOpen(false);
                }}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer border border-transparent hover:border-gray-300 dark:hover:border-gray-600"
                title="Estilo das linhas e conectores do mapa"
              >
                <GitBranch className="w-3.5 h-3.5 text-indigo-500" />
                <span className="hidden md:inline">Linhas:</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400 capitalize">
                  {edgeType === "default" ? "Curva" : edgeType === "smoothstep" ? "Ortogonal" : "Reta"}
                </span>
                <ChevronDown className="w-3 h-3 text-gray-400" />
              </button>

              {isEdgeDropdownOpen && (
                <div
                  className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-64 bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-[#2a2d3a] rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-2.5 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-800">
                    Formato dos Conectores
                  </div>
                  <div className="space-y-1 mt-1">
                    {[
                      { id: "default", label: "Curva Suave (Bézier)" },
                      { id: "smoothstep", label: "Degrau Ortogonal (90°)" },
                      { id: "straight", label: "Linha Reta" },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          handleChangeEdgeCurve(item.id as any);
                          setIsEdgeDropdownOpen(false);
                        }}
                        className={cn(
                          "w-full px-2.5 py-2 text-left rounded-xl flex items-center justify-between text-xs transition-colors cursor-pointer",
                          edgeType === item.id
                            ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold"
                            : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200"
                        )}
                      >
                        <span>{item.label}</span>
                        {edgeType === item.id && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Search Toggle */}
            <button
              type="button"
              onClick={() => setIsSearchOpen((prev) => !prev)}
              className={cn(
                "p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1",
                isSearchOpen
                  ? "bg-yellow-500 text-white"
                  : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              )}
              title="Buscar conceito no mapa (Ctrl+F)"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Buscar</span>
            </button>

            {/* Copy Structure */}
            <button
              type="button"
              onClick={handleCopyAsMarkdown}
              className="p-1.5 sm:px-2.5 sm:py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
              title="Copiar estrutura com formatação perfeita para colar em qualquer aplicativo"
            >
              <Copy className="w-3.5 h-3.5 text-emerald-500" />
              <span className="hidden md:inline">Copiar</span>
            </button>

            {/* Generate Flashcards */}
            <button
              type="button"
              onClick={handleGenerateFlashcardsFromMap}
              className="p-1.5 sm:px-2.5 sm:py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
              title="Transformar este mapa mental em Flashcards de estudo"
            >
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              <span className="hidden lg:inline">Flashcards</span>
            </button>

            {/* Generate Questions */}
            <button
              type="button"
              onClick={handleGenerateQuestionsFromMap}
              className="p-1.5 sm:px-2.5 sm:py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
              title="Gerar Questões a partir deste mapa mental"
            >
              <HelpCircle className="w-3.5 h-3.5 text-sky-500" />
              <span className="hidden lg:inline">Questões</span>
            </button>
          </div>

          {/* Right: Zen Mode, Save & Export */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Zen Mode Button */}
            <button
              type="button"
              onClick={() => setIsZenMode(true)}
              className="p-1.5 sm:px-2.5 sm:py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
              title="Modo Foco / Zen (Ocultar menus e focar no estudo)"
            >
              <Eye className="w-3.5 h-3.5 text-emerald-500" />
              <span className="hidden xl:inline">Modo Zen</span>
            </button>

            {/* Save Button */}
            <button
              type="button"
              onClick={handleSaveMap}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Salvar</span>
            </button>

            {/* Export Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsExportDropdownOpen((prev) => !prev);
                  setIsLayoutDropdownOpen(false);
                  setIsThemeDropdownOpen(false);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm cursor-pointer"
                title="Opções de exportação"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Exportar</span>
                <ChevronDown className="w-3 h-3 text-white/80" />
              </button>

              {isExportDropdownOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-[#2a2d3a] rounded-2xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Copiar Estrutura */}
                  <button
                    type="button"
                    onClick={handleCopyAsMarkdown}
                    className="w-full px-3 py-2 text-left rounded-xl flex items-center gap-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs font-medium cursor-pointer transition-colors"
                  >
                    <Copy className="w-4 h-4 text-emerald-500 shrink-0" />
                    <div className="flex flex-col text-left">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        Copiar Estrutura
                      </span>
                      <span className="text-[10px] text-gray-400">
                        Formatação perfeita para Notion, Word e Docs
                      </span>
                    </div>
                  </button>

                  {/* Gerar Flashcards */}
                  <button
                    type="button"
                    onClick={handleGenerateFlashcardsFromMap}
                    className="w-full px-3 py-2 text-left rounded-xl flex items-center gap-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs font-medium cursor-pointer transition-colors"
                  >
                    <Layers className="w-4 h-4 text-indigo-500 shrink-0" />
                    <div className="flex flex-col text-left">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        Flashcards
                      </span>
                      <span className="text-[10px] text-gray-400">
                        Gera cartões automáticos em Flashcards
                      </span>
                    </div>
                  </button>

                  {/* Gerar Questões */}
                  <button
                    type="button"
                    onClick={handleGenerateQuestionsFromMap}
                    className="w-full px-3 py-2 text-left rounded-xl flex items-center gap-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs font-medium cursor-pointer transition-colors"
                  >
                    <HelpCircle className="w-4 h-4 text-sky-500 shrink-0" />
                    <div className="flex flex-col text-left">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        Questões
                      </span>
                      <span className="text-[10px] text-gray-400">
                        Gera questões de fixação baseadas no mapa
                      </span>
                    </div>
                  </button>

                  <div className="w-full h-px bg-gray-100 dark:bg-gray-800 my-1" />

                  {/* PDF Proporcional ao Mapa (Tema Atual) */}
                  <button
                    type="button"
                    onClick={() => handleExportPDF("proportional")}
                    disabled={isExportingPdf}
                    className="w-full px-3 py-2 text-left rounded-xl flex items-center gap-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs font-medium cursor-pointer transition-colors"
                  >
                    <FileDown className="w-4 h-4 text-emerald-500 shrink-0" />
                    <div className="flex flex-col text-left">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {isExportingPdf ? "Gerando PDF..." : "Exportar PDF (Proporcional)"}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        Enquadramento 100% exato nas cores do tema
                      </span>
                    </div>
                  </button>

                  {/* PDF Fundo Claro / Impressão em Papel */}
                  <button
                    type="button"
                    onClick={() => handleExportPDF("light-print")}
                    disabled={isExportingPdf}
                    className="w-full px-3 py-2 text-left rounded-xl flex items-center gap-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs font-medium cursor-pointer transition-colors"
                  >
                    <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                    <div className="flex flex-col text-left">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        PDF (Fundo Claro / Impressão)
                      </span>
                      <span className="text-[10px] text-gray-400">
                        Folha branca e balões claros para impressão
                      </span>
                    </div>
                  </button>

                  {/* PDF Folha A4 Paisagem */}
                  <button
                    type="button"
                    onClick={() => handleExportPDF("a4-landscape")}
                    disabled={isExportingPdf}
                    className="w-full px-3 py-2 text-left rounded-xl flex items-center gap-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs font-medium cursor-pointer transition-colors"
                  >
                    <Grid className="w-4 h-4 text-purple-500 shrink-0" />
                    <div className="flex flex-col text-left">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        PDF (Folha A4 Paisagem)
                      </span>
                      <span className="text-[10px] text-gray-400">
                        Formato A4 padrão para impressoras
                      </span>
                    </div>
                  </button>

                  {/* PNG de Alta Resolução */}
                  <button
                    type="button"
                    onClick={handleExportPNG}
                    disabled={isExportingPng}
                    className="w-full px-3 py-2 text-left rounded-xl flex items-center gap-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs font-medium cursor-pointer transition-colors border-t border-gray-100 dark:border-gray-800 mt-1 pt-2"
                  >
                    <ImageIcon className="w-4 h-4 text-amber-500 shrink-0" />
                    <div className="flex flex-col text-left">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {isExportingPng ? "Gerando PNG..." : "Exportar Imagem PNG"}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        Recorte de alta definição dos balões
                      </span>
                    </div>
                  </button>

                  {/* Backup JSON */}
                  <button
                    type="button"
                    onClick={handleExportJSON}
                    className="w-full px-3 py-2 text-left rounded-xl flex items-center gap-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs font-medium cursor-pointer transition-colors border-t border-gray-100 dark:border-gray-800 mt-1 pt-2"
                  >
                    <Download className="w-4 h-4 text-purple-500 shrink-0" />
                    <span>Backup em JSON</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── SEARCH FLOATING BAR ─── */}
      {isSearchOpen && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 bg-white/95 dark:bg-[#1A1D27]/95 backdrop-blur-md border border-gray-200 dark:border-[#2a2d3a] rounded-2xl shadow-2xl p-2 flex items-center gap-2 min-w-[320px] max-w-[90vw]">
          <Search className="w-4 h-4 text-gray-400 ml-2" />
          <input
            type="text"
            placeholder="Buscar conceito ou palavra no mapa..."
            value={searchQuery}
            onChange={(e) => handleSearchNodes(e.target.value)}
            autoFocus
            className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white outline-none px-1 py-1"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => handleSearchNodes("")}
              className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsSearchOpen(false)}
            className="px-2.5 py-1 text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            Fechar
          </button>
        </div>
      )}

      {/* ─── ZEN MODE EXIT BUTTON ─── */}
      {isZenMode && (
        <button
          type="button"
          onClick={() => setIsZenMode(false)}
          className="absolute top-4 right-4 z-50 flex items-center gap-2 px-3 py-1.5 bg-gray-900/90 text-white rounded-full text-xs font-semibold shadow-xl backdrop-blur-md hover:bg-gray-800 transition-all cursor-pointer"
        >
          <Minimize2 className="w-3.5 h-3.5" />
          <span>Sair do Modo Zen (Esc)</span>
        </button>
      )}

      {/* ─── DOCKED LEFT TOOLBAR (SPACIOUS & EXPANDED) ─── */}
      <div
        className={cn(
          "absolute left-4 top-16 z-20 flex flex-col items-center gap-1.5 bg-white/95 dark:bg-[#1A1D27]/95 backdrop-blur-md p-2 rounded-2xl border border-gray-200 dark:border-[#2a2d3a] shadow-xl transition-transform duration-300",
          isZenMode && "-translate-x-28 pointer-events-none"
        )}
      >
        {/* Add Subtopic */}
        <button
          type="button"
          onClick={() => handleAddChildNode("subtopic")}
          className="p-2.5 rounded-xl text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-all group relative cursor-pointer"
          title="Adicionar Subtópico / Filho (Tab)"
        >
          <Plus className="w-5 h-5" />
          <span className="absolute left-full ml-3 px-2.5 py-1 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 shadow-lg font-medium">
            + Sub-balão Filho (Tab)
          </span>
        </button>

        {/* Add Sibling Node */}
        <button
          type="button"
          onClick={handleAddSiblingNode}
          className="p-2.5 rounded-xl text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-950/50 transition-all group relative cursor-pointer"
          title="Adicionar Balão Irmão (Mesmo nível) (Enter)"
        >
          <Network className="w-5 h-5" />
          <span className="absolute left-full ml-3 px-2.5 py-1 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 shadow-lg font-medium">
            + Balão Irmão (Enter)
          </span>
        </button>

        {/* Add Note */}
        <button
          type="button"
          onClick={() => handleAddChildNode("note")}
          className="p-2.5 rounded-xl text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition-all group relative cursor-pointer"
          title="Adicionar Nota / Observação"
        >
          <FileText className="w-5 h-5" />
          <span className="absolute left-full ml-3 px-2.5 py-1 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 shadow-lg font-medium">
            + Nota Explicativa
          </span>
        </button>

        {/* Add Alert / Callout */}
        <button
          type="button"
          onClick={() => handleAddChildNode("alert")}
          className="p-2.5 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-all group relative cursor-pointer"
          title="Adicionar Alerta / Pegadinha (⚠️)"
        >
          <AlertTriangle className="w-5 h-5" />
          <span className="absolute left-full ml-3 px-2.5 py-1 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 shadow-lg font-medium">
            + Alerta / Pegadinha
          </span>
        </button>

        {/* Add Key Concept */}
        <button
          type="button"
          onClick={() => handleAddChildNode("concept")}
          className="p-2.5 rounded-xl text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/50 transition-all group relative cursor-pointer"
          title="Adicionar Conceito-Chave Destaque (💡)"
        >
          <Lightbulb className="w-5 h-5" />
          <span className="absolute left-full ml-3 px-2.5 py-1 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 shadow-lg font-medium">
            + Conceito-Chave
          </span>
        </button>

        <div className="w-6 h-px bg-gray-200 dark:bg-gray-700 my-0.5" />

        {/* AI Expand 3 Branches */}
        <button
          type="button"
          onClick={() => handleAISuperpower("expand")}
          disabled={isExpandingAI}
          className="p-2.5 rounded-xl text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/50 transition-all group relative cursor-pointer disabled:opacity-50"
          title="Expandir com IA (3 Balões estruturados)"
        >
          {isExpandingAI ? (
            <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
          ) : (
            <Sparkles className="w-5 h-5 text-purple-500" />
          )}
          <span className="absolute left-full ml-3 px-2.5 py-1 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 shadow-lg font-medium">
            Expandir com IA
          </span>
        </button>

        {/* Re-align Current Layout */}
        <button
          type="button"
          onClick={() => handleApplyLayout(currentLayout)}
          className="p-2.5 rounded-xl text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-all group relative cursor-pointer"
          title="Auto-organizar nós e ramos"
        >
          <Layout className="w-5 h-5" />
          <span className="absolute left-full ml-3 px-2.5 py-1 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 shadow-lg font-medium">
            Reorganizar Layout
          </span>
        </button>

        {/* Copy Structure */}
        <button
          type="button"
          onClick={handleCopyAsMarkdown}
          className="p-2.5 rounded-xl text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/50 transition-all group relative cursor-pointer"
          title="Copiar estrutura com formatação perfeita"
        >
          <Copy className="w-5 h-5" />
          <span className="absolute left-full ml-3 px-2.5 py-1 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 shadow-lg font-medium">
            Copiar
          </span>
        </button>

        {/* Generate Flashcards */}
        <button
          type="button"
          onClick={handleGenerateFlashcardsFromMap}
          className="p-2.5 rounded-xl text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-all group relative cursor-pointer"
          title="Transformar mapa em Baralho de Flashcards"
        >
          <Layers className="w-5 h-5" />
          <span className="absolute left-full ml-3 px-2.5 py-1 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 shadow-lg font-medium">
            Flashcards
          </span>
        </button>

        {/* Generate Questions */}
        <button
          type="button"
          onClick={handleGenerateQuestionsFromMap}
          className="p-2.5 rounded-xl text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/50 transition-all group relative cursor-pointer"
          title="Gerar Questões a partir do Mapa"
        >
          <HelpCircle className="w-5 h-5" />
          <span className="absolute left-full ml-3 px-2.5 py-1 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 shadow-lg font-medium">
            Questões
          </span>
        </button>

        {/* Fit View */}
        <button
          type="button"
          onClick={() => reactFlowInstance.fitView({ padding: 0.25, duration: 400 })}
          className="p-2.5 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all group relative cursor-pointer"
          title="Centralizar e Enquadrar Mapa"
        >
          <Maximize2 className="w-5 h-5" />
          <span className="absolute left-full ml-3 px-2.5 py-1 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 shadow-lg font-medium">
            Enquadrar Vista
          </span>
        </button>

        {/* Selected Node Actions */}
        {hasSelection && (
          <>
            <div className="w-6 h-px bg-gray-200 dark:bg-gray-700 my-0.5" />

            {/* Inspector Toggle (available when a node is highlighted) */}
            {selectedNode && (
              <button
                type="button"
                onClick={() => setIsInspectorOpen((prev) => !prev)}
                className={cn(
                  "p-2.5 rounded-xl transition-all group relative cursor-pointer",
                  isInspectorOpen
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50"
                )}
                title="Painel de Estilo e Propriedades"
              >
                <Sliders className="w-5 h-5" />
                <span className="absolute left-full ml-3 px-2.5 py-1 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 shadow-lg font-medium">
                  Propriedades
                </span>
              </button>
            )}

            {/* Shape Selector Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsShapeDropdownOpen((prev) => !prev)}
                className={cn(
                  "p-2.5 rounded-xl transition-all group relative cursor-pointer",
                  isShapeDropdownOpen
                    ? "bg-teal-600 text-white shadow-md"
                    : "text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/50"
                )}
                title="Mudar Formato do Balão (Arredondado, Pílula, Retangular, Balão de Fala)"
              >
                <CircleDot className="w-5 h-5" />
                <span className="absolute left-full ml-3 px-2.5 py-1 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 shadow-lg font-medium">
                  Mudar Formato ({selectedCount > 1 ? `${selectedCount} nós` : "Balão"})
                </span>
              </button>

              {isShapeDropdownOpen && (
                <div
                  className="absolute left-full ml-3 top-0 w-52 bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-[#2a2d3a] rounded-2xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-2.5 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-800">
                    Formato do Balão
                  </div>
                  <div className="space-y-1 mt-1">
                    {SHAPE_OPTIONS.map((sh) => (
                      <button
                        key={sh.id}
                        type="button"
                        onClick={() => {
                          handleChangeNodeShape(sh.id);
                          setIsShapeDropdownOpen(false);
                        }}
                        className="w-full px-2.5 py-2 rounded-xl text-xs flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 font-medium transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono">{sh.icon}</span>
                          <div className="text-left">
                            <span className="font-semibold block">{sh.label}</span>
                            <span className="text-[10px] text-gray-400">{sh.desc}</span>
                          </div>
                        </div>
                        {((selectedNode?.data?.shape as string) || "rounded") === sh.id && (
                          <Check className="w-3.5 h-3.5 text-blue-600" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Duplicate */}
            <button
              type="button"
              onClick={handleDuplicateSelected}
              className="p-2.5 rounded-xl text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-all group relative cursor-pointer"
              title={selectedCount > 1 ? `Duplicar Seleção (${selectedCount}) (Ctrl+D)` : "Duplicar Balão (Ctrl+D)"}
            >
              <Copy className="w-5 h-5" />
              <span className="absolute left-full ml-3 px-2.5 py-1 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 shadow-lg font-medium">
                {selectedCount > 1 ? `Duplicar ${selectedCount} Balões (Ctrl+D)` : "Duplicar Balão (Ctrl+D)"}
              </span>
            </button>

            {/* Delete */}
            <button
              type="button"
              onClick={handleDeleteSelected}
              className="p-2.5 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 transition-all group relative cursor-pointer"
              title={selectedCount > 1 ? `Excluir Seleção (${selectedCount}) (Del)` : "Excluir Balão Selecionado (Del)"}
            >
              <Trash2 className="w-5 h-5" />
              <span className="absolute left-full ml-3 px-2.5 py-1 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 shadow-lg font-medium">
                {selectedCount > 1 ? `Excluir ${selectedCount} Balões (Del)` : "Excluir Balão (Del)"}
              </span>
            </button>
          </>
        )}
      </div>

      {/* ─── RIGHT-SIDE DOCKED / FLOATING NODE STYLE INSPECTOR ─── */}
      {selectedNode && isInspectorOpen && !isZenMode && (
        <div className="absolute right-3 top-14 z-30 w-64 bg-white/95 dark:bg-[#1A1D27]/95 backdrop-blur-md rounded-2xl border border-gray-200 dark:border-[#2a2d3a] shadow-xl p-3.5 animate-in slide-in-from-right-4 duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                Propriedades do Balão
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsInspectorOpen(false)}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3.5 mt-3 text-xs">
            {/* Direct Label Editor */}
            <div>
              <label className="text-[11px] font-bold text-gray-400 block mb-1">Texto do Balão:</label>
              <textarea
                rows={2}
                value={(selectedNode.data?.label as string) || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setNodes((nds) =>
                    nds.map((n) => (n.id === selectedNode.id ? { ...n, data: { ...n.data, label: val } } : n))
                  );
                  setSelectedNode((prev) => (prev ? { ...prev, data: { ...prev.data, label: val } } : null));
                }}
                className="w-full px-2.5 py-1.5 text-xs bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white outline-none focus:border-blue-500 resize-none font-medium"
              />
            </div>

            {/* Size Selector */}
            <div>
              <label className="text-[11px] font-bold text-gray-400 block mb-1">Tamanho:</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(["small", "medium", "large"] as const).map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => handleChangeNodeSize(sz)}
                    className={cn(
                      "py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer text-center",
                      (selectedNode.data?.size || "medium") === sz
                        ? "bg-blue-600 text-white shadow-2xs"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200"
                    )}
                  >
                    {sz === "small" ? "P (Pequeno)" : sz === "medium" ? "M (Médio)" : "G (Grande)"}
                  </button>
                ))}
              </div>
            </div>

            {/* Shape Selector */}
            <div>
              <label className="text-[11px] font-bold text-gray-400 block mb-1">Formato do Balão:</label>
              <div className="grid grid-cols-2 gap-1.5">
                {SHAPE_OPTIONS.map((sh) => (
                  <button
                    key={sh.id}
                    type="button"
                    onClick={() => handleChangeNodeShape(sh.id)}
                    className={cn(
                      "py-1.5 px-2 rounded-xl text-[11px] font-semibold transition-all cursor-pointer text-center border",
                      (selectedNode.data?.shape || "rounded") === sh.id
                        ? "bg-indigo-600 text-white border-indigo-500 shadow-2xs font-bold"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 border-transparent"
                    )}
                  >
                    {sh.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Icon / Badge Preset */}
            <div>
              <label className="text-[11px] font-bold text-gray-400 block mb-1">Ícone / Badge:</label>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleChangeNodeIcon(undefined)}
                  className={cn(
                    "px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer",
                    !selectedNode.data?.icon
                      ? "bg-gray-700 text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200"
                  )}
                >
                  Nenhum
                </button>
                {ICON_PRESETS.map((item) => (
                  <button
                    key={item.icon}
                    type="button"
                    onClick={() => handleChangeNodeIcon(item.icon)}
                    className={cn(
                      "w-7 h-7 rounded-lg text-sm flex items-center justify-center transition-transform hover:scale-125 cursor-pointer",
                      selectedNode.data?.icon === item.icon
                        ? "bg-blue-100 dark:bg-blue-950 ring-2 ring-blue-500"
                        : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200"
                    )}
                    title={item.label}
                  >
                    {item.icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Swatches */}
            <div>
              <label className="text-[11px] font-bold text-gray-400 block mb-1">Cor do Balão:</label>
              <div className="grid grid-cols-5 gap-1.5">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handleChangeNodeColor(c)}
                    className={cn(
                      "h-6 rounded-lg transition-transform hover:scale-110 cursor-pointer shadow-2xs border-2",
                      (selectedNode.data?.color as string) === c ? "border-white ring-2 ring-blue-500" : "border-transparent"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {/* AI Tools for Selected Node */}
            <div className="pt-2 border-t border-gray-100 dark:border-gray-800 space-y-1.5">
              <span className="text-[10px] font-bold text-purple-500 uppercase tracking-wider block">
                Superpoderes de IA:
              </span>
              <button
                type="button"
                onClick={() => handleAISuperpower("expand")}
                disabled={isExpandingAI}
                className="w-full px-2.5 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Expandir 3 Subtópicos</span>
              </button>
              <button
                type="button"
                onClick={() => handleAISuperpower("examples")}
                disabled={isExpandingAI}
                className="w-full px-2.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-colors"
              >
                <Lightbulb className="w-3.5 h-3.5 text-blue-500" />
                <span>Gerar Exemplos Práticos</span>
              </button>
              <button
                type="button"
                onClick={() => handleAISuperpower("explain")}
                disabled={isExpandingAI}
                className="w-full px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-colors"
              >
                <HelpCircle className="w-3.5 h-3.5 text-emerald-500" />
                <span>Explicar de Forma Simples</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── REACT FLOW CANVAS ─── */}
      <div ref={reactFlowWrapper} className="flex-1 h-full w-full relative bg-white dark:bg-[#0F1117]">
        {/* Multi-Selection Floating Action Pill */}
        {selectedCount > 1 && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2.5 px-4 py-2 bg-gray-900/90 dark:bg-[#1A1D27]/95 text-white backdrop-blur-md rounded-full shadow-2xl border border-white/10 text-xs animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="flex items-center gap-1.5 font-semibold">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-[11px] font-bold text-white">
                {selectedCount}
              </span>
              <span>selecionados</span>
            </div>

            {/* Quick Color Swatches for Batch Recoloring */}
            <div className="flex items-center gap-1 pl-2 border-l border-white/20">
              {["#2563EB", "#7C3AED", "#059669", "#E11D48", "#D97706", "#0891B2"].map((col) => (
                <button
                  key={col}
                  type="button"
                  onClick={() => handleBatchChangeColor(col)}
                  className="w-4 h-4 rounded-full border border-white/40 hover:scale-125 transition-transform cursor-pointer shadow-xs"
                  style={{ backgroundColor: col }}
                  title="Aplicar cor aos balões selecionados"
                />
              ))}
            </div>

            {/* Quick Shape Selector for Batch */}
            <div className="hidden sm:flex items-center gap-1 pl-2 border-l border-white/20">
              {SHAPE_OPTIONS.map((sh) => (
                <button
                  key={sh.id}
                  type="button"
                  onClick={() => handleChangeNodeShape(sh.id)}
                  className="px-2 py-0.5 rounded-full bg-white/10 hover:bg-white/25 text-white text-[10px] font-medium transition cursor-pointer"
                  title={`Mudar formato para ${sh.label}`}
                >
                  {sh.label}
                </button>
              ))}
            </div>

            <div className="w-px h-4 bg-white/20" />

            <button
              type="button"
              onClick={handleCopySelected}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white font-medium transition cursor-pointer"
              title="Copiar selecionados (Ctrl+C)"
            >
              <Copy className="w-3.5 h-3.5 text-emerald-300" />
              <span>Copiar <kbd className="text-[10px] opacity-70 font-mono">Ctrl+C</kbd></span>
            </button>
            <button
              type="button"
              onClick={handlePaste}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white font-medium transition cursor-pointer"
              title="Colar balão copiado (Ctrl+V)"
            >
              <Plus className="w-3.5 h-3.5 text-blue-300" />
              <span>Colar <kbd className="text-[10px] opacity-70 font-mono">Ctrl+V</kbd></span>
            </button>
            <button
              type="button"
              onClick={handleDuplicateSelected}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white font-medium transition cursor-pointer"
              title="Duplicar selecionados (Ctrl+D)"
            >
              <Copy className="w-3.5 h-3.5 text-blue-300" />
              <span>Duplicar <kbd className="text-[10px] opacity-70 font-mono">Ctrl+D</kbd></span>
            </button>
            <button
              type="button"
              onClick={handleDeleteSelected}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-300 font-medium transition cursor-pointer"
              title="Excluir selecionados (Del)"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
              <span>Excluir <kbd className="text-[10px] opacity-70 font-mono">Del</kbd></span>
            </button>
            <button
              type="button"
              onClick={handleDeselectAll}
              className="p-1 rounded-full hover:bg-white/10 text-gray-300 hover:text-white transition cursor-pointer"
              title="Desmarcar todos (Esc)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          onEdgeClick={onEdgeClick}
          onEdgeContextMenu={onEdgeContextMenu}
          onNodeContextMenu={onNodeContextMenu}
          onPaneContextMenu={onPaneContextMenu}
          onNodeDragStart={onNodeDragStart}
          onNodeDragStop={onNodeDragStop}
          onSelectionDragStart={onSelectionDragStart}
          onSelectionDragStop={onSelectionDragStop}
          nodeTypes={nodeTypes}
          multiSelectionKeyCode={["Control", "Meta", "Shift"]}
          selectionKeyCode={["Shift"]}
          selectionMode={SelectionMode.Partial}
          deleteKeyCode={null}
          onlyRenderVisibleElements={false}
          elevateNodesOnSelect={false}
          proOptions={{ hideAttribution: true }}
          minZoom={0.15}
          maxZoom={2.5}
          fitView
          className="react-flow-canvas"
        >
          {/* Custom Themed Floating Navigation Toolbar */}
          <div className="absolute bottom-5 right-5 z-20 flex items-center gap-1.5 p-1.5 rounded-2xl bg-white/95 dark:bg-[#1A1D27]/95 backdrop-blur-md border border-gray-200 dark:border-[#2A2D3A] shadow-xl text-gray-700 dark:text-gray-300">
            <button
              type="button"
              onClick={() => reactFlowInstance.zoomIn({ duration: 300 })}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-[#252836] hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
              title="Aproximar zoom (+)"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => reactFlowInstance.zoomOut({ duration: 300 })}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-[#252836] hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
              title="Afastar zoom (-)"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => reactFlowInstance.fitView({ padding: 0.25, duration: 400 })}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-[#252836] hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
              title="Ajustar visualização à tela"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <div className="w-[1px] h-5 bg-gray-200 dark:bg-[#2A2D3A] my-auto" />
            <button
              type="button"
              onClick={() => {
                setBgVariant((prev) => {
                  if (prev === BackgroundVariant.Dots) return BackgroundVariant.Lines;
                  if (prev === BackgroundVariant.Lines) return BackgroundVariant.Cross;
                  return BackgroundVariant.Dots;
                });
                toast.success("Textura da grade alternada!");
              }}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-[#252836] hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
              title="Alternar textura da grade de fundo"
            >
              <Grid className="w-4 h-4" />
            </button>
            <div className="w-[1px] h-5 bg-gray-200 dark:bg-[#2A2D3A] my-auto" />
            <button
              type="button"
              onClick={() => setIsMiniMapOpen((prev) => !prev)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold shadow-sm transition-all cursor-pointer",
                isMiniMapOpen
                  ? "bg-blue-600 text-white border-blue-500 shadow-blue-500/25"
                  : "bg-transparent hover:bg-gray-100 dark:hover:bg-[#252836] border-transparent text-gray-700 dark:text-gray-300"
              )}
              title="Alternar visualização do Minimapa"
            >
              <MapIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Minimapa</span>
            </button>
          </div>

          {isMiniMapOpen && (
            <MiniMap
              position="bottom-right"
              style={{
                width: 200,
                height: 130,
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
          <Background variant={bgVariant} gap={20} size={1} color="#475569" className="opacity-35" />
        </ReactFlow>
      </div>

      {/* ─── CUSTOM RIGHT-CLICK CONTEXT MENU ─── */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-[#2a2d3a] rounded-2xl shadow-2xl py-2 min-w-[230px] text-xs select-none backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.type === "node" && contextMenu.node && (
            <>
              <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-800">
                Balão: {(contextMenu.node.data?.label as string)?.slice(0, 24)}...
              </div>

              {/* AI Expand */}
              <button
                type="button"
                onClick={() => handleAISuperpower("expand")}
                className="w-full px-3 py-2 text-left flex items-center gap-2.5 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 font-bold transition-colors cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Expandir com IA (3 Balões)</span>
              </button>

              <button
                type="button"
                onClick={() => handleAISuperpower("examples")}
                className="w-full px-3 py-2 text-left flex items-center gap-2.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 font-medium transition-colors cursor-pointer"
              >
                <Lightbulb className="w-4 h-4 text-blue-500" />
                <span>Gerar Exemplos Práticos</span>
              </button>

              {/* Add Child */}
              <button
                type="button"
                onClick={() => handleAddChildNode("subtopic")}
                className="w-full px-3 py-2 text-left flex items-center gap-2.5 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4 text-blue-500" />
                <span>Adicionar Sub-balão</span>
              </button>

              {/* Add Note */}
              <button
                type="button"
                onClick={() => handleAddChildNode("note")}
                className="w-full px-3 py-2 text-left flex items-center gap-2.5 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium transition-colors cursor-pointer"
              >
                <FileText className="w-4 h-4 text-amber-500" />
                <span>Adicionar Nota</span>
              </button>

              {/* Copy & Paste */}
              <button
                type="button"
                onClick={() => {
                  handleCopySelected();
                  setContextMenu(null);
                }}
                className="w-full px-3 py-2 text-left flex items-center justify-between text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Copy className="w-4 h-4 text-emerald-500" />
                  <span>Copiar Balão</span>
                </div>
                <kbd className="text-[10px] text-gray-400 font-mono">Ctrl+C</kbd>
              </button>

              <button
                type="button"
                onClick={() => {
                  handlePaste();
                  setContextMenu(null);
                }}
                className="w-full px-3 py-2 text-left flex items-center justify-between text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Plus className="w-4 h-4 text-blue-500" />
                  <span>Colar Balão</span>
                </div>
                <kbd className="text-[10px] text-gray-400 font-mono">Ctrl+V</kbd>
              </button>

              {/* Duplicate */}
              <button
                type="button"
                onClick={() => {
                  handleDuplicateSelected();
                  setContextMenu(null);
                }}
                className="w-full px-3 py-2 text-left flex items-center justify-between text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Copy className="w-4 h-4 text-indigo-500" />
                  <span>Duplicar Balão</span>
                </div>
                <kbd className="text-[10px] text-gray-400 font-mono">Ctrl+D</kbd>
              </button>

              {/* Color Palette Inline Submenu */}
              <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-800">
                <span className="text-[10px] text-gray-400 font-bold block mb-1.5">Mudar Cor:</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        handleChangeNodeColor(c);
                        setContextMenu(null);
                      }}
                      className="w-4 h-4 rounded-full transition-transform hover:scale-125 cursor-pointer shadow-2xs"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Balloon Shape Submenu */}
              <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-800">
                <span className="text-[10px] text-gray-400 font-bold block mb-1.5">Formato do Balão:</span>
                <div className="grid grid-cols-2 gap-1">
                  {SHAPE_OPTIONS.map((sh) => (
                    <button
                      key={sh.id}
                      type="button"
                      onClick={() => {
                        handleChangeNodeShape(sh.id);
                        setContextMenu(null);
                      }}
                      className={cn(
                        "px-2 py-1 rounded-lg text-[10px] font-medium transition text-center cursor-pointer",
                        (contextMenu.node?.data?.shape || "rounded") === sh.id
                          ? "bg-indigo-600 text-white font-bold"
                          : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-700 dark:text-gray-300"
                      )}
                    >
                      {sh.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Delete */}
              <div className="border-t border-gray-100 dark:border-gray-800 pt-1">
                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  className="w-full px-3 py-2 text-left flex items-center gap-2.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 font-semibold transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Excluir Balão</span>
                </button>
              </div>
            </>
          )}

          {contextMenu.type === "pane" && (
            <>
              <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-800">
                Ações do Mapa Mental
              </div>

              <button
                type="button"
                onClick={() => handleAddChildNode("subtopic")}
                className="w-full px-3 py-2 text-left flex items-center justify-between text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Plus className="w-4 h-4 text-blue-500" />
                  <span>Novo Balão / Conceito</span>
                </div>
                <kbd className="text-[10px] text-gray-400 font-mono">Tab</kbd>
              </button>

              {clipboardNodesRef.current.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    handlePaste();
                    setContextMenu(null);
                  }}
                  className="w-full px-3 py-2 text-left flex items-center justify-between text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 font-semibold transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Copy className="w-4 h-4 text-emerald-500" />
                    <span>Colar Balão Copiado</span>
                  </div>
                  <kbd className="text-[10px] opacity-75 font-mono">Ctrl+V</kbd>
                </button>
              )}

              {canUndo && (
                <button
                  type="button"
                  onClick={() => {
                    handleUndo();
                    setContextMenu(null);
                  }}
                  className="w-full px-3 py-2 text-left flex items-center justify-between text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Undo2 className="w-4 h-4 text-gray-500" />
                    <span>Desfazer</span>
                  </div>
                  <kbd className="text-[10px] text-gray-400 font-mono">Ctrl+Z</kbd>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleAddChildNode("note")}
                className="w-full px-3 py-2 text-left flex items-center gap-2.5 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium transition-colors cursor-pointer"
              >
                <FileText className="w-4 h-4 text-amber-500" />
                <span>Nova Nota / Comentário</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  reactFlowInstance.fitView({ padding: 0.2, duration: 600 });
                  setContextMenu(null);
                }}
                className="w-full px-3 py-2 text-left flex items-center gap-2.5 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium transition-colors cursor-pointer"
              >
                <Maximize2 className="w-4 h-4 text-emerald-500" />
                <span>Centralizar Vista (Fit View)</span>
              </button>

              <div className="border-t border-gray-100 dark:border-gray-800 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    handleSaveMap();
                    setContextMenu(null);
                  }}
                  className="w-full px-3 py-2 text-left flex items-center gap-2.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 font-semibold transition-colors cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar Mapa Mental</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleExportPDF();
                    setContextMenu(null);
                  }}
                  className="w-full px-3 py-2 text-left flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 font-semibold transition-colors cursor-pointer"
                >
                  <FileDown className="w-4 h-4" />
                  <span>Exportar em PDF</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── FLOATING EDGE ACTION POPUP (ON CLICK / CONTEXT MENU) ─── */}
      {selectedEdgeData && (
        <div
          className="fixed z-50 bg-white/95 dark:bg-[#1A1D27]/95 border border-gray-200 dark:border-[#2a2d3a] rounded-2xl shadow-2xl p-2.5 min-w-[220px] max-w-[260px] text-xs select-none backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 space-y-2"
          style={{
            top: typeof window !== "undefined" ? Math.max(70, Math.min(window.innerHeight - 180, selectedEdgeData.y - 40)) : selectedEdgeData.y,
            left: typeof window !== "undefined" ? Math.max(20, Math.min(window.innerWidth - 270, selectedEdgeData.x - 110)) : selectedEdgeData.x,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between pb-1.5 border-b border-gray-100 dark:border-gray-800">
            <span className="text-[11px] font-bold text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              Linha de Ligação
            </span>
            <button
              type="button"
              onClick={() => setSelectedEdgeData(null)}
              className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition cursor-pointer"
              title="Fechar (Esc)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick edge color swatches */}
          <div className="pt-1">
            <span className="text-[10px] text-gray-400 font-bold block mb-1">Cor da Linha:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {["#2563EB", "#7C3AED", "#059669", "#E11D48", "#D97706", "#475569"].map((col) => (
                <button
                  key={col}
                  type="button"
                  onClick={() => {
                    const edId = selectedEdgeData.edge.id;
                    pushHistorySnapshot(nodesRef.current, edgesRef.current);
                    setEdges((eds) =>
                      eds.map((e) =>
                        e.id === edId
                          ? { ...e, style: { ...e.style, stroke: col } }
                          : e
                      )
                    );
                    setSelectedEdgeData((prev) =>
                      prev
                        ? {
                            ...prev,
                            edge: {
                              ...prev.edge,
                              style: { ...prev.edge.style, stroke: col },
                            },
                          }
                        : null
                    );
                    toast.success("Cor da linha alterada!");
                  }}
                  className="w-4 h-4 rounded-full border border-black/10 dark:border-white/20 hover:scale-125 transition-transform cursor-pointer shadow-2xs"
                  style={{ backgroundColor: col }}
                  title="Alterar cor da linha"
                />
              ))}
            </div>
          </div>

          {/* Delete Action Button */}
          <div className="pt-1 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={() => handleDeleteEdge(selectedEdgeData.edge)}
              className="w-full py-1.5 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-semibold flex items-center justify-center gap-2 transition cursor-pointer text-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Excluir Linha</span>
              <kbd className="text-[10px] font-mono opacity-70 bg-red-500/20 px-1 rounded">Del</kbd>
            </button>
          </div>
        </div>
      )}

      {/* ─── MAP METRICS & STATS MODAL ─── */}
      {isStatsModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-150"
          onClick={() => setIsStatsModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-[#1A1D27] rounded-3xl border border-gray-200 dark:border-[#2a2d3a] shadow-2xl p-6 overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-500">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-base">
                    Estatísticas do Mapa Mental
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Métricas da estrutura e estimativas de estudo
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsStatsModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 my-5">
              <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                  Total de Conceitos
                </span>
                <p className="text-2xl font-black text-gray-900 dark:text-white mt-0.5">
                  {nodes.length}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                  Conexões / Relações
                </span>
                <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-0.5">
                  {edges.length}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                  Sub-ramos e Notas
                </span>
                <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-0.5">
                  {nodes.filter((n) => n.type === "subtopic" || n.type === "note").length}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                  Revisão Estimada
                </span>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                  ~{Math.max(1, Math.round(nodes.length * 0.75))} min
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => {
                  handleCopyAsMarkdown();
                  setIsStatsModalOpen(false);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/50 text-teal-700 dark:text-teal-300 font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Copy className="w-4 h-4 text-teal-500" />
                <span>Copiar</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleGenerateFlashcardsFromMap();
                  setIsStatsModalOpen(false);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Layers className="w-4 h-4 text-indigo-500" />
                <span>Flashcards</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleGenerateQuestionsFromMap();
                  setIsStatsModalOpen(false);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/50 text-sky-700 dark:text-sky-300 font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <HelpCircle className="w-4 h-4 text-sky-500" />
                <span>Questões</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MindMapEditorPage({ params }: { params?: any }) {
  const routeParams = useParams();
  const rawRouteId =
    (typeof routeParams?.id === "string" ? routeParams.id : Array.isArray(routeParams?.id) ? routeParams.id[0] : "") ||
    (params && typeof params.then !== "function" && params.id ? String(params.id) : "") ||
    "default";

  const [resolvedId, setResolvedId] = useState<string>(rawRouteId);

  useEffect(() => {
    let targetId = rawRouteId;
    if (typeof window !== "undefined") {
      const searchId = new URLSearchParams(window.location.search).get("id");
      if (searchId) {
        targetId = searchId;
      } else {
        const match = window.location.pathname.match(/\/mindmaps\/([^/?#]+)/);
        if (match && match[1] && match[1] !== "default") {
          targetId = decodeURIComponent(match[1]);
        }
      }
      if (targetId && targetId !== "default") {
        try {
          localStorage.setItem("medsetup_last_mindmap_id", targetId);
        } catch {}
      }
    }
    setResolvedId(targetId);
  }, [rawRouteId]);

  return (
    <ReactFlowProvider>
      <MindMapCanvas id={resolvedId} />
    </ReactFlowProvider>
  );
}

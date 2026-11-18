"use client";

import { useState, useEffect, useMemo } from "react";
import {
  GitBranch,
  Plus,
  Search,
  Trash2,
  Folder as FolderIcon,
  FolderOpen,
  FolderInput,
  Calendar,
  ArrowRight,
  ArrowLeft,
  Network,
  Layers,
  Grid,
  CircleDot,
  Activity,
  Sparkles,
  X,
  Check,
  Boxes,
  HelpCircle,
  Filter,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import VerticalFolderSidebar from "@/components/common/VerticalFolderSidebar";
import FolderCardGrid, { SubfoldersGrid } from "@/components/common/FolderCardGrid";
import FolderManagerModal from "@/components/common/FolderManagerModal";
import { useAppStore, MindMapItem } from "@/stores/useAppStore";
import toast from "react-hot-toast";

const CreateMindMapModal = dynamic(() => import("@/components/mindmap/CreateMindMapModal"), { ssr: false });

interface MindMapSummary {
  id: string;
  name: string;
  description: string;
  layout: string;
  colorTheme: string;
  folderId?: string;
  date: string;
  nodes?: any[];
  edges?: any[];
}


const THEME_DOTS: Record<string, string[]> = {
  blue: ["#2563EB", "#0284C7", "#0D9488"],
  purple: ["#7C3AED", "#A855F7", "#EC4899"],
  green: ["#059669", "#10B981", "#14B8A6"],
  amber: ["#D97706", "#F59E0B", "#EA580C"],
  monochrome: ["#1E293B", "#475569", "#94A3B8"],
  medsetup: ["#7C3AED", "#2563EB", "#059669"],
  studyflow: ["#7C3AED", "#2563EB", "#059669"],
};

export default function MindMapsPage() {
  const router = useRouter();
  const navigateToMindMap = (mapId: string) => {
    if (typeof window !== "undefined" && window.location.hostname.endsWith("github.io")) {
      router.push(`/mindmaps/default?id=${encodeURIComponent(mapId)}`);
    } else {
      router.push(`/mindmaps/${mapId}`);
    }
  };
  const {
    folders,
    mindmaps,
    trashItems,
    addMindMap,
    deleteMindMap,
    moveMindMapToFolder,
  } = useAppStore();

  const [maps, setMaps] = useState<MindMapSummary[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [viewAllMaps, setViewAllMaps] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [folderToEdit, setFolderToEdit] = useState<any>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [movingMap, setMovingMap] = useState<MindMapSummary | null>(null);

  // Load maps from useAppStore and localStorage with full bidirectional sync
  useEffect(() => {
    try {
      const trashedIds = new Set(
        (trashItems || [])
          .filter((t) => t.type === "mindmap")
          .map((t) => String(t.originalId))
      );

      const storedById = new Map<string, any>();
      const storedKeys = Object.keys(localStorage).filter((k) =>
        k.startsWith("mindmap_")
      );
      storedKeys.forEach((key) => {
        try {
          const val = JSON.parse(localStorage.getItem(key) || "{}");
          if (val && val.id) {
            if (trashedIds.has(String(val.id))) {
              localStorage.removeItem(key);
            } else {
              storedById.set(String(val.id), val);
            }
          }
        } catch (e) {}
      });

      const loaded: MindMapSummary[] = [];
      const seenIds = new Set<string>();

      // 1. Primary source: useAppStore.mindmaps (keeps exact folderId so Sidebar and Page always match)
      (mindmaps || []).forEach((sm) => {
        if (sm && sm.id && !seenIds.has(String(sm.id)) && !trashedIds.has(String(sm.id))) {
          const localVal = storedById.get(String(sm.id));
          loaded.push({
            id: sm.id,
            name: sm.name || localVal?.name || "Mapa Mental",
            description: sm.description || localVal?.description || "",
            layout: sm.layout || localVal?.layout || "right",
            colorTheme: sm.colorTheme || localVal?.colorTheme || "blue",
            folderId: sm.folderId,
            date: sm.date || localVal?.date || "",
            nodes: sm.nodes && sm.nodes.length > 0 ? sm.nodes : localVal?.nodes,
            edges: sm.edges && sm.edges.length > 0 ? sm.edges : localVal?.edges,
          });
          seenIds.add(String(sm.id));
        }
      });

      // 2. Migrate any orphan maps found in localStorage into useAppStore so Sidebar & Page stay in sync
      storedById.forEach((val, idStr) => {
        if (!seenIds.has(idStr) && !trashedIds.has(idStr)) {
          const summary: MindMapSummary = {
            id: val.id,
            name: val.name || "Mapa Mental",
            description: val.description || "",
            layout: val.layout || "right",
            colorTheme: val.colorTheme || "blue",
            folderId: val.folderId,
            date: val.date || "",
            nodes: val.nodes || [],
            edges: val.edges || [],
          };
          loaded.push(summary);
          seenIds.add(idStr);
          addMindMap({
            id: summary.id,
            name: summary.name,
            description: summary.description,
            layout: summary.layout,
            colorTheme: summary.colorTheme,
            folderId: summary.folderId,
            date: summary.date,
            nodes: summary.nodes || [],
            edges: summary.edges || [],
          });
        }
      });

      // Sort newest first
      loaded.sort((a, b) => Number(b.id) - Number(a.id));
      setMaps(loaded);
    } catch (err) {
      console.warn("Could not load mindmaps:", err);
    }
  }, [mindmaps, trashItems, addMindMap]);

  const handleMindMapCreated = (newMap: MindMapSummary) => {
    try {
      localStorage.setItem(`mindmap_${newMap.id}`, JSON.stringify(newMap));
    } catch (e) {}

    const storeMapItem: MindMapItem = {
      id: newMap.id,
      name: newMap.name,
      description: newMap.description,
      layout: newMap.layout,
      colorTheme: newMap.colorTheme,
      folderId: newMap.folderId || selectedFolderId || "folder-mm-geral",
      date: newMap.date,
      nodes: newMap.nodes || [],
      edges: newMap.edges || [],
    };
    addMindMap(storeMapItem);

    setMaps((prev) => [newMap, ...prev.filter((m) => m.id !== newMap.id)]);
    navigateToMindMap(newMap.id);
  };

  const handleDeleteMap = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      localStorage.removeItem(`mindmap_${id}`);
    } catch (e) {}
    deleteMindMap(id);
    setMaps((prev) => prev.filter((m) => m.id !== id));
    toast.success("Mapa mental movido para a lixeira.");
  };

  const handleConfirmMove = (targetFolderId: string | undefined) => {
    if (!movingMap) return;
    const finalFolder = targetFolderId || "folder-mm-geral";

    moveMindMapToFolder(movingMap.id, finalFolder);

    // Update localStorage
    try {
      const item = localStorage.getItem(`mindmap_${movingMap.id}`);
      if (item) {
        const parsed = JSON.parse(item);
        parsed.folderId = finalFolder;
        localStorage.setItem(`mindmap_${movingMap.id}`, JSON.stringify(parsed));
      }
    } catch (e) {}

    // Update local state
    setMaps((prev) =>
      prev.map((m) =>
        m.id === movingMap.id ? { ...m, folderId: finalFolder } : m
      )
    );

    const folderName =
      folders.find((f) => f.id === finalFolder)?.name || "Geral";
    toast.success(`Mapa movido para a pasta "${folderName}"!`);
    setMovingMap(null);
  };

  const mindmapFolders = useMemo(() => {
    return folders.filter((f) => f.type === "mindmaps");
  }, [folders]);

  const mindmapFolderIds = useMemo(() => {
    return new Set(mindmapFolders.map((f) => f.id));
  }, [mindmapFolders]);

  const activeFolderIds = useMemo(() => {
    if (!selectedFolderId || selectedFolderId === "unassigned") return null;
    const getDescendants = (id: string): string[] => {
      const children = mindmapFolders.filter((f) => f.parentId === id).map((f) => f.id);
      return [id, ...children.flatMap(getDescendants)];
    };
    return new Set(getDescendants(selectedFolderId));
  }, [selectedFolderId, mindmapFolders]);

  // Filtered mind maps (100% synchronized with VerticalFolderSidebar)
  const filteredMaps = useMemo(() => {
    return maps.filter((m) => {
      const effectiveFolder =
        !m.folderId || m.folderId === "folder-geral" || !mindmapFolderIds.has(m.folderId)
          ? "folder-mm-geral"
          : m.folderId;

      const matchesFolder =
        selectedFolderId === null
          ? true
          : selectedFolderId === "unassigned"
          ? !m.folderId || !mindmapFolderIds.has(m.folderId)
          : activeFolderIds !== null
          ? activeFolderIds.has(effectiveFolder)
          : effectiveFolder === selectedFolderId;

      const matchesSearch =
        !searchQuery.trim() ||
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.description &&
          m.description.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesFolder && matchesSearch;
    });
  }, [maps, selectedFolderId, activeFolderIds, searchQuery, mindmapFolderIds]);

  // Active folder name and color
  const activeFolder = useMemo(() => {
    if (!selectedFolderId) return null;
    if (selectedFolderId === "unassigned") {
      return {
        id: "unassigned",
        name: "Geral / Sem Pasta",
        color: "#F59E0B",
        type: "mindmaps" as const,
        createdAt: "Hoje",
      };
    }
    return mindmapFolders.find((f) => f.id === selectedFolderId) || null;
  }, [mindmapFolders, selectedFolderId]);

  const isViewingFolders =
    selectedFolderId === null &&
    !searchQuery.trim() &&
    !viewAllMaps;

  // Mini Dashboard Metrics (clean, proportional & sem poluição)
  const dashboardStats = useMemo(() => {
    const totalMaps = maps.length;
    const totalConcepts = maps.reduce(
      (acc, m) => acc + (m.nodes?.length || 0),
      0
    );
    const activeFoldersWithMaps = new Set(
      maps.map((m) => m.folderId).filter(Boolean)
    ).size;
    const latestMap = maps.length > 0 ? maps[0] : null;

    return {
      totalMaps,
      totalConcepts,
      activeFoldersWithMaps,
      latestMap,
    };
  }, [maps]);

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200 dark:border-[#2a2d3a]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 shadow-2xs">
              <GitBranch className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <span>Mapas Mentais</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Organize matérias e raciocínios clínicos visualmente em múltiplos
            layouts e pastas estruturadas.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-4 py-2.5 rounded-xl transition-all shadow-md shadow-purple-500/20 font-semibold text-xs sm:text-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Mapa Mental</span>
          </button>
        </div>
      </div>

      {/* Mini Dashboard Proporcional & Clean */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Metric 1: Total de Mapas */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-[#2a2d3a] shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <GitBranch className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Total de Mapas
            </p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-extrabold text-gray-900 dark:text-white">
                {dashboardStats.totalMaps}
              </span>
              <span className="text-[11px] text-gray-400 truncate">
                {filteredMaps.length === dashboardStats.totalMaps
                  ? "todos visíveis"
                  : `${filteredMaps.length} filtrados`}
              </span>
            </div>
          </div>
        </div>

        {/* Metric 2: Conceitos & Nós */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-[#2a2d3a] shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Boxes className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Conceitos Mapeados
            </p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-extrabold text-gray-900 dark:text-white">
                {dashboardStats.totalConcepts}
              </span>
              <span className="text-[11px] text-gray-400">nós de estudo</span>
            </div>
          </div>
        </div>

        {/* Metric 3: Pastas de Estudo */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-[#2a2d3a] shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <FolderOpen className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Pastas Ativas
            </p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-extrabold text-gray-900 dark:text-white">
                {mindmapFolders.length}
              </span>
              <span className="text-[11px] text-gray-400 truncate">
                {dashboardStats.activeFoldersWithMaps} com mapas
              </span>
            </div>
          </div>
        </div>

        {/* Metric 4: Estudo Recente */}
        <div
          onClick={() => {
            if (dashboardStats.latestMap) {
              navigateToMindMap(dashboardStats.latestMap.id);
            }
          }}
          className={cn(
            "p-4 rounded-2xl bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-[#2a2d3a] shadow-xs flex items-center gap-3.5 transition-all select-none",
            dashboardStats.latestMap
              ? "cursor-pointer hover:border-amber-400 dark:hover:border-amber-500/80 hover:shadow-md hover:-translate-y-0.5"
              : ""
          )}
          role={dashboardStats.latestMap ? "button" : undefined}
          tabIndex={dashboardStats.latestMap ? 0 : undefined}
        >
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Mais Recente
            </p>
            <div className="mt-0.5">
              <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                {dashboardStats.latestMap
                  ? dashboardStats.latestMap.name
                  : "Nenhum mapa criado"}
              </p>
              <p className="text-[10px] text-gray-400 truncate">
                {dashboardStats.latestMap?.date || "Inicie seu primeiro estudo"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Two-Column Structure: Folder Sidebar on Left + Content on Right */}
      <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
        {/* Left Column: Shared Vertical Folder Sidebar (Identical to Flashcards, Questions & Anotações) */}
        <VerticalFolderSidebar
          type="mindmaps"
          selectedFolderId={selectedFolderId}
          onSelectFolder={setSelectedFolderId}
          onSelectItem={(mapId) => navigateToMindMap(mapId)}
          className="w-full lg:w-72 xl:w-80 shrink-0"
        />

        {/* Right Column: Folders View OR Mind Map Gallery */}
        <div className="flex-1 min-w-0 space-y-5 w-full">
          {isViewingFolders ? (
            <FolderCardGrid
              title="Pastas de Mapas Mentais"
              subtitle="Selecione uma pasta para visualizar seus mapas mentais ou crie uma nova pasta temática."
              folders={mindmapFolders}
              getItemCount={(folderId) => {
                const getDescendants = (id: string): string[] => {
                  const children = mindmapFolders.filter((f) => f.parentId === id).map((f) => f.id);
                  return [id, ...children.flatMap(getDescendants)];
                };
                const targetIds = new Set(getDescendants(folderId));
                return maps.filter((m) => {
                  const eff =
                    !m.folderId || m.folderId === "folder-geral" || !mindmapFolderIds.has(m.folderId)
                      ? "folder-mm-geral"
                      : m.folderId;
                  return targetIds.has(eff);
                }).length;
              }}
              getItemPreviews={(folderId) =>
                maps
                  .filter((m) => {
                    const eff =
                      !m.folderId || m.folderId === "folder-geral" || !mindmapFolderIds.has(m.folderId)
                        ? "folder-mm-geral"
                        : m.folderId;
                    return eff === folderId;
                  })
                  .map((m) => ({ id: m.id, title: m.name }))
              }
              itemLabel={{ singular: "mapa", plural: "mapas" }}
              onSelectFolder={(folderId) => {
                setSelectedFolderId(folderId);
                setViewAllMaps(false);
              }}
              onCreateFolder={() => {
                setFolderToEdit(null);
                setIsFolderModalOpen(true);
              }}
              onViewAll={() => setViewAllMaps(true)}
              viewAllLabel="Ver Todos em Lista"
            />
          ) : (
            <>
              {/* Back to Folders Button */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    const parentId = activeFolder?.parentId || null;
                    setSelectedFolderId(parentId);
                    setViewAllMaps(false);
                    setSearchQuery("");
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {activeFolder?.parentId
                    ? `Voltar para "${mindmapFolders.find((f) => f.id === activeFolder.parentId)?.name || "Pasta Anterior"}"`
                    : "Voltar para Pastas"}
                </button>
              </div>

              {/* Subpastas no início da pasta aberta */}
              {selectedFolderId && (
                <SubfoldersGrid
                  parentFolderId={selectedFolderId}
                  parentFolderName={activeFolder?.name}
                  folders={mindmapFolders}
                  getItemCount={(folderId) => {
                    const getDescendants = (id: string): string[] => {
                      const children = mindmapFolders.filter((f) => f.parentId === id).map((f) => f.id);
                      return [id, ...children.flatMap(getDescendants)];
                    };
                    const targetIds = new Set(getDescendants(folderId));
                    return maps.filter((m) => {
                      const eff =
                        !m.folderId || m.folderId === "folder-geral" || !mindmapFolderIds.has(m.folderId)
                          ? "folder-mm-geral"
                          : m.folderId;
                      return targetIds.has(eff);
                    }).length;
                  }}
                  itemLabel={{ singular: "mapa", plural: "mapas" }}
                  onSelectFolder={(subId) => {
                    setSelectedFolderId(subId);
                    setViewAllMaps(false);
                  }}
                />
              )}

              {/* Active Folder Header + Search Toolbar */}
          <div className="bg-white dark:bg-[#1A1D27] p-4 rounded-2xl border border-gray-200 dark:border-[#2a2d3a] shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Folder Breadcrumb */}
              <div className="flex items-center gap-2 min-w-0">
                {activeFolder ? (
                  <>
                    <span
                      className="w-3 h-3 rounded-full shrink-0 shadow-2xs"
                      style={{ backgroundColor: activeFolder.color || "#7C3AED" }}
                    />
                    <div className="truncate">
                      <h2 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                        {activeFolder.name}
                      </h2>
                      <span className="text-[11px] text-gray-400">
                        {filteredMaps.length} mapa(s) nesta pasta
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <div>
                      <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                        Todas as Pastas
                      </h2>
                      <span className="text-[11px] text-gray-400">
                        Exibindo todos os mapas mentais da sua galeria
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Search Bar */}
              <div className="relative min-w-[200px] sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por tema ou título..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-gray-50 dark:bg-[#0F1117] border border-gray-200 dark:border-[#2a2d3a] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-md cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Cards Grid */}
          {filteredMaps.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4.5">
              {filteredMaps.map((map) => {
                const mapFolder = folders.find((f) => f.id === map.folderId);
                const dots = THEME_DOTS[map.colorTheme] || THEME_DOTS.blue;
                const nodeCount = map.nodes?.length || 0;
                const edgeCount = map.edges?.length || 0;

                return (
                  <div
                    key={map.id}
                    draggable={true}
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", String(map.id));
                      e.dataTransfer.setData("application/studyflow-item-id", String(map.id));
                      e.dataTransfer.setData("application/studyflow-item-type", "mindmaps");
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onClick={() => navigateToMindMap(map.id)}
                    className="group bg-white dark:bg-[#1A1D27] rounded-2xl border border-gray-200 dark:border-[#2a2d3a] hover:border-purple-500/80 dark:hover:border-purple-500/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden relative cursor-grab active:cursor-grabbing hover:-translate-y-0.5 select-none"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        navigateToMindMap(map.id);
                      }
                    }}
                  >
                    <div>
                      {/* Card Visual Header Bar */}
                      <div className="p-3 border-b border-gray-100 dark:border-gray-800/80 bg-gray-50/70 dark:bg-[#141620] flex items-center justify-between gap-2">
                        {/* Folder Identification */}
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{
                              backgroundColor: mapFolder?.color || "#94A3B8",
                            }}
                          />
                          <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 truncate">
                            {mapFolder?.name || "Geral (Sem Pasta)"}
                          </span>
                        </div>

                        {/* Top Action Buttons */}
                        <div className="flex items-center gap-1 shrink-0">
                          {/* Move to Folder Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setMovingMap(map);
                            }}
                            className="p-1.5 text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-white dark:hover:bg-[#1A1D27] rounded-lg transition-colors cursor-pointer"
                            title="Mover mapa para outra pasta"
                          >
                            <FolderInput className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={(e) => handleDeleteMap(e, map.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-white dark:hover:bg-[#1A1D27] rounded-lg transition-colors cursor-pointer"
                            title="Excluir mapa mental"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Card Content */}
                      <div className="p-4 space-y-2.5">

                        {/* Map Title */}
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                          {map.name}
                        </h3>

                        {/* Description */}
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                          {map.description || "Mapa mental estruturado."}
                        </p>

                        {/* Micro-stats bar & Palette dots */}
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500">
                            {nodeCount} conceito{nodeCount !== 1 ? "s" : ""} •{" "}
                            {edgeCount} conexõe{edgeCount !== 1 ? "s" : ""}
                          </span>

                          {/* 3 mini color dots representing the palette */}
                          <div
                            className="flex items-center gap-1"
                            title={`Paleta: ${map.colorTheme || "Padrão"}`}
                          >
                            {dots.slice(0, 3).map((c, i) => (
                              <span
                                key={i}
                                className="w-2 h-2 rounded-full shadow-2xs"
                                style={{ backgroundColor: c }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer: Date & Direct Action */}
                    <div className="px-4 py-3 bg-gray-50/50 dark:bg-[#151722]/60 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-400">
                      <span className="flex items-center gap-1.5 text-[11px]">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        {map.date || "Sem data"}
                      </span>

                      <span className="inline-flex items-center gap-1 text-xs font-bold text-purple-600 dark:text-purple-400 group-hover:translate-x-0.5 transition-transform">
                        <span>Abrir Editor</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white dark:bg-[#1A1D27] rounded-2xl border border-dashed border-gray-300 dark:border-[#2a2d3a] shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3">
                <GitBranch className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">
                {searchQuery
                  ? "Nenhum mapa encontrado com essa busca"
                  : selectedFolderId
                  ? `Nenhum mapa na pasta "${activeFolder?.name || "selecionada"}"`
                  : "Nenhum mapa mental criado ainda"}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-5 leading-relaxed">
                {searchQuery
                  ? "Tente buscar por outro termo para visualizar seus mapas mentais."
                  : "Crie seu mapa mental escolhendo entre múltiplos formatos ou gere com IA a partir de resumos e PDFs."}
              </p>
              <div className="flex items-center gap-2">
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
                  >
                    Limpar Busca
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-700 text-white transition-all shadow-md shadow-purple-500/20 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>
                    {selectedFolderId
                      ? `Criar Mapa nesta Pasta`
                      : "Criar Primeiro Mapa"}
                  </span>
                </button>
              </div>
            </div>
          )}
            </>
          )}
        </div>
      </div>

      {/* Modal Mover Mapa para Pasta */}
      {movingMap && (
        <div
          onClick={() => setMovingMap(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white dark:bg-[#1A1D27] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl p-5 space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <FolderInput className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  Mover Mapa para Pasta
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setMovingMap(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400">
              Selecione a pasta de destino para o mapa{" "}
              <strong className="text-gray-800 dark:text-gray-200">
                "{movingMap.name}"
              </strong>
              :
            </p>

            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
              {/* Option: Geral (Sem pasta) */}
              <button
                type="button"
                onClick={() => handleConfirmMove("folder-geral")}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  !movingMap.folderId || movingMap.folderId === "folder-geral"
                    ? "bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                <div className="flex items-center gap-2">
                  <FolderIcon className="w-4 h-4 text-gray-400" />
                  <span>Geral (Sem Pasta)</span>
                </div>
                {(!movingMap.folderId ||
                  movingMap.folderId === "folder-geral") && (
                  <Check className="w-4 h-4 text-purple-600" />
                )}
              </button>

              {/* All relevant folders */}
              {mindmapFolders.map((folder) => {
                const isCurrent = movingMap.folderId === folder.id;
                return (
                  <button
                    key={folder.id}
                    type="button"
                    onClick={() => handleConfirmMove(folder.id)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isCurrent
                        ? "bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                        style={{ backgroundColor: folder.color || "#7C3AED" }}
                      />
                      <span>{folder.name}</span>
                    </div>
                    {isCurrent && <Check className="w-4 h-4 text-purple-600" />}
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setMovingMap(null)}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Criação Completo */}
      <CreateMindMapModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={handleMindMapCreated}
        defaultFolderId={selectedFolderId}
      />

      {/* Modal de Gerenciamento de Pastas */}
      <FolderManagerModal
        isOpen={isFolderModalOpen}
        onClose={() => {
          setIsFolderModalOpen(false);
          setFolderToEdit(null);
        }}
        defaultType="mindmaps"
        folderToEdit={folderToEdit}
      />
    </div>
  );
}

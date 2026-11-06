"use client";

import { useState, useRef, useEffect } from "react";
import {
  Folder,
  FolderOpen,
  FolderPlus,
  Trash2,
  Edit2,
  ChevronRight,
  ChevronDown,
  CornerDownRight,
  Layers,
  Plus,
  ArrowRight,
  GripVertical,
  MoreVertical,
} from "lucide-react";
import { useAppStore, Folder as FolderType } from "@/stores/useAppStore";
import FolderManagerModal from "./FolderManagerModal";
import MoveFolderModal, { isDescendant } from "./MoveFolderModal";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

interface VerticalFolderSidebarProps {
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  type: "flashcards" | "questions" | "mindmaps" | "anotacoes";
  extraFilterSlot?: React.ReactNode;
  className?: string;
}

export default function VerticalFolderSidebar({
  selectedFolderId,
  onSelectFolder,
  type,
  extraFilterSlot,
  className,
}: VerticalFolderSidebarProps) {
  const { folders, flashcardDecks, questions, mindmaps, anotacoes, updateFolder, deleteFolder } = useAppStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [folderToEdit, setFolderToEdit] = useState<FolderType | null>(null);
  const [modalParentId, setModalParentId] = useState<string | null>(null);
  const [expandedFolderIds, setExpandedFolderIds] = useState<Record<string, boolean>>({});
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);

  // Move Folder Modal state
  const [moveModalFolder, setMoveModalFolder] = useState<FolderType | null>(null);

  // Discrete action menu state
  const [openMenuFolderId, setOpenMenuFolderId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuFolderId(null);
      }
    };
    if (openMenuFolderId) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openMenuFolderId]);

  // Drag and Drop state & ref for synchronous tracking
  const draggedFolderIdRef = useRef<string | null>(null);
  const [draggedFolderId, setDraggedFolderId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [isOverRootDropZone, setIsOverRootDropZone] = useState(false);

  const relevantFolders = folders.filter((f) => f.type === type);

  // Total count for "Todas as Pastas"
  const totalCount =
    type === "flashcards"
      ? flashcardDecks.length
      : type === "questions"
      ? questions.length
      : type === "anotacoes"
      ? (anotacoes || []).length
      : (mindmaps || []).length;

  // Count items inside a folder and all its descendants recursively
  const getItemCount = (folderId: string) => {
    const getDescendantIds = (id: string): string[] => {
      const direct = relevantFolders.filter((f) => f.parentId === id).map((f) => f.id);
      return [id, ...direct.flatMap(getDescendantIds)];
    };
    const targetFolderIds = new Set(getDescendantIds(folderId));

    if (type === "flashcards") {
      return flashcardDecks.filter((d) =>
        targetFolderIds.has(d.folderId || "folder-geral")
      ).length;
    } else if (type === "questions") {
      return questions.filter((q) =>
        targetFolderIds.has(q.folderId || "folder-geral")
      ).length;
    } else if (type === "anotacoes") {
      return (anotacoes || []).filter((a) =>
        targetFolderIds.has(a.folderId || "folder-geral")
      ).length;
    } else {
      return (mindmaps || []).filter((m) =>
        targetFolderIds.has(m.folderId || "folder-geral")
      ).length;
    }
  };

  const toggleExpand = (e: React.MouseEvent, folderId: string) => {
    e.stopPropagation();
    setExpandedFolderIds((prev) => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  const handleDeleteFolder = (e: React.MouseEvent, folder: FolderType) => {
    e.stopPropagation();
    deleteFolder(folder.id);
    if (selectedFolderId === folder.id) {
      onSelectFolder(folder.parentId || null);
    }
    toast.success(`Pasta "${folder.name}" movida para a lixeira.`);
  };

  const handleEditFolder = (e: React.MouseEvent, folder: FolderType) => {
    e.stopPropagation();
    setFolderToEdit(folder);
    setModalParentId(folder.parentId || null);
    setIsModalOpen(true);
  };

  const handleOpenMoveModal = (e: React.MouseEvent, folder: FolderType) => {
    e.stopPropagation();
    setMoveModalFolder(folder);
  };

  const handleCreateSubfolder = (e: React.MouseEvent, parentId: string) => {
    e.stopPropagation();
    setFolderToEdit(null);
    setModalParentId(parentId);
    setIsModalOpen(true);
  };

  const handleCreateRootFolder = () => {
    setFolderToEdit(null);
    setModalParentId(null);
    setIsModalOpen(true);
  };

  // Move a folder into another folder (as subfolder) or to root level (parentId = null)
  const handleMoveFolder = (folderId: string, targetParentId: string | null) => {
    const folder = folders.find((f) => f.id === folderId);
    if (!folder) return;
    if (folderId === targetParentId) return;

    if (targetParentId && isDescendant(folderId, targetParentId, relevantFolders)) {
      toast.error("Não é possível mover uma pasta para dentro de uma de suas subpastas.");
      return;
    }

    updateFolder({
      ...folder,
      parentId: targetParentId || null,
    });

    if (targetParentId) {
      setExpandedFolderIds((prev) => ({ ...prev, [targetParentId]: true }));
      const parentName = folders.find((f) => f.id === targetParentId)?.name || "outra pasta";
      toast.success(`Pasta "${folder.name}" agora é subpasta de "${parentName}"!`, { icon: "📁" });
    } else {
      toast.success(`Pasta "${folder.name}" movida para o nível principal!`, { icon: "📂" });
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, folder: FolderType) => {
    draggedFolderIdRef.current = folder.id;
    setDraggedFolderId(folder.id);
    e.dataTransfer.setData("text/plain", folder.id);
    e.dataTransfer.setData("application/studyflow-folder-id", folder.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    draggedFolderIdRef.current = null;
    setDraggedFolderId(null);
    setDragOverFolderId(null);
    setIsOverRootDropZone(false);
  };

  const handleDragEnterFolder = (e: React.DragEvent, targetFolder: FolderType) => {
    const currentDraggedId = draggedFolderIdRef.current || draggedFolderId;
    if (
      currentDraggedId &&
      currentDraggedId !== targetFolder.id &&
      !isDescendant(currentDraggedId, targetFolder.id, relevantFolders)
    ) {
      e.preventDefault();
      e.stopPropagation();
      setDragOverFolderId(targetFolder.id);
    }
  };

  const handleDragOverFolder = (e: React.DragEvent, targetFolder: FolderType) => {
    const currentDraggedId = draggedFolderIdRef.current || draggedFolderId;
    if (
      currentDraggedId &&
      currentDraggedId !== targetFolder.id &&
      !isDescendant(currentDraggedId, targetFolder.id, relevantFolders)
    ) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "move";
      if (dragOverFolderId !== targetFolder.id) {
        setDragOverFolderId(targetFolder.id);
      }
    }
  };

  const handleDragLeaveFolder = (e: React.DragEvent, targetFolder: FolderType) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) {
      return;
    }
    if (dragOverFolderId === targetFolder.id) {
      setDragOverFolderId(null);
    }
  };

  const handleDropOnFolder = (e: React.DragEvent, targetFolder: FolderType) => {
    e.preventDefault();
    e.stopPropagation();
    const sourceId =
      e.dataTransfer.getData("application/studyflow-folder-id") ||
      e.dataTransfer.getData("text/plain") ||
      draggedFolderIdRef.current ||
      draggedFolderId;

    if (
      sourceId &&
      sourceId !== targetFolder.id &&
      !isDescendant(sourceId, targetFolder.id, relevantFolders)
    ) {
      handleMoveFolder(sourceId, targetFolder.id);
    }
    draggedFolderIdRef.current = null;
    setDraggedFolderId(null);
    setDragOverFolderId(null);
  };

  // Root drop zone handlers
  const handleDragEnterRootZone = (e: React.DragEvent) => {
    const currentDraggedId = draggedFolderIdRef.current || draggedFolderId;
    if (currentDraggedId) {
      const dragged = folders.find((f) => f.id === currentDraggedId);
      if (dragged?.parentId) {
        e.preventDefault();
        e.stopPropagation();
        setIsOverRootDropZone(true);
      }
    }
  };

  const handleDragOverRootZone = (e: React.DragEvent) => {
    const currentDraggedId = draggedFolderIdRef.current || draggedFolderId;
    if (currentDraggedId) {
      const dragged = folders.find((f) => f.id === currentDraggedId);
      if (dragged?.parentId) {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = "move";
        setIsOverRootDropZone(true);
      }
    }
  };

  const handleDragLeaveRootZone = (e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) {
      return;
    }
    setIsOverRootDropZone(false);
  };

  const handleDropOnRootZone = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const sourceId =
      e.dataTransfer.getData("application/studyflow-folder-id") ||
      e.dataTransfer.getData("text/plain") ||
      draggedFolderIdRef.current ||
      draggedFolderId;

    if (sourceId) {
      handleMoveFolder(sourceId, null);
    }
    draggedFolderIdRef.current = null;
    setIsOverRootDropZone(false);
    setDraggedFolderId(null);
  };

  // Recursive tree rendering function - Minimalist & Sleek
  const renderFolderNode = (folder: FolderType, depth: number = 0) => {
    const isSelected = selectedFolderId === folder.id;
    const count = getItemCount(folder.id);
    const folderColor = folder.color || "#64748B";
    const subfolders = relevantFolders.filter((f) => f.parentId === folder.id);
    const hasSubfolders = subfolders.length > 0;
    const isExpanded = expandedFolderIds[folder.id] ?? true;
    const isDragTarget = dragOverFolderId === folder.id;
    const isBeingDragged = draggedFolderId === folder.id;

    return (
      <div key={folder.id} className="space-y-0.5">
        <div
          draggable={true}
          onDragStart={(e) => handleDragStart(e, folder)}
          onDragEnd={handleDragEnd}
          onDragEnter={(e) => handleDragEnterFolder(e, folder)}
          onDragOver={(e) => handleDragOverFolder(e, folder)}
          onDragLeave={(e) => handleDragLeaveFolder(e, folder)}
          onDrop={(e) => handleDropOnFolder(e, folder)}
          onClick={() => onSelectFolder(folder.id)}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpenMenuFolderId((prev) => (prev === folder.id ? null : folder.id));
          }}
          style={{ paddingLeft: `${6 + depth * 14}px` }}
          className={`group relative flex items-center justify-between pr-2 py-1.5 rounded-lg text-[13px] font-medium transition-colors cursor-pointer select-none ${
            isBeingDragged
              ? "opacity-30 border border-dashed border-gray-400 dark:border-gray-600 bg-gray-100/50 dark:bg-gray-800/30"
              : isDragTarget
              ? "bg-gray-200/80 dark:bg-[#252836] ring-1 ring-gray-400 dark:ring-gray-500 font-semibold text-gray-900 dark:text-white"
              : isSelected
              ? "bg-gray-200/80 dark:bg-[#222634] text-gray-900 dark:text-white font-semibold"
              : "text-gray-600 dark:text-gray-300 hover:bg-gray-100/70 dark:hover:bg-gray-800/40 hover:text-gray-900 dark:hover:text-white"
          }`}
          title="Arraste para mover para outra pasta, ou clique para filtrar"
        >
          {/* Left item contents */}
          <div className={`flex items-center gap-1.5 min-w-0 flex-1 ${draggedFolderId ? "pointer-events-none" : ""}`}>
            {/* Subtle Grip handle (only on hover) */}
            <GripVertical
              size={12}
              className="text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 -ml-1 cursor-grab"
            />

            {/* Chevron expand/collapse toggle */}
            {hasSubfolders ? (
              <button
                type="button"
                onClick={(e) => toggleExpand(e, folder.id)}
                className="p-0.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded pointer-events-auto cursor-pointer shrink-0 transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown size={13} />
                ) : (
                  <ChevronRight size={13} />
                )}
              </button>
            ) : depth > 0 ? (
              <CornerDownRight size={11} className="text-gray-400/70 shrink-0 mx-0.5" />
            ) : (
              <span className="w-1 shrink-0" />
            )}

            {/* Clean monochrome Folder icon */}
            {isSelected ? (
              <FolderOpen size={15} className="shrink-0 text-gray-700 dark:text-gray-300" />
            ) : (
              <Folder size={15} className="shrink-0 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
            )}

            {/* The ONLY colored element: Folder color identification tag */}
            <span
              className="w-2 h-2 rounded-full shrink-0 ring-1 ring-black/15 dark:ring-white/20 shadow-2xs"
              style={{ backgroundColor: folderColor }}
              title={`Etiqueta de cor: ${folderColor}`}
            />

            {/* Folder Name */}
            <span className="truncate text-[13px]">{folder.name}</span>
          </div>

          {/* Right item contents: Minimalist number & subtle 3-dots */}
          <div className="flex items-center gap-1 shrink-0 relative">
            {/* Simple unadorned counter number as in Outlook reference image */}
            <span
              className={`text-xs tabular-nums font-normal ${
                isSelected
                  ? "text-gray-900 dark:text-gray-100 font-medium"
                  : "text-gray-400 dark:text-gray-500"
              }`}
            >
              {count}
            </span>

            {/* 3-dots action menu button (discreet, shows on hover or active) */}
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenuFolderId((prev) => (prev === folder.id ? null : folder.id));
                }}
                className={cn(
                  "p-1 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/60 dark:hover:bg-gray-700/60 transition-opacity cursor-pointer",
                  openMenuFolderId === folder.id
                    ? "opacity-100 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                    : "opacity-0 group-hover:opacity-100 focus:opacity-100"
                )}
                title="Opções da pasta"
              >
                <MoreVertical size={13} />
              </button>

              {openMenuFolderId === folder.id && (
                <div
                  ref={menuRef}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-[#2a2d3a] rounded-xl shadow-xl py-1 z-50 text-xs font-medium animate-in fade-in zoom-in-95 duration-100"
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      setOpenMenuFolderId(null);
                      handleCreateSubfolder(e, folder.id);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  >
                    <Plus size={13} className="text-gray-500 dark:text-gray-400" />
                    <span>Nova subpasta</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      setOpenMenuFolderId(null);
                      handleOpenMoveModal(e, folder);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  >
                    <ArrowRight size={13} className="text-gray-500 dark:text-gray-400" />
                    <span>Mover pasta</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      setOpenMenuFolderId(null);
                      handleEditFolder(e, folder);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  >
                    <Edit2 size={13} className="text-gray-500 dark:text-gray-400" />
                    <span>Renomear pasta</span>
                  </button>
                  <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
                  <button
                    type="button"
                    onClick={(e) => {
                      setOpenMenuFolderId(null);
                      handleDeleteFolder(e, folder);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                  >
                    <Trash2 size={13} className="text-rose-500" />
                    <span>Excluir pasta</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Nested Subfolders Rendered Recursively */}
        {hasSubfolders && isExpanded && (
          <div className="space-y-0.5 border-l border-gray-200 dark:border-gray-800/80 ml-3.5 pl-1 my-0.5">
            {subfolders.map((child) => renderFolderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const rootFolders = relevantFolders.filter((f) => !f.parentId);
  const activeFolderName = selectedFolderId
    ? relevantFolders.find((f) => f.id === selectedFolderId)?.name || "Pasta Selecionada"
    : "Todas as Pastas";

  return (
    <aside className={cn("w-full lg:w-64 xl:w-72 shrink-0 flex flex-col space-y-3", className)}>
      {/* Sidebar Minimalist Container */}
      <div className="bg-white dark:bg-[#1A1D27] rounded-xl border border-gray-200/80 dark:border-[#2a2d3a] p-3 shadow-2xs space-y-2">
        {/* Minimalist Header with Title like 'Folders' in reference image */}
        <div className="flex items-center justify-between px-1.5 py-1 text-gray-700 dark:text-gray-200">
          <button
            type="button"
            onClick={() => setIsMobileExpanded(!isMobileExpanded)}
            className="flex items-center gap-1.5 text-xs font-semibold tracking-tight hover:text-gray-900 dark:hover:text-white cursor-pointer lg:pointer-events-none"
          >
            <ChevronDown
              size={14}
              className={cn(
                "text-gray-400 dark:text-gray-500 transition-transform duration-200 lg:rotate-0",
                isMobileExpanded ? "rotate-0" : "-rotate-90 lg:rotate-0"
              )}
            />
            <span>Pastas de Estudo</span>
            <span className="lg:hidden text-[11px] font-normal text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md truncate max-w-[130px]">
              {activeFolderName}
            </span>
          </button>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsMobileExpanded(!isMobileExpanded)}
              className="lg:hidden px-2 py-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-md transition-colors cursor-pointer"
            >
              {isMobileExpanded ? "Recolher" : "Ver Pastas"}
            </button>
            <button
              type="button"
              onClick={handleCreateRootFolder}
              className="p-1 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              title="Criar nova pasta principal"
            >
              <Plus size={15} />
            </button>
          </div>
        </div>

        {/* Collapsible Navigation on Mobile & Tablet (always open on desktop) */}
        <div className={cn("space-y-2", isMobileExpanded ? "block" : "hidden lg:block")}>
          <nav className="space-y-0.5">
            {/* Item: Todas as Pastas (também Drop Zone para raiz) */}
            <div
              onDragEnter={handleDragEnterRootZone}
              onDragOver={handleDragOverRootZone}
              onDragLeave={handleDragLeaveRootZone}
              onDrop={handleDropOnRootZone}
              className={`rounded-lg transition-all ${
                isOverRootDropZone
                  ? "ring-1 ring-gray-400 dark:ring-gray-500 bg-gray-100/90 dark:bg-gray-800/80"
                  : ""
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  onSelectFolder(null);
                  if (typeof window !== "undefined" && window.innerWidth < 768) {
                    setIsMobileExpanded(false);
                  }
                }}
                className={`w-full flex items-center justify-between px-2.5 py-2 sm:py-1.5 rounded-lg text-[13px] font-medium transition-colors cursor-pointer min-h-[40px] sm:min-h-0 ${
                  selectedFolderId === null
                    ? "bg-gray-200/80 dark:bg-[#222634] text-gray-900 dark:text-white font-semibold"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-100/70 dark:hover:bg-gray-800/40 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Layers
                    size={15}
                    className={`shrink-0 ${
                      selectedFolderId === null
                        ? "text-gray-700 dark:text-gray-300"
                        : "text-gray-400 dark:text-gray-500"
                    }`}
                  />
                  <span className="truncate">
                    {isOverRootDropZone ? "Soltar aqui (raiz)" : "Todas as Pastas"}
                  </span>
                </div>

                <span
                  className={`text-xs tabular-nums font-normal shrink-0 ${
                    selectedFolderId === null
                      ? "text-gray-900 dark:text-gray-100 font-medium"
                      : "text-gray-400 dark:text-gray-500"
                  }`}
                >
                  {totalCount}
                </span>
              </button>
            </div>

            {/* Root Folders Tree */}
            <div className="space-y-0.5 pt-0.5">
              {rootFolders.map((folder) => renderFolderNode(folder, 0))}
            </div>
          </nav>

          {/* Minimalist Quick Add Button */}
          <div className="pt-1 border-t border-gray-100 dark:border-gray-800/60">
            <button
              type="button"
              onClick={handleCreateRootFolder}
              className="w-full flex items-center justify-center gap-1.5 py-2 sm:py-1.5 px-3 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100/60 dark:hover:bg-gray-800/40 text-xs font-medium transition-colors cursor-pointer min-h-[38px] sm:min-h-0"
            >
              <FolderPlus size={14} className="text-gray-400" />
              <span>Nova Pasta</span>
            </button>
          </div>
        </div>
      </div>

      {/* Extra Filters Slot */}
      {extraFilterSlot && (
        <div className={cn("bg-white dark:bg-[#1A1D27] rounded-xl border border-gray-200/80 dark:border-[#2a2d3a] p-3 shadow-2xs", isMobileExpanded ? "block" : "hidden lg:block")}>
          {extraFilterSlot}
        </div>
      )}

      {/* Folder Manager Modal (Criar / Editar) */}
      <FolderManagerModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setFolderToEdit(null);
          setModalParentId(null);
        }}
        defaultType={type}
        parentId={modalParentId}
        parentName={relevantFolders.find((f) => f.id === modalParentId)?.name}
        folderToEdit={folderToEdit}
        onFolderCreated={(folderId) => onSelectFolder(folderId)}
      />

      {/* Move Folder Modal (Mover para outra pasta existente ou raiz) */}
      <MoveFolderModal
        isOpen={!!moveModalFolder}
        onClose={() => setMoveModalFolder(null)}
        folder={moveModalFolder}
        folders={relevantFolders}
        type={type}
        onMove={handleMoveFolder}
      />
    </aside>
  );
}

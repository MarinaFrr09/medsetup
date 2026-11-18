"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
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
  HelpCircle,
  Brain,
  FileText,
  FileQuestion,
  Inbox,
  BookX,
} from "lucide-react";
import { useAppStore, Folder as FolderType } from "@/stores/useAppStore";
import FolderManagerModal from "./FolderManagerModal";
import MoveFolderModal, { isDescendant } from "./MoveFolderModal";
import { cleanQuestionTitle } from "@/lib/questionUtils";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

interface VerticalFolderSidebarProps {
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  type: "flashcards" | "questions" | "mindmaps" | "anotacoes" | "caderno-erros";
  extraFilterSlot?: React.ReactNode;
  className?: string;
  onSelectItem?: (itemId: string) => void;
}

export default function VerticalFolderSidebar({
  selectedFolderId,
  onSelectFolder,
  type,
  extraFilterSlot,
  className,
  onSelectItem,
}: VerticalFolderSidebarProps) {
  const {
    folders,
    flashcardDecks,
    questions,
    mindmaps,
    anotacoes,
    cadernoErrors,
    updateFolder,
    deleteFolder,
    deleteQuestion,
    clearQuestionsByFolder,
    deleteDeck,
    deleteDecks,
    deleteMindMap,
    deleteAnotacao,
    deleteCadernoError,
    moveMindMapToFolder,
    moveDeckToFolder,
    moveQuestionToFolder,
    moveCadernoErrorToFolder,
    updateAnotacao,
  } = useAppStore();

  const router = useRouter();

  const handleItemClick = (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    if (onSelectItem) {
      onSelectItem(itemId);
      return;
    }
    if (type === "mindmaps") {
      if (typeof window !== "undefined" && window.location.hostname.endsWith("github.io")) {
        router.push(`/mindmaps/default?id=${encodeURIComponent(itemId)}`);
      } else {
        router.push(`/mindmaps/${itemId}`);
      }
    }
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [folderToEdit, setFolderToEdit] = useState<FolderType | null>(null);
  const [modalParentId, setModalParentId] = useState<string | null>(null);
  const [expandedFolderIds, setExpandedFolderIds] = useState<Record<string, boolean>>({});
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);
  const [isAllFilesExpanded, setIsAllFilesExpanded] = useState(false);
  const [expandedFilesByFolder, setExpandedFilesByFolder] = useState<Record<string, boolean>>({});

  // Move Folder Modal state
  const [moveModalFolder, setMoveModalFolder] = useState<FolderType | null>(null);

  // Discrete action menu state
  const [openMenuFolderId, setOpenMenuFolderId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Clear / Delete confirmation modal
  const [clearConfirmModal, setClearConfirmModal] = useState<{
    isOpen: boolean;
    folderId: string | null;
    folderName: string;
    itemCount: number;
  }>({
    isOpen: false,
    folderId: null,
    folderName: "",
    itemCount: 0,
  });

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

  // Drag and Drop state & ref for synchronous tracking (both Folders and Items)
  const draggedFolderIdRef = useRef<string | null>(null);
  const [draggedFolderId, setDraggedFolderId] = useState<string | null>(null);
  const draggedItemIdRef = useRef<string | null>(null);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [isOverRootDropZone, setIsOverRootDropZone] = useState(false);
  const [isOverUnassignedDropZone, setIsOverUnassignedDropZone] = useState(false);

  const relevantFolders = useMemo(() => folders.filter((f) => f.type === type), [folders, type]);
  const relevantFolderIds = useMemo(() => new Set(relevantFolders.map((f) => f.id)), [relevantFolders]);

  // Total count for "Todas as Pastas"
  const totalCount =
    type === "flashcards"
      ? flashcardDecks.length
      : type === "questions"
      ? questions.length
      : type === "anotacoes"
      ? (anotacoes || []).length
      : type === "caderno-erros"
      ? (cadernoErrors || []).length
      : (mindmaps || []).length;

  const getDefaultFolderId = () => {
    if (type === "questions") return "folder-q-geral";
    if (type === "flashcards") return "folder-fc-geral";
    if (type === "mindmaps") return "folder-mm-geral";
    if (type === "caderno-erros") return "caderno-geral";
    return "anot-macetes";
  };

  const getEffectiveItemFolderId = (rawFolderId?: string) => {
    const fallback = getDefaultFolderId();
    if (!rawFolderId || rawFolderId === "folder-geral" || !relevantFolderIds.has(rawFolderId)) {
      return fallback;
    }
    return rawFolderId;
  };

  // Retrieve direct items for a folder or null (all) or unassigned
  const getFolderDirectItems = (folderId: string | null): any[] => {
    const list =
      type === "questions"
        ? questions
        : type === "flashcards"
        ? flashcardDecks
        : type === "mindmaps"
        ? mindmaps || []
        : type === "caderno-erros"
        ? cadernoErrors || []
        : anotacoes || [];

    if (folderId === null) return list;
    if (folderId === "unassigned") {
      return list.filter((item: any) => !item.folderId || !relevantFolderIds.has(item.folderId));
    }
    return list.filter((item: any) => getEffectiveItemFolderId(item.folderId) === folderId);
  };

  const unassignedItems = useMemo(() => getFolderDirectItems("unassigned"), [
    type,
    questions,
    flashcardDecks,
    mindmaps,
    anotacoes,
    cadernoErrors,
    relevantFolderIds,
  ]);
  const unassignedCount = unassignedItems.length;

  const getItemTitle = (item: any): string => {
    if (type === "questions") {
      return cleanQuestionTitle(item.text) || "Questão sem título";
    }
    if (type === "flashcards") {
      const count = item.cardCount || item.cards?.length || 0;
      return `${item.name} (${count} cards)`;
    }
    if (type === "caderno-erros") {
      return item.originalQuestion?.text ? cleanQuestionTitle(item.originalQuestion.text) : (item.userNotes || item.pontoCego || "Questão anotada");
    }
    return item.title || item.name || "Item sem título";
  };

  const getItemIcon = () => {
    if (type === "questions") return HelpCircle;
    if (type === "flashcards") return Layers;
    if (type === "mindmaps") return Brain;
    if (type === "caderno-erros") return BookX;
    return FileText;
  };

  const ItemIcon = getItemIcon();

  // Count items inside a folder and all its descendants recursively
  const getItemCount = (folderId: string) => {
    const getDescendantIds = (id: string): string[] => {
      const direct = relevantFolders.filter((f) => f.parentId === id).map((f) => f.id);
      return [id, ...direct.flatMap(getDescendantIds)];
    };
    const targetFolderIds = new Set(getDescendantIds(folderId));
    const list =
      type === "questions"
        ? questions
        : type === "flashcards"
        ? flashcardDecks
        : type === "mindmaps"
        ? mindmaps || []
        : type === "caderno-erros"
        ? cadernoErrors || []
        : anotacoes || [];

    return list.filter((item: any) =>
      targetFolderIds.has(getEffectiveItemFolderId(item.folderId))
    ).length;
  };

  const toggleExpand = (e: React.MouseEvent, folderId: string) => {
    e.stopPropagation();
    setExpandedFolderIds((prev) => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  const toggleFilesExpand = (e: React.MouseEvent, folderId: string) => {
    e.stopPropagation();
    setExpandedFilesByFolder((prev) => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  const handleDeleteItem = (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    if (type === "questions") {
      deleteQuestion(itemId);
      toast.success("Questão movida para a lixeira.");
    } else if (type === "flashcards") {
      deleteDeck(itemId);
      toast.success("Baralho movido para a lixeira.");
    } else if (type === "mindmaps") {
      deleteMindMap(itemId);
      toast.success("Mapa mental movido para a lixeira.");
    } else if (type === "anotacoes") {
      deleteAnotacao(itemId);
      toast.success("Anotação movida para a lixeira.");
    } else if (type === "caderno-erros") {
      deleteCadernoError(itemId);
      toast.success("Anotação de erro removida.");
    }
  };

  const handleConfirmClear = () => {
    const { folderId, itemCount } = clearConfirmModal;
    if (type === "questions") {
      clearQuestionsByFolder(folderId);
      toast.success(`${itemCount} questões movidas para a lixeira.`);
    } else if (type === "flashcards") {
      const items = getFolderDirectItems(folderId);
      deleteDecks(items.map((d: any) => d.id));
      toast.success(`${itemCount} baralhos movidos para a lixeira.`);
    } else if (type === "caderno-erros") {
      const items = getFolderDirectItems(folderId);
      items.forEach((it: any) => deleteCadernoError(it.id));
      toast.success(`${itemCount} questões de erro removidas.`);
    }
    setClearConfirmModal({ isOpen: false, folderId: null, folderName: "", itemCount: 0 });
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

  // Move an item (mindmap, deck, question, anotacao, caderno-erro) into a target folder
  const handleMoveItemToFolder = (itemId: string, targetFolderId: string | undefined) => {
    if (!itemId) return;
    const folderObj = targetFolderId ? folders.find((f) => f.id === targetFolderId) : undefined;
    const folderLabel = folderObj?.name || "Geral / Sem Pasta";

    if (type === "mindmaps") {
      moveMindMapToFolder(itemId, targetFolderId);
      toast.success(`Mapa mental movido para "${folderLabel}"!`, { icon: "🧠" });
    } else if (type === "flashcards") {
      moveDeckToFolder(itemId, targetFolderId);
      toast.success(`Baralho movido para "${folderLabel}"!`, { icon: "🗂️" });
    } else if (type === "questions") {
      moveQuestionToFolder(itemId, targetFolderId);
      toast.success(`Questão movida para "${folderLabel}"!`, { icon: "❓" });
    } else if (type === "anotacoes") {
      updateAnotacao(itemId, { folderId: targetFolderId || "anot-macetes" });
      toast.success(`Anotação movida para "${folderLabel}"!`, { icon: "📝" });
    } else if (type === "caderno-erros") {
      moveCadernoErrorToFolder(itemId, targetFolderId);
      toast.success(`Item movido para "${folderLabel}"!`, { icon: "📕" });
    }

    if (targetFolderId) {
      setExpandedFilesByFolder((prev) => ({ ...prev, [targetFolderId]: true }));
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, folder: FolderType) => {
    e.stopPropagation();
    draggedFolderIdRef.current = folder.id;
    setDraggedFolderId(folder.id);
    draggedItemIdRef.current = null;
    setDraggedItemId(null);
    e.dataTransfer.setData("text/plain", folder.id);
    e.dataTransfer.setData("application/studyflow-folder-id", folder.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleItemDragStart = (e: React.DragEvent, itemId: string) => {
    e.stopPropagation();
    draggedItemIdRef.current = itemId;
    setDraggedItemId(itemId);
    draggedFolderIdRef.current = null;
    setDraggedFolderId(null);
    e.dataTransfer.setData("text/plain", itemId);
    e.dataTransfer.setData("application/studyflow-item-id", itemId);
    e.dataTransfer.setData("application/studyflow-item-type", type);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    draggedFolderIdRef.current = null;
    setDraggedFolderId(null);
    draggedItemIdRef.current = null;
    setDraggedItemId(null);
    setDragOverFolderId(null);
    setIsOverRootDropZone(false);
    setIsOverUnassignedDropZone(false);
  };

  const isDraggingItemEvent = (e: React.DragEvent): boolean => {
    return Boolean(
      draggedItemIdRef.current ||
        draggedItemId ||
        Array.from(e.dataTransfer?.types || []).includes("application/studyflow-item-id")
    );
  };

  const handleDragEnterFolder = (e: React.DragEvent, targetFolder: FolderType) => {
    if (isDraggingItemEvent(e)) {
      e.preventDefault();
      e.stopPropagation();
      setDragOverFolderId(targetFolder.id);
      return;
    }
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
    if (isDraggingItemEvent(e)) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "move";
      if (dragOverFolderId !== targetFolder.id) {
        setDragOverFolderId(targetFolder.id);
      }
      return;
    }
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

    const droppedItemId =
      e.dataTransfer.getData("application/studyflow-item-id") ||
      draggedItemIdRef.current ||
      draggedItemId;

    if (droppedItemId) {
      handleMoveItemToFolder(droppedItemId, targetFolder.id);
      handleDragEnd();
      return;
    }

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
    handleDragEnd();
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

    if (sourceId && !draggedItemIdRef.current) {
      handleMoveFolder(sourceId, null);
    }
    handleDragEnd();
  };

  // Recursive tree rendering function - Minimalist & Sleek with expandable files preview
  const renderFolderNode = (folder: FolderType, depth: number = 0) => {
    const isSelected = selectedFolderId === folder.id;
    const count = getItemCount(folder.id);
    const folderColor = folder.color || "#64748B";
    const subfolders = relevantFolders.filter((f) => f.parentId === folder.id);
    const hasSubfolders = subfolders.length > 0;
    const isExpanded = expandedFolderIds[folder.id] ?? true;
    const isDragTarget = dragOverFolderId === folder.id;
    const isBeingDragged = draggedFolderId === folder.id;
    const directItems = getFolderDirectItems(folder.id);
    const hasDirectItems = directItems.length > 0;
    const areFilesExpanded = expandedFilesByFolder[folder.id] ?? false;

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
          <div className={`flex items-center gap-1.5 min-w-0 flex-1 ${draggedFolderId || draggedItemId ? "pointer-events-none" : ""}`}>
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
                title={isExpanded ? "Recolher subpastas" : "Expandir subpastas"}
              >
                {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
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

            {/* Direct expand files toggle button if has direct items */}
            {hasDirectItems && (
              <button
                type="button"
                onClick={(e) => toggleFilesExpand(e, folder.id)}
                className={cn(
                  "p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer",
                  areFilesExpanded ? "text-blue-600 dark:text-blue-400" : "opacity-0 group-hover:opacity-100"
                )}
                title={areFilesExpanded ? "Ocultar arquivos na coluna" : "Ver arquivos na coluna"}
              >
                {areFilesExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </button>
            )}

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
                  className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-[#2a2d3a] rounded-xl shadow-xl py-1 z-50 text-xs font-medium animate-in fade-in zoom-in-95 duration-100"
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

                  {directItems.length > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        setOpenMenuFolderId(null);
                        setClearConfirmModal({
                          isOpen: true,
                          folderId: folder.id,
                          folderName: `Pasta "${folder.name}"`,
                          itemCount: directItems.length,
                        });
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors cursor-pointer"
                    >
                      <Trash2 size={13} className="text-amber-500" />
                      <span>Esvaziar ({directItems.length} itens)</span>
                    </button>
                  )}

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

        {/* Visualização de Arquivos na Coluna (Expandable Items List) */}
        {hasDirectItems && areFilesExpanded && (
          <div
            style={{ paddingLeft: `${16 + depth * 14}px` }}
            className="border-l border-gray-200 dark:border-gray-800/80 ml-3.5 pl-1 my-0.5 space-y-0.5 max-h-56 overflow-y-auto pr-1"
          >
            <div className="flex items-center justify-between text-[10px] text-gray-400 dark:text-gray-500 px-1 py-0.5">
              <span>Arquivos ({directItems.length})</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setClearConfirmModal({
                    isOpen: true,
                    folderId: folder.id,
                    folderName: `Pasta "${folder.name}"`,
                    itemCount: directItems.length,
                  });
                }}
                className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                title="Excluir todos os arquivos desta pasta"
              >
                Esvaziar
              </button>
            </div>
            {directItems.map((item: any) => {
              const itemTitle = getItemTitle(item);
              const isItemDragged = draggedItemId === item.id;
              return (
                <div
                  key={item.id}
                  draggable={true}
                  onDragStart={(e) => handleItemDragStart(e, item.id)}
                  onDragEnd={handleDragEnd}
                  onClick={(e) => handleItemClick(e, item.id)}
                  className={cn(
                    "group/file flex items-center justify-between px-2 py-1 rounded-md text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100/90 dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-white transition-colors cursor-grab active:cursor-grabbing select-none",
                    isItemDragged && "opacity-40 border border-dashed border-purple-400"
                  )}
                  title={`Arraste para mover para outra pasta ou clique para abrir "${itemTitle}"`}
                >
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <GripVertical size={11} className="text-gray-300 dark:text-gray-600 opacity-0 group-hover/file:opacity-100 transition-opacity shrink-0 -ml-1" />
                    <ItemIcon size={12} className="text-gray-400 shrink-0 group-hover/file:text-blue-500 transition-colors" />
                    <span className="truncate text-[12px]">{itemTitle}</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteItem(e, item.id)}
                    className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 opacity-70 sm:opacity-0 sm:group-hover/file:opacity-100 transition-opacity cursor-pointer shrink-0 ml-1"
                    title="Excluir este arquivo"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

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
    ? selectedFolderId === "unassigned"
      ? "Sem Pasta / Geral"
      : relevantFolders.find((f) => f.id === selectedFolderId)?.name || "Pasta Selecionada"
    : "Todas as Pastas";

  const allItems = getFolderDirectItems(null);

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
              className={`group/root relative rounded-lg transition-all ${
                isOverRootDropZone
                  ? "ring-1 ring-gray-400 dark:ring-gray-500 bg-gray-100/90 dark:bg-gray-800/80"
                  : ""
              }`}
            >
              <div
                onClick={() => {
                  onSelectFolder(null);
                  if (typeof window !== "undefined" && window.innerWidth < 768) {
                    setIsMobileExpanded(false);
                  }
                }}
                className={`w-full flex items-center justify-between px-2.5 py-2 sm:py-1.5 rounded-lg text-[13px] font-medium transition-colors cursor-pointer min-h-[40px] sm:min-h-0 select-none ${
                  selectedFolderId === null
                    ? "bg-gray-200/80 dark:bg-[#222634] text-gray-900 dark:text-white font-semibold"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-100/70 dark:hover:bg-gray-800/40 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
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

                <div className="flex items-center gap-1 shrink-0">
                  <span
                    className={`text-xs tabular-nums font-normal ${
                      selectedFolderId === null
                        ? "text-gray-900 dark:text-gray-100 font-medium"
                        : "text-gray-400 dark:text-gray-500"
                    }`}
                  >
                    {totalCount}
                  </span>

                  {/* Toggle expand all items */}
                  {totalCount > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsAllFilesExpanded(!isAllFilesExpanded);
                      }}
                      className={cn(
                        "p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer",
                        isAllFilesExpanded ? "text-blue-600 dark:text-blue-400" : "opacity-0 group-hover/root:opacity-100"
                      )}
                      title={isAllFilesExpanded ? "Ocultar arquivos na coluna" : "Ver todos os arquivos na coluna"}
                    >
                      {isAllFilesExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    </button>
                  )}

                  {/* 3-dots action menu for Todas as Pastas */}
                  {totalCount > 0 && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuFolderId((prev) => (prev === "all-folders" ? null : "all-folders"));
                        }}
                        className={cn(
                          "p-1 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/60 dark:hover:bg-gray-700/60 transition-opacity cursor-pointer",
                          openMenuFolderId === "all-folders"
                            ? "opacity-100 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                            : "opacity-0 group-hover/root:opacity-100 focus:opacity-100"
                        )}
                        title="Opções gerais"
                      >
                        <MoreVertical size={13} />
                      </button>

                      {openMenuFolderId === "all-folders" && (
                        <div
                          ref={menuRef}
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-[#2a2d3a] rounded-xl shadow-xl py-1 z-50 text-xs font-medium animate-in fade-in zoom-in-95 duration-100"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuFolderId(null);
                              setIsAllFilesExpanded(!isAllFilesExpanded);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                          >
                            <FileQuestion size={13} className="text-gray-500 dark:text-gray-400" />
                            <span>{isAllFilesExpanded ? "Ocultar arquivos" : "Ver arquivos na coluna"}</span>
                          </button>
                          <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuFolderId(null);
                              setClearConfirmModal({
                                isOpen: true,
                                folderId: null,
                                folderName: "Todas as Pastas",
                                itemCount: totalCount,
                              });
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                          >
                            <Trash2 size={13} className="text-rose-500" />
                            <span>Excluir todos ({totalCount})</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* All files expanded list */}
              {totalCount > 0 && isAllFilesExpanded && (
                <div className="border-l border-gray-200 dark:border-gray-800/80 ml-4 pl-1.5 my-1 space-y-0.5 max-h-60 overflow-y-auto pr-1">
                  <div className="flex items-center justify-between text-[10px] text-gray-400 dark:text-gray-500 px-1 py-0.5">
                    <span>Todos os Arquivos ({totalCount})</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setClearConfirmModal({
                          isOpen: true,
                          folderId: null,
                          folderName: "Todas as Pastas",
                          itemCount: totalCount,
                        });
                      }}
                      className="text-red-500 hover:text-red-600 font-semibold transition-colors cursor-pointer"
                      title="Excluir todos os arquivos"
                    >
                      Excluir Todos
                    </button>
                  </div>
                  {allItems.map((item: any) => {
                    const itemTitle = getItemTitle(item);
                    const isItemDragged = draggedItemId === item.id;
                    return (
                      <div
                        key={item.id}
                        draggable={true}
                        onDragStart={(e) => handleItemDragStart(e, item.id)}
                        onDragEnd={handleDragEnd}
                        onClick={(e) => handleItemClick(e, item.id)}
                        className={cn(
                          "group/file flex items-center justify-between px-2 py-1 rounded-md text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100/90 dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-white transition-colors cursor-grab active:cursor-grabbing select-none",
                          isItemDragged && "opacity-40 border border-dashed border-purple-400"
                        )}
                        title={`Arraste para mover para outra pasta ou clique para abrir "${itemTitle}"`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <GripVertical size={11} className="text-gray-300 dark:text-gray-600 opacity-0 group-hover/file:opacity-100 transition-opacity shrink-0 -ml-1" />
                          <ItemIcon size={12} className="text-gray-400 shrink-0 group-hover/file:text-blue-500 transition-colors" />
                          <span className="truncate text-[12px]">{itemTitle}</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteItem(e, item.id)}
                          className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 opacity-70 sm:opacity-0 sm:group-hover/file:opacity-100 transition-opacity cursor-pointer shrink-0 ml-1"
                          title="Excluir este arquivo"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Item: Sem Pasta / Geral (Mostrado se houver arquivos órfãos sem pasta ou durante arraste de item) */}
            {(unassignedCount > 0 || draggedItemId !== null) && (
              <div
                onDragEnter={(e) => {
                  if (isDraggingItemEvent(e)) {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsOverUnassignedDropZone(true);
                  }
                }}
                onDragOver={(e) => {
                  if (isDraggingItemEvent(e)) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.dataTransfer.dropEffect = "move";
                    if (!isOverUnassignedDropZone) setIsOverUnassignedDropZone(true);
                  }
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setIsOverUnassignedDropZone(false);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const droppedItemId =
                    e.dataTransfer.getData("application/studyflow-item-id") ||
                    draggedItemIdRef.current ||
                    draggedItemId;
                  if (droppedItemId) {
                    handleMoveItemToFolder(droppedItemId, undefined);
                  }
                  handleDragEnd();
                }}
                className={cn(
                  "group/unassigned relative rounded-lg transition-all",
                  isOverUnassignedDropZone && "ring-1 ring-amber-400 bg-amber-50/60 dark:bg-amber-950/30"
                )}
              >
                <div
                  onClick={() => onSelectFolder("unassigned")}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[13px] font-medium transition-colors cursor-pointer select-none ${
                    selectedFolderId === "unassigned"
                      ? "bg-gray-200/80 dark:bg-[#222634] text-gray-900 dark:text-white font-semibold"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-100/70 dark:hover:bg-gray-800/40 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <Inbox size={15} className="text-amber-500 shrink-0" />
                    <span className="truncate text-[13px]">Geral / Sem Pasta</span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-xs tabular-nums font-normal text-amber-600 dark:text-amber-400 font-medium">
                      {unassignedCount}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setClearConfirmModal({
                          isOpen: true,
                          folderId: "unassigned",
                          folderName: "Geral / Sem Pasta",
                          itemCount: unassignedCount,
                        });
                      }}
                      className="p-1 rounded text-gray-400 hover:text-red-500 opacity-70 sm:opacity-0 sm:group-hover/unassigned:opacity-100 transition-opacity cursor-pointer"
                      title="Excluir arquivos sem pasta"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {/* Unassigned files list if selected */}
                {selectedFolderId === "unassigned" && (
                  <div className="border-l border-amber-300 dark:border-amber-700/60 ml-4 pl-1.5 my-1 space-y-0.5 max-h-56 overflow-y-auto pr-1">
                    {unassignedItems.map((item: any) => {
                      const itemTitle = getItemTitle(item);
                      const isItemDragged = draggedItemId === item.id;
                      return (
                        <div
                          key={item.id}
                          draggable={true}
                          onDragStart={(e) => handleItemDragStart(e, item.id)}
                          onDragEnd={handleDragEnd}
                          onClick={(e) => handleItemClick(e, item.id)}
                          className={cn(
                            "group/file flex items-center justify-between px-2 py-1 rounded-md text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100/90 dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-white transition-colors cursor-grab active:cursor-grabbing select-none",
                            isItemDragged && "opacity-40 border border-dashed border-amber-400"
                          )}
                          title={`Arraste para mover para outra pasta ou clique para abrir "${itemTitle}"`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <GripVertical size={11} className="text-gray-300 dark:text-gray-600 opacity-0 group-hover/file:opacity-100 transition-opacity shrink-0 -ml-1" />
                            <ItemIcon size={12} className="text-amber-500 shrink-0" />
                            <span className="truncate text-[12px]">{itemTitle}</span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteItem(e, item.id)}
                            className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 opacity-70 sm:opacity-0 sm:group-hover/file:opacity-100 transition-opacity cursor-pointer shrink-0 ml-1"
                            title="Excluir este arquivo"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

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

      {/* Clear / Delete All Confirmation Modal */}
      {clearConfirmModal.isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setClearConfirmModal({ isOpen: false, folderId: null, folderName: "", itemCount: 0 })}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#1A1D27] rounded-2xl border border-gray-200 dark:border-[#2a2d3a] p-6 max-w-sm w-full shadow-2xl space-y-4"
          >
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40">
                <Trash2 size={22} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-base">
                  Excluir {clearConfirmModal.itemCount} {type === "questions" ? "questões" : type === "flashcards" ? "baralhos" : "itens"}?
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {clearConfirmModal.folderName}
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              {clearConfirmModal.itemCount === 1
                ? "Este arquivo será movido para a lixeira."
                : `Todos os ${clearConfirmModal.itemCount} arquivos serão movidos para a lixeira e poderão ser recuperados na aba Lixeira.`}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setClearConfirmModal({ isOpen: false, folderId: null, folderName: "", itemCount: 0 })}
                className="px-3.5 py-2 text-xs font-semibold rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmClear}
                className="px-3.5 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer shadow-xs"
              >
                Sim, Mover para Lixeira
              </button>
            </div>
          </div>
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

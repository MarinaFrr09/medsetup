"use client";

import { useState, useRef } from "react";
import { Folder, FolderPlus, Trash2, ArrowRight, Edit2, ChevronRight, CornerDownRight, GripVertical } from "lucide-react";
import { useAppStore, Folder as FolderType } from "@/stores/useAppStore";
import FolderManagerModal from "./FolderManagerModal";
import { isDescendant } from "./MoveFolderModal";
import toast from "react-hot-toast";

interface FolderGridProps {
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  type: "flashcards" | "questions";
}

export default function FolderGrid({ selectedFolderId, onSelectFolder, type }: FolderGridProps) {
  const { folders, flashcardDecks, questions, updateFolder, deleteFolder } = useAppStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [folderToEdit, setFolderToEdit] = useState<FolderType | null>(null);
  const [modalParentId, setModalParentId] = useState<string | null>(null);

  // Drag and drop state & ref
  const draggedFolderIdRef = useRef<string | null>(null);
  const [draggedFolderId, setDraggedFolderId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

  const relevantFolders = folders.filter((f) => f.type === "both" || f.type === type);

  // Count items recursively or directly in folder
  const getItemCount = (folderId: string) => {
    // Find all subfolder IDs under this folder
    const childIds = relevantFolders.filter((f) => f.parentId === folderId).map((f) => f.id);
    const targetFolderIds = new Set([folderId, ...childIds]);

    if (type === "flashcards") {
      return flashcardDecks.filter((d) => targetFolderIds.has(d.folderId || "folder-geral")).length;
    } else {
      return questions.filter((q) => targetFolderIds.has(q.folderId || "folder-geral")).length;
    }
  };

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
      const parentName = folders.find((f) => f.id === targetParentId)?.name || "outra pasta";
      toast.success(`Pasta "${folder.name}" agora é subpasta de "${parentName}"!`, { icon: "📁" });
    } else {
      toast.success(`Pasta "${folder.name}" movida para o nível principal!`, { icon: "📂" });
    }
  };

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

  const handleCreateSubfolder = (parentId: string) => {
    setFolderToEdit(null);
    setModalParentId(parentId);
    setIsModalOpen(true);
  };

  const handleCreateRootFolder = () => {
    setFolderToEdit(null);
    setModalParentId(null);
    setIsModalOpen(true);
  };

  // Build breadcrumb chain from root to active folder
  const getBreadcrumbs = (currentId: string | null): FolderType[] => {
    if (!currentId) return [];
    const chain: FolderType[] = [];
    let curr = relevantFolders.find((f) => f.id === currentId);
    while (curr) {
      chain.unshift(curr);
      if (curr.parentId) {
        curr = relevantFolders.find((f) => f.id === curr?.parentId);
      } else {
        break;
      }
    }
    return chain;
  };

  const breadcrumbs = getBreadcrumbs(selectedFolderId);
  const activeFolder = relevantFolders.find((f) => f.id === selectedFolderId);

  // Subfolders of currently opened folder
  const subfolders = selectedFolderId
    ? relevantFolders.filter((f) => f.parentId === selectedFolderId)
    : [];

  // Root folders (no parent or parent not found)
  const rootFolders = relevantFolders.filter((f) => !f.parentId);

  // If inside a folder
  if (selectedFolderId !== null && activeFolder) {
    const count = getItemCount(activeFolder.id);
    const folderColor = activeFolder.color || "#2563EB";

    return (
      <div className="space-y-4">
        {/* Active Folder Banner with Breadcrumb & Rename Action */}
        <div className="bg-white dark:bg-[#1A1D27] rounded-2xl border border-gray-200 dark:border-[#2a2d3a] p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md flex-shrink-0"
              style={{ backgroundColor: folderColor }}
            >
              <Folder className="w-6 h-6" />
            </div>
            <div>
              {/* Interactive Breadcrumb Navigation */}
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-1 flex-wrap">
                <button
                  type="button"
                  onClick={() => onSelectFolder(null)}
                  className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline font-medium cursor-pointer"
                >
                  Todas as Pastas
                </button>
                {breadcrumbs.map((crumb, idx) => {
                  const isLast = idx === breadcrumbs.length - 1;
                  return (
                    <div key={crumb.id} className="flex items-center gap-1.5">
                      <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                      {isLast ? (
                        <span className="text-gray-900 dark:text-white font-semibold">
                          {crumb.name}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onSelectFolder(crumb.id)}
                          className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline font-medium cursor-pointer"
                        >
                          {crumb.name}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {activeFolder.name}
                </h2>
                <button
                  type="button"
                  onClick={(e) => handleEditFolder(e, activeFolder)}
                  className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
                  title="Renomear esta pasta"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {count} {type === "flashcards" ? (count === 1 ? "baralho salvo" : "baralhos salvos") : (count === 1 ? "questão salva" : "questões salvas")} • {subfolders.length} {subfolders.length === 1 ? "subpasta" : "subpastas"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => handleCreateSubfolder(activeFolder.id)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-purple-50 text-purple-600 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-400 dark:hover:bg-purple-900/60 transition-colors cursor-pointer shadow-2xs"
            >
              <FolderPlus className="w-4 h-4" />
              <span>Nova Subpasta</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectFolder(activeFolder.parentId || null)}
              className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border border-gray-200 dark:border-[#2a2d3a] hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
            >
              <span>{activeFolder.parentId ? "Voltar ao Pai" : "Ver Todas"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Subfolders Grid if any exist */}
        {subfolders.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider px-1">
              <CornerDownRight className="w-3.5 h-3.5 text-blue-500" />
              <span>Subpastas de {activeFolder.name}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {subfolders.map((sub) => {
                const subCount = getItemCount(sub.id);
                const subColor = sub.color || "#2563EB";

                return (
                  <div
                    key={sub.id}
                    onClick={() => onSelectFolder(sub.id)}
                    className="group bg-white dark:bg-[#1A1D27] rounded-xl border border-gray-200 dark:border-[#2a2d3a] p-3.5 shadow-2xs hover:shadow-md hover:border-blue-500 dark:hover:border-blue-500 transition-all cursor-pointer relative flex items-center justify-between select-none [&_*]:select-none"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-xs shrink-0"
                        style={{ backgroundColor: subColor }}
                      >
                        <Folder className="w-4.5 h-4.5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-xs sm:text-sm text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                          {sub.name}
                        </h4>
                        <span className="text-[11px] text-gray-500 dark:text-gray-400">
                          {subCount} {type === "flashcards" ? "cards" : "questões"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => handleEditFolder(e, sub)}
                        className="p-1 text-gray-400 hover:text-blue-600 rounded-md"
                        title="Renomear subpasta"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteFolder(e, sub)}
                        className="p-1 text-gray-400 hover:text-red-500 rounded-md"
                        title="Excluir subpasta"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={() => handleCreateSubfolder(activeFolder.id)}
                className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-gray-300 dark:border-[#2a2d3a] hover:border-blue-500 dark:hover:border-blue-500 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
              >
                <FolderPlus className="w-4 h-4" />
                <span>+ Adicionar Subpasta</span>
              </button>
            </div>
          </div>
        )}

        <FolderManagerModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setFolderToEdit(null);
            setModalParentId(null);
          }}
          defaultType={type}
          parentId={modalParentId}
          parentName={folders.find((f) => f.id === modalParentId)?.name}
          folderToEdit={folderToEdit}
          onFolderCreated={(folderId) => onSelectFolder(folderId)}
        />
      </div>
    );
  }

  // Root view: Big visual folder cards with Rename and Subfolder support
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Folder className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Suas Pastas de Estudo
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Clique em uma pasta para abrir seu conteúdo, renomear ou criar subpastas
          </p>
        </div>

        <button
          type="button"
          onClick={handleCreateRootFolder}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-400 dark:hover:bg-blue-900/60 transition-colors cursor-pointer shadow-2xs"
        >
          <FolderPlus className="w-4 h-4" />
          <span>Nova Pasta</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {/* User Folders */}
        {rootFolders.map((folder) => {
          const count = getItemCount(folder.id);
          const folderColor = folder.color || "#2563EB";
          const subCount = relevantFolders.filter((f) => f.parentId === folder.id).length;
          const isDragTarget = dragOverFolderId === folder.id;
          const isBeingDragged = draggedFolderId === folder.id;

          return (
            <div
              key={folder.id}
              draggable={true}
              onDragStart={(e) => handleDragStart(e, folder)}
              onDragEnd={handleDragEnd}
              onDragEnter={(e) => handleDragEnterFolder(e, folder)}
              onDragOver={(e) => handleDragOverFolder(e, folder)}
              onDragLeave={(e) => handleDragLeaveFolder(e, folder)}
              onDrop={(e) => handleDropOnFolder(e, folder)}
              onClick={() => onSelectFolder(folder.id)}
              className={`group bg-white dark:bg-[#1A1D27] rounded-2xl border p-5 shadow-xs transition-all cursor-grab active:cursor-grabbing relative flex flex-col justify-between select-none ${
                isBeingDragged
                  ? "opacity-30 border-dashed border-purple-400 scale-[0.98]"
                  : isDragTarget
                  ? "ring-2 ring-purple-500 bg-purple-50/80 dark:bg-purple-950/60 border-purple-500 shadow-md scale-[1.02]"
                  : "border-gray-200 dark:border-[#2a2d3a] hover:shadow-md hover:border-blue-500 dark:hover:border-blue-500"
              }`}
              title="Arraste para soltar dentro de outra pasta (vira subpasta)"
            >
              <div className={`flex items-start justify-between gap-3 ${draggedFolderId ? "pointer-events-none" : ""}`}>
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-110"
                  style={{ backgroundColor: folderColor }}
                >
                  <Folder className="w-6 h-6" />
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all pointer-events-auto">
                  <button
                    type="button"
                    onClick={(e) => handleEditFolder(e, folder)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg cursor-pointer transition-colors"
                    title="Renomear pasta"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  {folder.id !== "folder-geral" && (
                    <button
                      type="button"
                      onClick={(e) => handleDeleteFolder(e, folder)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg cursor-pointer transition-colors"
                      title="Excluir pasta"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className={`mt-4 ${draggedFolderId ? "pointer-events-none" : ""}`}>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold text-base text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                    {folder.name}
                  </h3>
                  {isDragTarget && (
                    <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 bg-purple-200/90 dark:bg-purple-900/90 px-1.5 py-0.5 rounded-md animate-pulse shrink-0">
                      Soltar como subpasta
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>
                    {count} {type === "flashcards" ? (count === 1 ? "baralho" : "baralhos") : (count === 1 ? "questão" : "questões")}
                    {subCount > 0 ? ` • ${subCount} sub` : ""}
                  </span>
                  <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium group-hover:translate-x-1 transition-transform">
                    Abrir <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Create New Folder Card (Dashed) */}
        <button
          type="button"
          onClick={handleCreateRootFolder}
          className="group flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-gray-300 dark:border-[#2a2d3a] hover:border-blue-500 dark:hover:border-blue-500 bg-gray-50/50 dark:bg-[#1A1D27]/30 hover:bg-blue-50/20 dark:hover:bg-blue-950/10 transition-all cursor-pointer text-center min-h-[140px]"
        >
          <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-400 group-hover:text-blue-600 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 flex items-center justify-center mb-2 transition-colors">
            <FolderPlus className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400">
            Criar Nova Pasta
          </span>
          <span className="text-[10px] text-gray-400 mt-0.5">
            Adicione uma nova matéria
          </span>
        </button>
      </div>

      <FolderManagerModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setFolderToEdit(null);
          setModalParentId(null);
        }}
        defaultType={type}
        parentId={modalParentId}
        parentName={folders.find((f) => f.id === modalParentId)?.name}
        folderToEdit={folderToEdit}
        onFolderCreated={(folderId) => onSelectFolder(folderId)}
      />
    </div>
  );
}

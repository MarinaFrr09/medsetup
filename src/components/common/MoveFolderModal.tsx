"use client";

import { useState } from "react";
import { Folder, X, CornerDownRight, Check, Search, FolderTree, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Folder as FolderType } from "@/stores/useAppStore";

interface MoveFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  folder: FolderType | null;
  folders: FolderType[];
  type: "flashcards" | "questions" | "both" | "mindmaps" | "anotacoes";
  onMove: (folderId: string, targetParentId: string | null) => void;
}

export function isDescendant(
  ancestorId: string,
  potentialChildId: string,
  allFolders: FolderType[]
): boolean {
  if (ancestorId === potentialChildId) return true;
  let curr = allFolders.find((f) => f.id === potentialChildId);
  while (curr && curr.parentId) {
    if (curr.parentId === ancestorId) return true;
    curr = allFolders.find((f) => f.id === curr?.parentId);
  }
  return false;
}

export default function MoveFolderModal({
  isOpen,
  onClose,
  folder,
  folders,
  type,
  onMove,
}: MoveFolderModalProps) {
  const [selectedParentId, setSelectedParentId] = useState<string | null>(
    folder?.parentId || null
  );
  const [search, setSearch] = useState("");

  if (!isOpen || !folder) return null;

  const relevantFolders = folders.filter((f) => f.type === type);

  // Available destination folders: exclude self and any descendant of self
  const availableFolders = relevantFolders.filter(
    (f) => f.id !== folder.id && !isDescendant(folder.id, f.id, relevantFolders)
  );

  // Filter by search query if any
  const filteredFolders = search.trim()
    ? availableFolders.filter((f) =>
        f.name.toLowerCase().includes(search.toLowerCase().trim())
      )
    : availableFolders;

  const handleConfirm = () => {
    onMove(folder.id, selectedParentId);
    onClose();
  };

  const isCurrentParent = selectedParentId === (folder.parentId || null);

  // Build tree for hierarchical display
  const getDepth = (fId: string): number => {
    let depth = 0;
    let curr = relevantFolders.find((f) => f.id === fId);
    while (curr && curr.parentId) {
      depth++;
      curr = relevantFolders.find((f) => f.id === curr?.parentId);
    }
    return depth;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-[#1A1D27] dark:border dark:border-[#2a2d3a] overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#2a2d3a] px-6 py-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0"
              style={{ backgroundColor: folder.color || "#2563EB" }}
            >
              <Folder className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate">
                Mover &ldquo;{folder.name}&rdquo;
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Selecione a pasta de destino para torná-la uma subpasta
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search Input */}
        {availableFolders.length > 5 && (
          <div className="px-6 pt-4 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar pasta de destino..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-gray-200 dark:border-[#2a2d3a] bg-gray-50 dark:bg-[#0F1117] text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {/* Destination List */}
        <div className="flex-1 overflow-y-auto px-6 py-3 space-y-1.5 min-h-[180px]">
          {/* Option: Nível Principal (Raiz) */}
          <button
            type="button"
            onClick={() => setSelectedParentId(null)}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border text-left ${
              selectedParentId === null
                ? "bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 shadow-2xs font-bold"
                : "bg-gray-50 dark:bg-[#0F1117] border-gray-200 dark:border-[#2a2d3a] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0" />
              <div className="min-w-0">
                <span className="truncate block font-bold">Nível Principal (Raiz)</span>
                <span className="text-[10px] text-gray-400 block font-normal">
                  Pasta mãe independente (sem pasta acima dela)
                </span>
              </div>
            </div>
            {selectedParentId === null && <Check size={16} className="text-blue-600 dark:text-blue-400 shrink-0" />}
          </button>

          <div className="pt-2 pb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 px-1">
              Ou Mover para Dentro de Outra Pasta (Subpasta):
            </span>
          </div>

          {filteredFolders.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4 italic">
              Nenhuma outra pasta disponível para destino.
            </p>
          ) : (
            filteredFolders.map((target) => {
              const isSelected = selectedParentId === target.id;
              const depth = getDepth(target.id);
              const isCurrent = (folder.parentId || null) === target.id;

              return (
                <button
                  key={target.id}
                  type="button"
                  onClick={() => setSelectedParentId(target.id)}
                  style={{ paddingLeft: `${14 + depth * 14}px` }}
                  className={`w-full flex items-center justify-between pr-3.5 py-2.5 rounded-xl text-xs transition-all cursor-pointer border text-left ${
                    isSelected
                      ? "bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 shadow-2xs font-bold"
                      : "bg-gray-50 dark:bg-[#0F1117] border-gray-200 dark:border-[#2a2d3a] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {depth > 0 && <CornerDownRight size={12} className="text-gray-400 shrink-0" />}
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                      style={{ backgroundColor: target.color || "#2563EB" }}
                    />
                    <span className="truncate">{target.name}</span>
                    {isCurrent && (
                      <span className="text-[10px] font-medium text-gray-400 bg-gray-200 dark:bg-gray-700 px-1.5 py-0.2 rounded-md shrink-0">
                        atual
                      </span>
                    )}
                  </div>
                  {isSelected && <Check size={16} className="text-blue-600 dark:text-blue-400 shrink-0 ml-2" />}
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 border-t border-gray-100 dark:border-[#2a2d3a] px-6 py-4 bg-gray-50/50 dark:bg-[#12151e]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isCurrentParent}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors shadow-sm shadow-blue-500/20 cursor-pointer"
          >
            <ArrowRight size={13} />
            <span>Mover Pasta</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}

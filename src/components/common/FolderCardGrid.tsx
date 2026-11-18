"use client";

import React, { useState } from "react";
import { Folder as FolderIcon, FolderPlus, ArrowRight, Plus } from "lucide-react";
import { useAppStore, Folder as FolderType } from "@/stores/useAppStore";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

export interface FolderPreviewItem {
  id: string;
  title: string;
  subtitle?: string;
  isPinned?: boolean;
}

export interface FolderCardGridProps {
  title: string;
  subtitle: string;
  folders: FolderType[];
  getItemCount: (folderId: string) => number;
  getItemPreviews?: (folderId: string) => any;
  itemLabel: {
    singular: string;
    plural: string;
  };
  onSelectFolder: (folderId: string) => void;
  onCreateFolder: () => void;
  onViewAll?: () => void;
  viewAllLabel?: string;
  accentColor?: string; // default amber
  onDropItem?: (itemId: string, targetFolderId: string) => void;
}

export default function FolderCardGrid({
  title,
  subtitle,
  folders,
  getItemCount,
  itemLabel,
  onSelectFolder,
  onCreateFolder,
  onViewAll,
  viewAllLabel = "Ver Todos em Lista",
  accentColor = "amber",
  onDropItem,
}: FolderCardGridProps) {
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const {
    moveMindMapToFolder,
    moveDeckToFolder,
    moveQuestionToFolder,
    moveCadernoErrorToFolder,
    updateAnotacao,
  } = useAppStore();

  const handleDropOnCard = (e: React.DragEvent, folder: FolderType) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderId(null);

    const itemId = e.dataTransfer.getData("application/studyflow-item-id");
    const itemType = e.dataTransfer.getData("application/studyflow-item-type") || folder.type;
    if (!itemId) return;

    if (onDropItem) {
      onDropItem(itemId, folder.id);
      return;
    }

    if (itemType === "mindmaps") {
      moveMindMapToFolder(itemId, folder.id);
      toast.success(`Mapa mental movido para a pasta "${folder.name}"!`, { icon: "🧠" });
    } else if (itemType === "flashcards") {
      moveDeckToFolder(itemId, folder.id);
      toast.success(`Baralho movido para a pasta "${folder.name}"!`, { icon: "🗂️" });
    } else if (itemType === "questions") {
      moveQuestionToFolder(itemId, folder.id);
      toast.success(`Questão movida para a pasta "${folder.name}"!`, { icon: "❓" });
    } else if (itemType === "anotacoes") {
      updateAnotacao(itemId, { folderId: folder.id });
      toast.success(`Anotação movida para a pasta "${folder.name}"!`, { icon: "📝" });
    } else if (itemType === "caderno-erros") {
      moveCadernoErrorToFolder(itemId, folder.id);
      toast.success(`Item movido para a pasta "${folder.name}"!`, { icon: "📕" });
    }
  };
  const rootFolders = folders.filter(
    (f) => !f.parentId || !folders.some((parent) => parent.id === f.parentId)
  );

  return (
    <div className="space-y-5 w-full">
      {/* Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#1A1D27] p-4 rounded-2xl border border-gray-200 dark:border-[#2a2d3a] shadow-xs">
        <div>
          <h2 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white flex items-center gap-2">
            <FolderIcon size={16} className="text-amber-500 fill-amber-500/20" />
            <span>{title}</span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onViewAll && (
            <button
              type="button"
              onClick={onViewAll}
              className="text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-amber-600 dark:hover:text-amber-400 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            >
              {viewAllLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onCreateFolder}
            className="flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-3.5 py-1.5 rounded-xl transition-colors cursor-pointer shadow-2xs"
          >
            <FolderPlus size={14} />
            <span>Nova Pasta</span>
          </button>
        </div>
      </div>

      {/* Cards Grid — Exact styling from Anotações (media_1794055200309.png) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5">
        {rootFolders.map((folder) => {
          const count = getItemCount(folder.id);
          const subfolderCount = folders.filter((sub) => sub.parentId === folder.id).length;
          const folderColor = folder.color || "#F59E0B";
          const isDragOver = dragOverFolderId === folder.id;

          return (
            <div
              key={folder.id}
              onClick={() => onSelectFolder(folder.id)}
              onDragEnter={(e) => {
                if (Array.from(e.dataTransfer?.types || []).includes("application/studyflow-item-id")) {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragOverFolderId(folder.id);
                }
              }}
              onDragOver={(e) => {
                if (Array.from(e.dataTransfer?.types || []).includes("application/studyflow-item-id")) {
                  e.preventDefault();
                  e.stopPropagation();
                  e.dataTransfer.dropEffect = "move";
                  if (dragOverFolderId !== folder.id) {
                    setDragOverFolderId(folder.id);
                  }
                }
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setDragOverFolderId(null);
                }
              }}
              onDrop={(e) => handleDropOnCard(e, folder)}
              className={cn(
                "group relative bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-[#2a2d3a] rounded-xl p-4 hover:border-amber-400 dark:hover:border-amber-500/80 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between text-left select-none",
                isDragOver && "ring-2 ring-purple-500 border-purple-500 bg-purple-50/40 dark:bg-purple-950/30 scale-[1.02]"
              )}
            >
              <div>
                {/* Top Row: Icon & Badges */}
                <div className="flex items-center justify-between gap-2">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform"
                    style={{
                      backgroundColor: `${folderColor}18`,
                      color: folderColor,
                      border: `1px solid ${folderColor}30`,
                    }}
                  >
                    <FolderIcon size={18} className="fill-current" />
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {subfolderCount > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
                        {subfolderCount} {subfolderCount === 1 ? "subpasta" : "subpastas"}
                      </span>
                    )}
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                      {count} {count === 1 ? itemLabel.singular : itemLabel.plural}
                    </span>
                  </div>
                </div>

                {/* Folder Title */}
                <h3 className="font-bold text-sm text-gray-900 dark:text-white mt-2.5 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors truncate">
                  {folder.name}
                </h3>
              </div>

              {/* Footer: Open action */}
              <div className="mt-3.5 pt-2.5 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between text-[11px] font-bold text-amber-600 dark:text-amber-400">
                <span>Abrir pasta</span>
                <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          );
        })}

        {/* Card Adicionar Pasta */}
        <div
          onClick={onCreateFolder}
          className="border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-amber-500 dark:hover:border-amber-500 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-gray-50/40 dark:bg-gray-800/20 hover:bg-amber-50/20 dark:hover:bg-amber-950/20 group min-h-[140px]"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform shadow-2xs">
            <Plus size={18} />
          </div>
          <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400">
            Criar Nova Pasta
          </h4>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 max-w-xs">
            Organize seus conteúdos por especialidade.
          </p>
        </div>
      </div>
    </div>
  );
}

export interface SubfoldersGridProps {
  parentFolderId: string | null;
  parentFolderName?: string;
  folders: FolderType[];
  getItemCount: (folderId: string) => number;
  itemLabel: {
    singular: string;
    plural: string;
  };
  onSelectFolder: (folderId: string) => void;
  onDropItem?: (itemId: string, targetFolderId: string) => void;
}

export function SubfoldersGrid({
  parentFolderId,
  parentFolderName,
  folders,
  getItemCount,
  itemLabel,
  onSelectFolder,
  onDropItem,
}: SubfoldersGridProps) {
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const {
    moveMindMapToFolder,
    moveDeckToFolder,
    moveQuestionToFolder,
    moveCadernoErrorToFolder,
    updateAnotacao,
  } = useAppStore();

  if (!parentFolderId || parentFolderId === "unassigned") return null;

  const childFolders = folders.filter((f) => f.parentId === parentFolderId);
  if (childFolders.length === 0) return null;

  const handleDropOnSubfolder = (e: React.DragEvent, folder: FolderType) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderId(null);

    const itemId = e.dataTransfer.getData("application/studyflow-item-id");
    const itemType = e.dataTransfer.getData("application/studyflow-item-type") || folder.type;
    if (!itemId) return;

    if (onDropItem) {
      onDropItem(itemId, folder.id);
      return;
    }

    if (itemType === "mindmaps") {
      moveMindMapToFolder(itemId, folder.id);
      toast.success(`Mapa mental movido para a subpasta "${folder.name}"!`, { icon: "🧠" });
    } else if (itemType === "flashcards") {
      moveDeckToFolder(itemId, folder.id);
      toast.success(`Baralho movido para a subpasta "${folder.name}"!`, { icon: "🗂️" });
    } else if (itemType === "questions") {
      moveQuestionToFolder(itemId, folder.id);
      toast.success(`Questão movida para a subpasta "${folder.name}"!`, { icon: "❓" });
    } else if (itemType === "anotacoes") {
      updateAnotacao(itemId, { folderId: folder.id });
      toast.success(`Anotação movida para a subpasta "${folder.name}"!`, { icon: "📝" });
    } else if (itemType === "caderno-erros") {
      moveCadernoErrorToFolder(itemId, folder.id);
      toast.success(`Item movido para a subpasta "${folder.name}"!`, { icon: "📕" });
    }
  };

  return (
    <div className="space-y-3 w-full">
      <div className="flex items-center justify-between">
        <h3 className="text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
          <FolderIcon size={15} className="text-blue-500 fill-blue-500/20" />
          <span>
            Subpastas{parentFolderName ? ` em "${parentFolderName}"` : ""}
          </span>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
            {childFolders.length}
          </span>
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5">
        {childFolders.map((sub) => {
          const count = getItemCount(sub.id);
          const nestedSubCount = folders.filter((f) => f.parentId === sub.id).length;
          const folderColor = sub.color || "#3B82F6";
          const isDragOver = dragOverFolderId === sub.id;

          return (
            <div
              key={sub.id}
              onClick={() => onSelectFolder(sub.id)}
              onDragEnter={(e) => {
                if (Array.from(e.dataTransfer?.types || []).includes("application/studyflow-item-id")) {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragOverFolderId(sub.id);
                }
              }}
              onDragOver={(e) => {
                if (Array.from(e.dataTransfer?.types || []).includes("application/studyflow-item-id")) {
                  e.preventDefault();
                  e.stopPropagation();
                  e.dataTransfer.dropEffect = "move";
                  if (dragOverFolderId !== sub.id) {
                    setDragOverFolderId(sub.id);
                  }
                }
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setDragOverFolderId(null);
                }
              }}
              onDrop={(e) => handleDropOnSubfolder(e, sub)}
              className={cn(
                "group relative bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-[#2a2d3a] rounded-xl p-4 hover:border-blue-400 dark:hover:border-blue-500/80 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between text-left select-none",
                isDragOver && "ring-2 ring-purple-500 border-purple-500 bg-purple-50/40 dark:bg-purple-950/30 scale-[1.02]"
              )}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform"
                    style={{
                      backgroundColor: `${folderColor}18`,
                      color: folderColor,
                      border: `1px solid ${folderColor}30`,
                    }}
                  >
                    <FolderIcon size={18} className="fill-current" />
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {nestedSubCount > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
                        {nestedSubCount} {nestedSubCount === 1 ? "subpasta" : "subpastas"}
                      </span>
                    )}
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                      {count} {count === 1 ? itemLabel.singular : itemLabel.plural}
                    </span>
                  </div>
                </div>

                <h3
                  className="font-bold text-sm text-gray-900 dark:text-white mt-2.5 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate"
                  title={sub.name}
                >
                  {sub.name}
                </h3>
              </div>

              <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between text-[11px] font-bold text-blue-600 dark:text-blue-400">
                <span>Abrir subpasta</span>
                <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

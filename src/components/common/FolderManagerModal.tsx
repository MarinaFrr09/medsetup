"use client";

import { useState, useEffect } from "react";
import { FolderPlus, X, Palette, Folder, Check, Edit2 } from "lucide-react";
import { motion } from "framer-motion";
import { useAppStore, Folder as FolderType } from "@/stores/useAppStore";
import { isDescendant } from "./MoveFolderModal";
import toast from "react-hot-toast";

interface FolderManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: "flashcards" | "questions" | "both" | "mindmaps" | "anotacoes";
  parentId?: string | null;
  parentName?: string;
  folderToEdit?: FolderType | null;
  onFolderCreated?: (folderId: string) => void;
}

const FOLDER_COLORS = [
  "#2563EB", // Azul
  "#7C3AED", // Roxo
  "#059669", // Esmeralda
  "#D97706", // Âmbar
  "#E11D48", // Rosa/Vermelho
  "#0D9488", // Ciano
  "#4F46E5", // Índigo
  "#475569", // Grafite
];

export default function FolderManagerModal({
  isOpen,
  onClose,
  defaultType = "flashcards",
  parentId = null,
  parentName,
  folderToEdit = null,
  onFolderCreated,
}: FolderManagerModalProps) {
  const { folders, addFolder, updateFolder } = useAppStore();
  const [folderName, setFolderName] = useState(folderToEdit?.name || "");
  const [selectedColor, setSelectedColor] = useState(folderToEdit?.color || FOLDER_COLORS[0]);
  const [currentParentId, setCurrentParentId] = useState<string | null>(folderToEdit?.parentId || parentId || null);

  // Sync state if folderToEdit changes
  useEffect(() => {
    if (folderToEdit) {
      setFolderName(folderToEdit.name);
      setSelectedColor(folderToEdit.color || FOLDER_COLORS[0]);
      setCurrentParentId(folderToEdit.parentId || null);
    } else {
      setFolderName("");
      setSelectedColor(FOLDER_COLORS[0]);
      setCurrentParentId(parentId || null);
    }
  }, [folderToEdit, isOpen, parentId]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) {
      toast.error("Digite o nome da pasta.");
      return;
    }

    if (folderToEdit) {
      updateFolder({
        ...folderToEdit,
        name: folderName.trim(),
        color: selectedColor,
        parentId: currentParentId || null,
      });
      toast.success(`Pasta "${folderName.trim()}" atualizada com sucesso!`);
      onClose();
      return;
    }

    const newFolderId = `folder_${Date.now()}`;
    const newFolder: FolderType = {
      id: newFolderId,
      name: folderName.trim(),
      color: selectedColor,
      type: defaultType,
      parentId: parentId || null,
      createdAt: new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
    };

    addFolder(newFolder);
    toast.success(parentId ? `Subpasta "${newFolder.name}" criada com sucesso!` : `Pasta "${newFolder.name}" criada com sucesso!`);
    if (onFolderCreated) onFolderCreated(newFolderId);
    setFolderName("");
    onClose();
  };

  const modalTitle = folderToEdit
    ? "Renomear Pasta"
    : parentId
    ? `Nova Subpasta em "${parentName || "Pasta"}"`
    : "Nova Pasta";

  const modalSubtitle = folderToEdit
    ? "Atualize o nome ou a cor de identificação desta pasta"
    : parentId
    ? "Crie uma subpasta dentro desta matéria para refinar a organização"
    : "Organize seus estudos por matérias ou categorias";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-[#1A1D27] dark:border dark:border-[#2a2d3a] overflow-hidden"
      >
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#2a2d3a] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white"
              style={{ backgroundColor: selectedColor }}
            >
              {folderToEdit ? <Edit2 className="w-5 h-5" /> : <Folder className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-1">
                {modalTitle}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {modalSubtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
              Nome da {parentId ? "Subpasta" : "Pasta"}
            </label>
            <input
              type="text"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder={parentId ? "Ex: Membros Superiores, Farmacologia Clínica..." : "Ex: Medicina, Concurso PRF, Biologia..."}
              autoFocus
              className="w-full rounded-xl border border-gray-200 bg-gray-50 dark:bg-[#0F1117] dark:border-[#2a2d3a] px-4 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Palette className="w-4 h-4 text-blue-500" />
              Cor de Identificação
            </label>
            <div className="flex items-center gap-2.5 flex-wrap">
              {FOLDER_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className="w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110 cursor-pointer shadow-xs relative"
                  style={{ backgroundColor: color }}
                >
                  {selectedColor === color && <Check className="w-4 h-4 text-white drop-shadow-xs" />}
                </button>
              ))}
            </div>
          </div>

          {folderToEdit && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Folder className="w-4 h-4 text-purple-500" />
                Pasta Mãe (Tornar subpasta ou mover para a raiz)
              </label>
              <select
                value={currentParentId || ""}
                onChange={(e) => setCurrentParentId(e.target.value || null)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 dark:bg-[#0F1117] dark:border-[#2a2d3a] px-3.5 py-2.5 text-xs text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer"
              >
                <option value="">(Nenhuma - Nível Principal / Raiz)</option>
                {folders
                  .filter(
                    (f) =>
                      f.type === (folderToEdit?.type || defaultType) &&
                      f.id !== folderToEdit.id &&
                      !isDescendant(folderToEdit.id, f.id, folders)
                  )
                  .map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
              </select>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-[#2a2d3a]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!folderName.trim()}
              className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-2 text-xs font-semibold text-white transition-colors shadow-sm cursor-pointer disabled:opacity-50"
            >
              {folderToEdit ? <Check className="w-4 h-4" /> : <FolderPlus className="w-4 h-4" />}
              <span>{folderToEdit ? "Salvar Alterações" : parentId ? "Criar Subpasta" : "Criar Pasta"}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

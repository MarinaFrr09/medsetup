"use client";

import { AlertTriangle, RefreshCw, Trash2 } from "lucide-react";
import { useAppStore } from "@/stores/useAppStore";
import toast from "react-hot-toast";

export default function TrashPage() {
  const { trashItems, restoreFromTrash, permanentlyDeleteFromTrash, emptyTrash } = useAppStore();

  const handleEmptyAll = () => {
    emptyTrash();
    toast.success("Lixeira esvaziada com sucesso!");
  };

  const handleRestore = (id: string) => {
    restoreFromTrash(id);
    toast.success("Item restaurado para sua aba de estudos!");
  };

  const handleDeletePermanent = (id: string) => {
    permanentlyDeleteFromTrash(id);
    toast.success("Item excluído permanentemente.");
  };

  return (
    <div className="w-full space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
            <Trash2 className="w-8 h-8 text-red-500" />
            Lixeira
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1.5 text-sm">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Itens excluídos permanecem salvos e podem ser restaurados a qualquer momento.
          </p>
        </div>

        {trashItems.length > 0 && (
          <button
            onClick={handleEmptyAll}
            className="flex items-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-900/40 px-4 py-2 rounded-xl transition-colors font-medium text-sm cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            Esvaziar Lixeira
          </button>
        )}
      </div>

      {trashItems.length > 0 ? (
        <div className="bg-white dark:bg-[#1A1D27] rounded-2xl border border-gray-200 dark:border-[#2a2d3a] overflow-hidden shadow-sm">
          <div className="divide-y divide-gray-100 dark:divide-[#2a2d3a]">
            {trashItems.map((item) => (
              <div
                key={item.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                      {item.type === "tutoria"
                        ? "Tutoria"
                        : item.type === "book"
                        ? "Livro"
                        : item.type === "atelie"
                        ? "Ateliê"
                        : item.type === "transcription"
                        ? "Transcrição"
                        : item.type === "image_reading"
                        ? "Leitura de Imagem"
                        : item.type}
                    </span>
                    <h3 className="font-medium text-gray-900 dark:text-white text-sm sm:text-base">
                      {item.name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span>Excluído em {item.deletedAt}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    onClick={() => handleRestore(item.id)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 rounded-lg transition-colors cursor-pointer"
                    title="Restaurar"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Restaurar</span>
                  </button>
                  <button
                    onClick={() => handleDeletePermanent(item.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
                    title="Excluir permanentemente"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-gray-50 dark:bg-[#1A1D27]/40 rounded-2xl border border-dashed border-gray-300 dark:border-[#2a2d3a]">
          <div className="w-16 h-16 bg-white dark:bg-[#1A1D27] rounded-2xl flex items-center justify-center mb-4 shadow-sm text-gray-400">
            <Trash2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1.5">
            A lixeira está vazia
          </h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-sm text-sm">
            Nenhum item excluído no momento.
          </p>
        </div>
      )}
    </div>
  );
}

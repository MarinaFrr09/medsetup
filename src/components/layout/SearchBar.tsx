"use client";

import * as React from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Search, HelpCircle, Layers, GitBranch, Mic, FolderOpen, ScanEye } from "lucide-react";
import { useRouter } from "next/navigation";

interface SearchBarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchBar({ isOpen, onClose }: SearchBarProps) {
  const [query, setQuery] = React.useState("");
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery("");
    }
  }, [isOpen]);

  const defaultRoutes = [
    { title: "Banco de Questões", path: "/questions", icon: HelpCircle, category: "Navegação" },
    { title: "Decks de Flashcards", path: "/flashcards", icon: Layers, category: "Navegação" },
    { title: "Mapas Mentais", path: "/mindmaps", icon: GitBranch, category: "Navegação" },
    { title: "Gravar Aula com Microfone", path: "/audio", icon: Mic, category: "Navegação" },
    { title: "Leitura de Imagem com IA", path: "/image-reader", icon: ScanEye, category: "Navegação" },
    { title: "Materiais e PDFs", path: "/materials", icon: FolderOpen, category: "Navegação" },
  ];

  const filtered = query.trim()
    ? defaultRoutes.filter((r) => r.title.toLowerCase().includes(query.toLowerCase()))
    : defaultRoutes;

  const handleSelect = (path: string) => {
    router.push(path);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" className="p-0 overflow-hidden">
      <div className="flex flex-col h-full max-h-[80vh]">
        <div className="border-b border-gray-200 dark:border-[#2a2d3a] p-4">
          <Input
            ref={inputRef}
            leftIcon={<Search className="h-5 w-5 text-gray-400" />}
            placeholder="O que você deseja acessar no MedSetup? (Ctrl+K)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-none shadow-none focus-visible:ring-0 text-base bg-transparent dark:bg-transparent px-0"
          />
        </div>

        <div className="overflow-y-auto p-4 flex-1">
          {filtered.length > 0 ? (
            <div className="space-y-2">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Atalhos Rápidos
              </h3>
              <div className="space-y-1">
                {filtered.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelect(item.path)}
                    className="flex w-full items-center rounded-xl px-3.5 py-2.5 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800/60 transition-colors text-left cursor-pointer"
                  >
                    <item.icon className="mr-3 h-4 w-4 text-blue-500" />
                    <span className="font-medium">{item.title}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
              Nenhuma seção encontrada para "{query}".
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 bg-gray-50 dark:border-[#2a2d3a] dark:bg-[#0F1117] p-3 text-xs text-gray-500 dark:text-gray-400 flex justify-between items-center">
          <span>Selecione para navegar</span>
          <span className="flex items-center space-x-1">
            <kbd className="rounded bg-gray-200 px-1.5 py-0.5 dark:bg-gray-800">Esc</kbd>
            <span>para fechar</span>
          </span>
        </div>
      </div>
    </Modal>
  );
}

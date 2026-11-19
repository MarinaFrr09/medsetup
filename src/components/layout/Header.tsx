"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Search, Menu, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";
import { SearchBar } from "./SearchBar";
import { useAppStore } from "@/stores/useAppStore";

export const Header = React.memo(function Header() {
  const pathname = usePathname();
  const { toggleSidebar } = useAppStore();
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);

  const isFullscreen = pathname.startsWith("/mindmaps/") && pathname !== "/mindmaps";

  // Generate a simple title based on path
  const getPageTitle = () => {
    if (pathname === "/dashboard") return "Dashboard";
    if (pathname.startsWith("/subjects")) return "Disciplinas";
    if (pathname.startsWith("/mind-maps") || pathname.startsWith("/mindmaps")) return "Mapas Mentais";
    if (pathname.startsWith("/flashcards")) return "Flashcards";
    if (pathname.startsWith("/questions")) return "Banco de Questões";
    if (pathname.startsWith("/anotacoes")) return "Anotações Clínicas & Macetes";
    if (pathname.startsWith("/simulados")) return "Simulados";
    if (pathname.startsWith("/transcription")) return "Transcrição";
    if (pathname.startsWith("/caderno-erros")) return "Caderno de Erros";
    if (pathname.startsWith("/tutoria")) return "Tutoria IA";
    if (pathname.startsWith("/atelie")) return "Ateliê";
    if (pathname.startsWith("/interatividade")) return "Interatividade Clínica";
    if (pathname.startsWith("/audio")) return "Gravações & Áudio";
    if (pathname.startsWith("/livros")) return "Biblioteca de Livros";
    if (pathname.startsWith("/materials")) return "Materiais";
    if (pathname.startsWith("/image-reader")) return "Leitor de Imagens";
    if (pathname === "/settings") return "Configurações";
    if (pathname === "/trash") return "Lixeira";
    return "MedSetup";
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <header className="flex h-16 items-center border-b border-gray-200 bg-white/50 px-4 sm:px-6 md:px-8 backdrop-blur-sm dark:border-gray-800 dark:bg-[#1A1D27]/50 sticky top-0 z-10">
        <div className={cn("w-full flex items-center justify-between", !isFullscreen && "max-w-[1400px] mx-auto")}>
          <div className="flex items-center">
            <button
              type="button"
              onClick={toggleSidebar}
              className="lg:hidden mr-2.5 p-2 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800 transition-colors cursor-pointer"
              aria-label="Abrir menu de navegação"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-semibold text-gray-950 dark:text-white">
              {getPageTitle()}
            </h1>
          </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={() => setIsSearchOpen(true)}
            className="hidden md:flex items-center space-x-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:border-gray-800 dark:bg-[#0F1117] dark:text-gray-400 dark:hover:bg-gray-900/50 dark:hover:text-gray-300"
          >
            <Search className="h-4 w-4" />
            <span>Pesquisar...</span>
            <kbd className="hidden rounded bg-white px-1.5 py-0.5 font-sans text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400 lg:inline-block">
              Ctrl K
            </kbd>
          </button>

          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="md:hidden rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 cursor-pointer"
            aria-label="Pesquisar"
          >
            <Search className="h-5 w-5" />
          </button>

          <div className="h-6 w-px bg-gray-200 dark:bg-gray-800" />

          <ThemeToggle />

          <Link
            href="/settings"
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-semibold transition-colors",
              pathname.startsWith("/settings")
                ? "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            )}
            title="Configurações e Chave de API"
          >
            <Settings className="h-5 w-5" />
            <span className="hidden sm:inline">Configurações</span>
          </Link>

          <button className="relative rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800">
            <Bell className="h-5 w-5" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 border-2 border-white dark:border-[#1A1D27]"></span>
          </button>
        </div>
        </div>
      </header>
      
      <SearchBar isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
});


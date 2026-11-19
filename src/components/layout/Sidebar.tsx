"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  HelpCircle,
  Layers,
  GitBranch,
  ScanEye,
  Mic,
  FileSearch,
  Trash2,
  Settings,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  ClipboardCheck,
  Microscope,
  BookOpenCheck,
  Library,
  BookX,
  NotebookPen,
  X,
} from "lucide-react";
import { useAppStore } from "@/stores/useAppStore";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  activeClasses: string;
  activeIconClasses: string;
  hoverClasses: string;
  hoverIconClasses: string;
  badgeDot: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    name: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    activeClasses: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 font-semibold shadow-xs",
    activeIconClasses: "text-indigo-600 dark:text-indigo-400",
    hoverClasses: "hover:bg-indigo-50/60 dark:hover:bg-indigo-950/20 hover:text-indigo-700 dark:hover:text-indigo-300",
    hoverIconClasses: "group-hover:text-indigo-500 dark:group-hover:text-indigo-400",
    badgeDot: "bg-indigo-500",
  },
  {
    name: "Tutoria",
    href: "/tutoria",
    icon: BookOpenCheck,
    activeClasses: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 font-semibold shadow-xs",
    activeIconClasses: "text-emerald-600 dark:text-emerald-400",
    hoverClasses: "hover:bg-emerald-50/60 dark:hover:bg-emerald-950/20 hover:text-emerald-700 dark:hover:text-emerald-300",
    hoverIconClasses: "group-hover:text-emerald-500 dark:group-hover:text-emerald-400",
    badgeDot: "bg-emerald-500",
  },
  {
    name: "Ateliê",
    href: "/atelie",
    icon: Microscope,
    activeClasses: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 font-semibold shadow-xs",
    activeIconClasses: "text-blue-600 dark:text-blue-400",
    hoverClasses: "hover:bg-blue-50/60 dark:hover:bg-blue-950/20 hover:text-blue-700 dark:hover:text-blue-300",
    hoverIconClasses: "group-hover:text-blue-500 dark:group-hover:text-blue-400",
    badgeDot: "bg-blue-500",
  },
  {
    name: "Livros",
    href: "/livros",
    icon: Library,
    activeClasses: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 font-semibold shadow-xs",
    activeIconClasses: "text-amber-600 dark:text-amber-400",
    hoverClasses: "hover:bg-amber-50/60 dark:hover:bg-amber-950/20 hover:text-amber-700 dark:hover:text-amber-300",
    hoverIconClasses: "group-hover:text-amber-500 dark:group-hover:text-amber-400",
    badgeDot: "bg-amber-500",
  },
  {
    name: "Questões",
    href: "/questions",
    icon: HelpCircle,
    activeClasses: "bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300 font-semibold shadow-xs",
    activeIconClasses: "text-violet-600 dark:text-violet-400",
    hoverClasses: "hover:bg-violet-50/60 dark:hover:bg-violet-950/20 hover:text-violet-700 dark:hover:text-violet-300",
    hoverIconClasses: "group-hover:text-violet-500 dark:group-hover:text-violet-400",
    badgeDot: "bg-violet-500",
  },
  {
    name: "Flashcards",
    href: "/flashcards",
    icon: Layers,
    activeClasses: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300 font-semibold shadow-xs",
    activeIconClasses: "text-cyan-600 dark:text-cyan-400",
    hoverClasses: "hover:bg-cyan-50/60 dark:hover:bg-cyan-950/20 hover:text-cyan-700 dark:hover:text-cyan-300",
    hoverIconClasses: "group-hover:text-cyan-500 dark:group-hover:text-cyan-400",
    badgeDot: "bg-cyan-500",
  },
  {
    name: "Simulados",
    href: "/simulados",
    icon: ClipboardCheck,
    activeClasses: "bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300 font-semibold shadow-xs",
    activeIconClasses: "text-orange-600 dark:text-orange-400",
    hoverClasses: "hover:bg-orange-50/60 dark:hover:bg-orange-950/20 hover:text-orange-700 dark:hover:text-orange-300",
    hoverIconClasses: "group-hover:text-orange-500 dark:group-hover:text-orange-400",
    badgeDot: "bg-orange-500",
  },
  {
    name: "Caderno de Erros",
    href: "/caderno-erros",
    icon: BookX,
    activeClasses: "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 font-semibold shadow-xs",
    activeIconClasses: "text-rose-600 dark:text-rose-400",
    hoverClasses: "hover:bg-rose-50/60 dark:hover:bg-rose-950/20 hover:text-rose-700 dark:hover:text-rose-300",
    hoverIconClasses: "group-hover:text-rose-500 dark:group-hover:text-rose-400",
    badgeDot: "bg-rose-500",
  },
  {
    name: "Anotações",
    href: "/anotacoes",
    icon: NotebookPen,
    activeClasses: "bg-yellow-50 text-yellow-800 dark:bg-yellow-950/50 dark:text-yellow-300 font-semibold shadow-xs",
    activeIconClasses: "text-yellow-600 dark:text-yellow-400",
    hoverClasses: "hover:bg-yellow-50/60 dark:hover:bg-yellow-950/20 hover:text-yellow-800 dark:hover:text-yellow-300",
    hoverIconClasses: "group-hover:text-yellow-500 dark:group-hover:text-yellow-400",
    badgeDot: "bg-yellow-500",
  },
  {
    name: "Mapas Mentais",
    href: "/mindmaps",
    icon: GitBranch,
    activeClasses: "bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 font-semibold shadow-xs",
    activeIconClasses: "text-purple-600 dark:text-purple-400",
    hoverClasses: "hover:bg-purple-50/60 dark:hover:bg-purple-950/20 hover:text-purple-700 dark:hover:text-purple-300",
    hoverIconClasses: "group-hover:text-purple-500 dark:group-hover:text-purple-400",
    badgeDot: "bg-purple-500",
  },
  {
    name: "Leitura de Imagem",
    href: "/image-reader",
    icon: ScanEye,
    activeClasses: "bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-950/50 dark:text-fuchsia-300 font-semibold shadow-xs",
    activeIconClasses: "text-fuchsia-600 dark:text-fuchsia-400",
    hoverClasses: "hover:bg-fuchsia-50/60 dark:hover:bg-fuchsia-950/20 hover:text-fuchsia-700 dark:hover:text-fuchsia-300",
    hoverIconClasses: "group-hover:text-fuchsia-500 dark:group-hover:text-fuchsia-400",
    badgeDot: "bg-fuchsia-500",
  },
  {
    name: "Gravação de Aula",
    href: "/audio",
    icon: Mic,
    activeClasses: "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 font-semibold shadow-xs",
    activeIconClasses: "text-red-600 dark:text-red-400",
    hoverClasses: "hover:bg-red-50/60 dark:hover:bg-red-950/20 hover:text-red-700 dark:hover:text-red-300",
    hoverIconClasses: "group-hover:text-red-500 dark:group-hover:text-red-400",
    badgeDot: "bg-red-500",
  },
  {
    name: "Transcrição",
    href: "/transcription",
    icon: FileSearch,
    activeClasses: "bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300 font-semibold shadow-xs",
    activeIconClasses: "text-teal-600 dark:text-teal-400",
    hoverClasses: "hover:bg-teal-50/60 dark:hover:bg-teal-950/20 hover:text-teal-700 dark:hover:text-teal-300",
    hoverIconClasses: "group-hover:text-teal-500 dark:group-hover:text-teal-400",
    badgeDot: "bg-teal-500",
  },
];

export const Sidebar = React.memo(function Sidebar() {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const { sidebarOpen, setSidebarOpen } = useAppStore();
  const pathname = usePathname();

  // Auto-close on mobile/tablet when navigating to a new route
  React.useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, [pathname, setSidebarOpen]);

  const handleLinkClick = () => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const isActive = React.useCallback(
    (href: string) => {
      if (href === "/") return pathname === "/";
      return pathname.startsWith(href);
    },
    [pathname]
  );

  return (
    <>
      {/* Mobile & Tablet Backdrop Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs lg:hidden transition-opacity animate-in fade-in duration-200 cursor-pointer"
          onClick={() => setSidebarOpen(false)}
          aria-label="Fechar menu"
        />
      )}

      <aside
        className={cn(
          "flex h-dvh max-h-dvh flex-col border-r border-gray-200 bg-white dark:border-[#2a2d3a] dark:bg-[#1A1D27] select-none transition-all duration-300 ease-in-out",
          // Mobile & Tablet drawer: fixed overlay
          "fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] lg:static lg:z-20",
          sidebarOpen ? "translate-x-0 shadow-2xl lg:shadow-none" : "-translate-x-full lg:translate-x-0",
          // Desktop collapsed state
          isCollapsed ? "lg:w-20" : "lg:w-64"
        )}
      >
        {/* Logo */}
        <div className="flex h-14 lg:h-16 items-center justify-between px-4 border-b border-gray-200 dark:border-[#2a2d3a] flex-shrink-0">
          {!isCollapsed ? (
            <Link
              href="/"
              onClick={handleLinkClick}
              className="flex items-center space-x-2.5 overflow-hidden whitespace-nowrap"
            >
              <GraduationCap className="h-7 w-7 flex-shrink-0 text-blue-600 dark:text-blue-400" />
              <div className="flex flex-col leading-tight">
                <span className="font-bold text-xl tracking-tight text-blue-600 dark:text-blue-400">MedSetup</span>
                <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">criado por: Marina O. Freire</span>
              </div>
            </Link>
          ) : (
            <Link
              href="/"
              onClick={handleLinkClick}
              className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
            >
              <GraduationCap className="h-6 w-6" />
            </Link>
          )}

          {/* Close button for Mobile and Tablet */}
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800 transition-colors lg:hidden cursor-pointer"
            aria-label="Fechar navegação"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain py-2 px-3 space-y-0.5">
          <nav className="space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  prefetch={true}
                  onClick={handleLinkClick}
                  className={cn(
                    "group flex items-center rounded-xl px-3 py-2 lg:py-2.5 text-sm font-medium transition-all duration-150 relative min-h-[38px] lg:min-h-[42px]",
                    active
                      ? item.activeClasses
                      : cn("text-gray-600 dark:text-gray-400", item.hoverClasses)
                  )}
                  title={isCollapsed ? item.name : undefined}
                >
                  <item.icon
                    className={cn(
                      "flex-shrink-0 transition-colors",
                      isCollapsed ? "mx-auto h-5 w-5" : "mr-3 h-5 w-5",
                      active
                        ? item.activeIconClasses
                        : cn("text-gray-400 dark:text-gray-500", item.hoverIconClasses)
                    )}
                  />
                  {(!isCollapsed || (typeof window !== "undefined" && window.innerWidth < 1024)) && (
                    <span className="truncate">{item.name}</span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom section */}
        <div className="border-t border-gray-200 px-3 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] lg:py-2.5 dark:border-[#2a2d3a] flex-shrink-0 space-y-0.5 bg-white dark:bg-[#1A1D27]">
          <Link
            href="/trash"
            prefetch={true}
            onClick={handleLinkClick}
            className={cn(
              "group flex items-center rounded-xl px-3 py-2 text-sm font-medium transition-colors duration-150 min-h-[38px] lg:min-h-[42px]",
              isActive("/trash")
                ? "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white font-semibold"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800/60"
            )}
            title={isCollapsed ? "Lixeira" : undefined}
          >
            <Trash2
              className={cn(
                "flex-shrink-0 text-gray-400",
                isCollapsed ? "mx-auto h-5 w-5" : "mr-3 h-5 w-5"
              )}
            />
            {(!isCollapsed || (typeof window !== "undefined" && window.innerWidth < 1024)) && <span className="truncate">Lixeira</span>}
          </Link>
          <Link
            href="/settings"
            prefetch={true}
            onClick={handleLinkClick}
            className={cn(
              "group flex items-center rounded-xl px-3 py-2 text-sm font-medium transition-colors duration-150 min-h-[38px] lg:min-h-[42px]",
              isActive("/settings")
                ? "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white font-semibold"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800/60"
            )}
            title={isCollapsed ? "Configurações" : undefined}
          >
            <Settings
              className={cn(
                "flex-shrink-0 text-gray-400",
                isCollapsed ? "mx-auto h-5 w-5" : "mr-3 h-5 w-5"
              )}
            />
            {(!isCollapsed || (typeof window !== "undefined" && window.innerWidth < 1024)) && <span className="truncate">Configurações</span>}
          </Link>

          {/* Collapse toggle button (Desktop only) */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex absolute -right-3 top-20 h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm hover:text-gray-800 focus:outline-none dark:border-[#2a2d3a] dark:bg-[#1A1D27] dark:text-gray-400 dark:hover:text-gray-200 z-30 cursor-pointer"
          >
            {isCollapsed ? (
              <ChevronRight className="h-3.5 w-3.5" />
            ) : (
              <ChevronLeft className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </aside>
    </>
  );
});

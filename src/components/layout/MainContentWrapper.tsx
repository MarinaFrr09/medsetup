"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface MainContentWrapperProps {
  children: React.ReactNode;
}

export const MainContentWrapper = React.memo(function MainContentWrapper({ children }: MainContentWrapperProps) {
  const pathname = usePathname();

  // Fullscreen interactive canvas pages like /mindmaps/[id]
  const isFullscreen = pathname.startsWith("/mindmaps/") && pathname !== "/mindmaps";

  if (isFullscreen) {
    return (
      <main className="flex-1 overflow-hidden relative">
        {children}
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto px-3 sm:px-6 md:px-8 py-4 sm:py-6">
      <div className="max-w-[1680px] mx-auto w-full">
        {children}
      </div>
    </main>
  );
});


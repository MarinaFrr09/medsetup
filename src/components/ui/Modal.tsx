"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  size = "md",
  children,
  footer,
  className,
}: ModalProps) {
  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-2xl",
    full: "max-w-[90vw] h-[90vh]",
  };

  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "pointer-events-auto w-full rounded-xl bg-white shadow-lg dark:bg-[#1A1D27] dark:border dark:border-gray-800 flex flex-col max-h-[90vh]",
                sizeClasses[size],
                className
              )}
            >
              {(title || description) && (
                <div className="flex flex-col space-y-1.5 p-6 pb-4">
                  <div className="flex items-center justify-between">
                    {title && (
                      <h2 className="text-lg font-semibold leading-none tracking-tight dark:text-white">
                        {title}
                      </h2>
                    )}
                    <button
                      onClick={onClose}
                      className="rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <X className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      <span className="sr-only">Fechar</span>
                    </button>
                  </div>
                  {description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {description}
                    </p>
                  )}
                </div>
              )}
              
              {!title && !description && (
                <button
                  onClick={onClose}
                  className="absolute right-4 top-4 rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors z-10"
                >
                  <X className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  <span className="sr-only">Fechar</span>
                </button>
              )}

              <div className="p-6 pt-0 overflow-y-auto flex-1">{children}</div>

              {footer && (
                <div className="flex items-center p-6 pt-0 mt-auto">
                  {footer}
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

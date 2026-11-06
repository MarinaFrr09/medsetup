"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "left" | "right";
  className?: string;
}

export function Dropdown({ trigger, children, align = "right", className }: DropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {trigger}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "absolute z-50 mt-2 w-56 rounded-xl border border-gray-200 bg-white shadow-lg focus:outline-none dark:border-gray-800 dark:bg-[#1A1D27]",
              align === "right" ? "right-0" : "left-0",
              className
            )}
            onClick={() => setIsOpen(false)}
          >
            <div className="py-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface DropdownItemProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  disabled?: boolean;
  danger?: boolean;
}

export function DropdownItem({
  children,
  icon,
  disabled,
  danger,
  className,
  ...props
}: DropdownItemProps) {
  return (
    <div
      className={cn(
        "flex w-full cursor-pointer items-center px-4 py-2 text-sm transition-colors",
        disabled && "cursor-not-allowed opacity-50",
        danger
          ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
          : "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800",
        className
      )}
      {...props}
    >
      {icon && <span className="mr-2 h-4 w-4">{icon}</span>}
      {children}
    </div>
  );
}

export function DropdownSeparator() {
  return <div className="my-1 h-px bg-gray-200 dark:bg-gray-800" />;
}

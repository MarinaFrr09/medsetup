"use client";

import * as React from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown";
import { useAppStore } from "@/stores/useAppStore";

export function ThemeToggle() {
  const { theme, setTheme } = useAppStore();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500">
        <Sun className="h-5 w-5" />
      </div>
    );
  }

  return (
    <Dropdown
      align="right"
      trigger={
        <button className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-50 focus:outline-none cursor-pointer">
          {theme === "light" ? (
            <Sun className="h-5 w-5 text-amber-500" />
          ) : theme === "dark" ? (
            <Moon className="h-5 w-5 text-blue-400" />
          ) : (
            <Monitor className="h-5 w-5" />
          )}
          <span className="sr-only">Alternar tema</span>
        </button>
      }
    >
      <DropdownItem
        icon={<Sun className="h-4 w-4 text-amber-500" />}
        onClick={() => setTheme("light")}
        className={theme === "light" ? "bg-gray-100 dark:bg-gray-800" : ""}
      >
        Claro
      </DropdownItem>
      <DropdownItem
        icon={<Moon className="h-4 w-4 text-blue-400" />}
        onClick={() => setTheme("dark")}
        className={theme === "dark" ? "bg-gray-100 dark:bg-gray-800" : ""}
      >
        Escuro
      </DropdownItem>
      <DropdownItem
        icon={<Monitor className="h-4 w-4" />}
        onClick={() => setTheme("system")}
        className={theme === "system" ? "bg-gray-100 dark:bg-gray-800" : ""}
      >
        Sistema
      </DropdownItem>
    </Dropdown>
  );
}

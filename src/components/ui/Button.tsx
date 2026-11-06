"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { motion, HTMLMotionProps } from "framer-motion";

export interface ButtonProps extends Omit<HTMLMotionProps<"button">, "ref" | "children"> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseClasses =
      "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

    const variantClasses = {
      primary: "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600",
      secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-[#1A1D27] dark:text-gray-100 dark:hover:bg-gray-800",
      danger: "bg-red-500 text-white hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700",
      ghost: "hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-[#1A1D27] dark:hover:text-gray-50",
      outline: "border border-gray-200 bg-transparent hover:bg-gray-100 dark:border-gray-800 dark:hover:bg-[#1A1D27]",
    };

    const sizeClasses = {
      sm: "h-8 px-3 text-xs",
      md: "h-10 px-4 py-2",
      lg: "h-12 px-8 text-base",
    };

    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: disabled || isLoading ? 1 : 1.02 }}
        whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
        className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {!isLoading && leftIcon && <span className="mr-2 flex items-center">{leftIcon}</span>}
        {children}
        {!isLoading && rightIcon && <span className="ml-2 flex items-center">{rightIcon}</span>}
      </motion.button>
    );
  }
);
Button.displayName = "Button";

export { Button };

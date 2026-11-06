"use client";

import { useState, useRef, useEffect } from "react";
import { Handle, Position } from "@xyflow/react";

export default function NoteNode({ id, data, selected }: { id?: string; data: any; selected?: boolean }) {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(data.label || "Nota explicativa");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const color = data.color || "#475569";
  const size = data.size || "small";
  const icon = data.icon;
  const shape = data.shape || "rounded";
  const isSearchMatch = data.isSearchMatch;

  useEffect(() => {
    setText(data.label || "Nota explicativa");
  }, [data.label]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [isEditing]);

  const sizeClasses = {
    small: "px-3.5 py-2 text-xs min-w-[110px] max-w-[240px]",
    medium: "px-4.5 py-2.5 text-sm min-w-[140px] max-w-[270px]",
    large: "px-6 py-3.5 text-base min-w-[170px] max-w-[310px]",
  }[size as "small" | "medium" | "large"] || "px-3.5 py-2 text-xs min-w-[110px] max-w-[240px]";

  const shapeClass =
    shape === "pill"
      ? "rounded-full"
      : shape === "square"
      ? "rounded-sm"
      : shape === "bubble"
      ? "rounded-xl rounded-br-xs"
      : "rounded-xl";

  const handleFinishEditing = () => {
    setIsEditing(false);
    const trimmed = text.trim() || "Nota explicativa";
    setText(trimmed);
    if (data.onUpdateLabel) {
      data.onUpdateLabel(trimmed);
    }
  };

  return (
    <div
      onDoubleClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
      className={`${sizeClasses} ${shapeClass} shadow-xs bg-white dark:bg-[#1A1D27] border-2 font-medium text-gray-900 dark:text-gray-100 transition-all duration-150 select-none cursor-pointer flex items-center justify-center relative ${
        isSearchMatch
          ? "ring-4 ring-yellow-400 scale-110 shadow-2xl animate-pulse"
          : selected
          ? "ring-3 ring-blue-500 scale-105 shadow-md"
          : "hover:scale-[1.02]"
      }`}
      style={{ borderColor: color }}
    >
      {/* 4-Way Connection Handles with IDs */}
      <Handle id="target-left" type="target" position={Position.Left} className="w-2 h-2 bg-gray-400 !-left-1" />
      <Handle id="source-left" type="source" position={Position.Left} className="w-2 h-2 bg-gray-400 !-left-1 opacity-0 group-hover:opacity-100" />

      <Handle id="target-right" type="target" position={Position.Right} className="w-2 h-2 bg-gray-400 !-right-1" />
      <Handle id="source-right" type="source" position={Position.Right} className="w-2 h-2 bg-gray-400 !-right-1 opacity-0 group-hover:opacity-100" />

      <Handle id="target-top" type="target" position={Position.Top} className="w-2 h-2 bg-gray-400 !-top-1" />
      <Handle id="source-top" type="source" position={Position.Top} className="w-2 h-2 bg-gray-400 !-top-1 opacity-0 group-hover:opacity-100" />

      <Handle id="target-bottom" type="target" position={Position.Bottom} className="w-2.5 h-2.5 bg-gray-400 !-bottom-1" />
      <Handle id="source-bottom" type="source" position={Position.Bottom} className="w-2.5 h-2.5 bg-gray-400 !-bottom-1 opacity-0 group-hover:opacity-100" />

      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={text}
          rows={1}
          onChange={(e) => {
            setText(e.target.value);
            if (data.onUpdateLabel) data.onUpdateLabel(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = `${e.target.scrollHeight}px`;
          }}
          onBlur={handleFinishEditing}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleFinishEditing();
            }
            if (e.key === "Escape") {
              setIsEditing(false);
            }
          }}
          className="w-full bg-transparent text-gray-900 dark:text-white font-medium text-center resize-none outline-none border-b border-gray-300 dark:border-gray-600 p-0 leading-snug"
        />
      ) : (
        <div
          onClick={(e) => {
            if (selected) {
              e.stopPropagation();
              setIsEditing(true);
            }
          }}
          className="leading-snug break-words text-center flex items-center justify-center gap-1.5"
          title="Clique duas vezes para editar o texto"
        >
          {icon && <span className="text-xs sm:text-sm select-none">{icon}</span>}
          <span>{data.label}</span>
        </div>
      )}
    </div>
  );
}

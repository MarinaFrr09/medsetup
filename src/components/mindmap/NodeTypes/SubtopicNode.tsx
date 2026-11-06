"use client";

import { useState, useRef, useEffect } from "react";
import { Handle, Position } from "@xyflow/react";

export default function SubtopicNode({ id, data, selected }: { id?: string; data: any; selected?: boolean }) {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(data.label || "Subtópico");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const color = data.color || "#059669";
  const size = data.size || "medium";
  const icon = data.icon;
  const shape = data.shape || "rounded";
  const isSearchMatch = data.isSearchMatch;

  useEffect(() => {
    setText(data.label || "Subtópico");
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
    small: "px-3.5 py-2 text-xs min-w-[120px] max-w-[220px]",
    medium: "px-5 py-3 text-sm min-w-[160px] max-w-[270px]",
    large: "px-7 py-4 text-base min-w-[190px] max-w-[310px]",
  }[size as "small" | "medium" | "large"] || "px-5 py-3 text-sm min-w-[160px] max-w-[270px]";

  const shapeClass =
    shape === "pill"
      ? "rounded-full"
      : shape === "square"
      ? "rounded-sm"
      : shape === "bubble"
      ? "rounded-2xl rounded-br-xs"
      : "rounded-2xl";

  const handleFinishEditing = () => {
    setIsEditing(false);
    const trimmed = text.trim() || "Subtópico";
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
      className={`${sizeClasses} ${shapeClass} shadow-md text-white text-center font-bold transition-all duration-150 select-none cursor-pointer relative group ${
        isSearchMatch
          ? "ring-4 ring-yellow-400 scale-110 shadow-2xl animate-pulse"
          : selected
          ? "ring-4 ring-white/90 scale-105 shadow-xl"
          : "hover:scale-[1.02]"
      }`}
      style={{
        backgroundColor: color,
        boxShadow: `0 8px 20px -3px ${color}77`,
      }}
    >
      {/* 4-Way Connection Handles with IDs */}
      <Handle id="target-left" type="target" position={Position.Left} className="w-2.5 h-2.5 bg-white border border-gray-400 !-left-1.5" />
      <Handle id="source-left" type="source" position={Position.Left} className="w-2.5 h-2.5 bg-white border border-gray-400 !-left-1.5 opacity-0 group-hover:opacity-100" />

      <Handle id="target-right" type="target" position={Position.Right} className="w-2.5 h-2.5 bg-white border border-gray-400 !-right-1.5" />
      <Handle id="source-right" type="source" position={Position.Right} className="w-2.5 h-2.5 bg-white border border-gray-400 !-right-1.5 opacity-0 group-hover:opacity-100" />

      <Handle id="target-top" type="target" position={Position.Top} className="w-2.5 h-2.5 bg-white border border-gray-400 !-top-1.5" />
      <Handle id="source-top" type="source" position={Position.Top} className="w-2.5 h-2.5 bg-white border border-gray-400 !-top-1.5 opacity-0 group-hover:opacity-100" />

      <Handle id="target-bottom" type="target" position={Position.Bottom} className="w-2.5 h-2.5 bg-white border border-gray-400 !-bottom-1.5" />
      <Handle id="source-bottom" type="source" position={Position.Bottom} className="w-2.5 h-2.5 bg-white border border-gray-400 !-bottom-1.5 opacity-0 group-hover:opacity-100" />

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
          className="w-full bg-transparent text-white font-bold text-center resize-none outline-none border-b border-white/50 p-0 leading-snug"
        />
      ) : (
        <div
          onClick={(e) => {
            if (selected) {
              e.stopPropagation();
              setIsEditing(true);
            }
          }}
          className="leading-snug break-words flex items-center justify-center gap-1.5"
          title="Clique duas vezes para editar o texto"
        >
          {icon && <span className="text-sm sm:text-base select-none drop-shadow-xs">{icon}</span>}
          <span>{data.label}</span>
        </div>
      )}
    </div>
  );
}

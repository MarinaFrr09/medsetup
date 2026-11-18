"use client";

import React, { useState, useRef, useEffect, memo } from "react";
import { Handle, Position } from "@xyflow/react";

function getCaretOffsetFromPoint(clientX: number, clientY: number, fallbackLen: number): number {
  if (typeof document === "undefined") return fallbackLen;
  try {
    const doc = document as any;
    if (typeof doc.caretRangeFromPoint === "function") {
      const range = doc.caretRangeFromPoint(clientX, clientY);
      if (range && range.startContainer && range.startContainer.nodeType === Node.TEXT_NODE) {
        return range.startOffset;
      }
    } else if (typeof doc.caretPositionFromPoint === "function") {
      const pos = doc.caretPositionFromPoint(clientX, clientY);
      if (pos && pos.offsetNode && pos.offsetNode.nodeType === Node.TEXT_NODE) {
        return pos.offset;
      }
    }
  } catch {}
  return fallbackLen;
}

function TopicNodeComponent({ id, data, selected }: { id?: string; data: any; selected?: boolean }) {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(data.label || "Tema Central");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const initialCaretPosRef = useRef<number | null>(null);
  const editStartTimeRef = useRef<number>(0);

  const bgColor = data.color || "#2563EB";
  const size = data.size || "large";
  const icon = data.icon;
  const shape = data.shape || "rounded";
  const isSearchMatch = data.isSearchMatch;

  useEffect(() => {
    if (!isEditing) {
      setText(data.label || "Tema Central");
    }
  }, [data.label, isEditing]);

  useEffect(() => {
    const handleExternalUpdate = (e: Event) => {
      const custom = e as CustomEvent<{ nodeId?: string; newLabel?: string }>;
      if (custom.detail?.nodeId && custom.detail.nodeId === id && typeof custom.detail.newLabel === "string") {
        const updated = custom.detail.newLabel.trim() || "Tema Central";
        setText(updated);
        setIsEditing(false);
        if (data.onUpdateLabel) {
          data.onUpdateLabel(updated);
        }
      }
    };
    window.addEventListener("medsetup:update-mindmap-node", handleExternalUpdate);
    return () => window.removeEventListener("medsetup:update-mindmap-node", handleExternalUpdate);
  }, [id, data]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      const el = textareaRef.current;
      editStartTimeRef.current = Date.now();
      el.focus();
      const targetPos =
        initialCaretPosRef.current !== null
          ? Math.min(Math.max(0, initialCaretPosRef.current), el.value.length)
          : el.value.length;
      el.setSelectionRange(targetPos, targetPos);
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [isEditing]);

  const startEditingAtEvent = (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentLabel = String(data.label || text || "");
    initialCaretPosRef.current = getCaretOffsetFromPoint(e.clientX, e.clientY, currentLabel.length);
    setIsEditing(true);
  };

  const isLongText = String(data.label || text || "").length > 90;
  const sizeClasses = isLongText
    ? "px-6 py-4 text-sm min-w-[240px] max-w-[440px]"
    : {
        small: "px-4 py-2.5 text-sm min-w-[140px] max-w-[240px]",
        medium: "px-6 py-3.5 text-base min-w-[180px] max-w-[280px]",
        large: "px-8 py-4.5 text-lg min-w-[220px] max-w-[340px]",
      }[size as "small" | "medium" | "large"] || "px-8 py-4.5 text-lg min-w-[220px] max-w-[340px]";

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
    const trimmed = text.trim() || "Tema Central";
    setText(trimmed);
    if (data.onUpdateLabel) {
      data.onUpdateLabel(trimmed);
    }
  };

  return (
    <div
      data-mindmap-node-id={id}
      onDoubleClick={(e) => {
        if (!isEditing) {
          startEditingAtEvent(e);
        }
      }}
      className={`${sizeClasses} ${shapeClass} shadow-xl text-white text-center font-black transition-[box-shadow,border-color,opacity] duration-150 ${
        isEditing ? "nodrag nopan select-text cursor-text" : "select-none cursor-pointer"
      } relative group ${
        isSearchMatch
          ? "ring-4 ring-yellow-400 shadow-2xl animate-pulse"
          : selected
          ? "ring-4 ring-white shadow-2xl"
          : "hover:shadow-2xl hover:brightness-105"
      }`}
      style={{
        backgroundColor: bgColor,
        boxShadow: `0 10px 30px -4px ${bgColor}88`,
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
          data-mindmap-node-id={id}
          value={text}
          rows={1}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => {
            e.stopPropagation();
            if (Date.now() - editStartTimeRef.current < 350 && textareaRef.current) {
              e.preventDefault();
              const pos = initialCaretPosRef.current ?? textareaRef.current.value.length;
              textareaRef.current.setSelectionRange(pos, pos);
            }
          }}
          onChange={(e) => {
            setText(e.target.value);
            if (data.onUpdateLabel) data.onUpdateLabel(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = `${e.target.scrollHeight}px`;
          }}
          onBlur={handleFinishEditing}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleFinishEditing();
            }
            if (e.key === "Escape") {
              setIsEditing(false);
            }
          }}
          className="nodrag nopan select-text cursor-text w-full bg-transparent text-white font-black text-center resize-none outline-none border-b border-white/50 p-0 leading-tight"
        />
      ) : (
        <div
          onClick={(e) => {
            if (selected) {
              startEditingAtEvent(e);
            }
          }}
          className="leading-tight break-words font-black tracking-tight flex items-center justify-center gap-1.5"
          title="Clique para posicionar o cursor e editar o texto"
        >
          {icon && <span className="text-base sm:text-lg select-none drop-shadow-xs">{icon}</span>}
          <span>{data.label}</span>
        </div>
      )}
    </div>
  );
}

const areEqual = (prevProps: any, nextProps: any) => {
  return (
    prevProps.id === nextProps.id &&
    prevProps.selected === nextProps.selected &&
    prevProps.data?.label === nextProps.data?.label &&
    prevProps.data?.color === nextProps.data?.color &&
    prevProps.data?.size === nextProps.data?.size &&
    prevProps.data?.icon === nextProps.data?.icon &&
    prevProps.data?.shape === nextProps.data?.shape &&
    prevProps.data?.isSearchMatch === nextProps.data?.isSearchMatch
  );
};

export default memo(TopicNodeComponent, areEqual);

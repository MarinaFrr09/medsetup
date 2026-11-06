"use client";

import { Camera, UploadCloud, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface ImageUploaderProps {
  onFileSelected?: (file: File | null) => void;
}

export default function ImageUploader({ onFileSelected }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFile = (file: File | null) => {
    if (!file) {
      setPreview(null);
      if (onFileSelected) onFileSelected(null);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    if (onFileSelected) onFileSelected(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div
      className={cn(
        "border-2 border-dashed rounded-2xl p-8 transition-all duration-200 flex flex-col items-center justify-center min-h-[280px] bg-gray-50 dark:bg-[#1A1D27]/50 text-center relative overflow-hidden",
        isDragging ? "border-blue-500 bg-blue-50 dark:bg-blue-900/10" : "border-gray-300 dark:border-[#2a2d3a]",
        preview ? "p-0 border-none bg-black" : ""
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {preview ? (
        <div className="w-full h-full relative group min-h-[360px] flex items-center justify-center bg-gray-950 rounded-2xl overflow-hidden">
          <img
            src={preview}
            alt="Preview do arquivo"
            className="max-h-[380px] w-auto object-contain"
          />
          <button
            onClick={() => handleFile(null)}
            className="absolute top-4 right-4 bg-black/70 hover:bg-black/90 text-white px-3.5 py-1.5 rounded-lg backdrop-blur-sm transition-colors text-xs font-medium flex items-center gap-1.5 cursor-pointer"
          >
            <X size={14} />
            <span>Trocar Imagem</span>
          </button>
        </div>
      ) : (
        <>
          <div className="flex gap-4 mb-5">
            <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center">
              <UploadCloud className="w-7 h-7" />
            </div>
            <div className="w-14 h-14 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center">
              <Camera className="w-7 h-7" />
            </div>
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1.5">
            Arraste e solte uma foto ou imagem aqui
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-5 max-w-sm">
            PNG, JPG, JPEG ou WEBP (fotos de quadros, resumos em caderno, apostilas ou slides)
          </p>
          <label className="bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-[#2a2d3a] text-gray-700 dark:text-gray-200 px-5 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-sm cursor-pointer text-sm font-medium">
            Procurar Imagem
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFile(e.target.files[0]);
                }
              }}
            />
          </label>
        </>
      )}
    </div>
  );
}

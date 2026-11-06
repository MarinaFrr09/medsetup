"use client";

import { useState, useMemo, useRef } from "react";
import {
  FileText,
  Upload,
  Search,
  FolderOpen,
  Trash2,
  ExternalLink,
  Download,
  Copy,
  Plus,
  Link as LinkIcon,
  Image as ImageIcon,
  FileCode,
  FileAudio,
  LayoutGrid,
  List as ListIcon,
  X,
  FileSpreadsheet,
} from "lucide-react";
import { useAppStore, MaterialItem } from "@/stores/useAppStore";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

export default function MaterialsPage() {
  const { materials, addMaterial, deleteMaterial } = useAppStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [previewMaterial, setPreviewMaterial] = useState<MaterialItem | null>(null);

  // Form states for manual link/material
  const [materialName, setMaterialName] = useState("");
  const [materialSubject, setMaterialSubject] = useState("");
  const [materialUrl, setMaterialUrl] = useState("");
  const [materialType, setMaterialType] = useState<"pdf" | "image" | "doc" | "audio" | "link">("link");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      let type: "pdf" | "image" | "doc" | "audio" | "link" = "doc";
      if (file.type.includes("pdf")) type = "pdf";
      else if (file.type.includes("image")) type = "image";
      else if (file.type.includes("audio")) type = "audio";

      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        const newMat: MaterialItem = {
          id: `mat_${Date.now()}_${i}`,
          name: file.name,
          type,
          size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
          subject: materialSubject.trim() || "Geral",
          date: new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }),
          url: base64,
        };
        addMaterial(newMat);
        toast.success(`"${file.name}" adicionado aos materiais!`);
      };
      reader.readAsDataURL(file);
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
    setIsAddModalOpen(false);
  };

  const handleAddLinkOrNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!materialName.trim()) {
      toast.error("Informe o nome do material.");
      return;
    }

    const newMat: MaterialItem = {
      id: `mat_${Date.now()}`,
      name: materialName.trim(),
      type: materialType,
      size: materialType === "link" ? "Link Web" : "1.0 MB",
      subject: materialSubject.trim() || "Geral",
      date: new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }),
      url: materialUrl.trim() || undefined,
    };

    addMaterial(newMat);
    toast.success(`Material "${newMat.name}" adicionado!`);
    setMaterialName("");
    setMaterialUrl("");
    setMaterialSubject("");
    setIsAddModalOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    deleteMaterial(id);
    toast.success(`"${name}" movido para a lixeira.`);
  };

  const handleCopyLink = (url?: string, name?: string) => {
    if (url) {
      navigator.clipboard.writeText(url);
      toast.success("Link copiado para a área de transferência!");
    } else {
      navigator.clipboard.writeText(name || "");
      toast.success("Nome do arquivo copiado!");
    }
  };

  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => {
      const matchesSearch =
        !searchQuery.trim() ||
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.subject.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = selectedType === "all" || m.type === selectedType;
      return matchesSearch && matchesType;
    });
  }, [materials, searchQuery, selectedType]);

  const getIcon = (type: string) => {
    switch (type) {
      case "pdf":
        return <FileText className="w-5 h-5 text-red-500" />;
      case "image":
        return <ImageIcon className="w-5 h-5 text-blue-500" />;
      case "audio":
        return <FileAudio className="w-5 h-5 text-amber-500" />;
      case "link":
        return <LinkIcon className="w-5 h-5 text-emerald-500" />;
      default:
        return <FileCode className="w-5 h-5 text-indigo-500" />;
    }
  };

  return (
    <div className="w-full space-y-6 pb-12">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
            <FolderOpen className="text-blue-600 dark:text-blue-400" />
            Materiais de Estudo
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Centralize seus PDFs, imagens anatômicas, links de artigos e arquivos de apoio
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            multiple
            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.mp3"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm transition-colors cursor-pointer"
          >
            <Upload size={16} />
            <span>Upload de Arquivo</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-[#2a2d3a] bg-white dark:bg-[#1A1D27] hover:bg-gray-50 dark:hover:bg-gray-800 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
          >
            <Plus size={16} />
            <span>Adicionar Link</span>
          </button>
        </div>
      </div>

      {/* 2. Productive Filter Bar */}
      <div className="bg-white dark:bg-[#1A1D27] rounded-2xl border border-gray-200 dark:border-[#2a2d3a] p-3 sm:p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Buscar por nome ou matéria..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-4 py-2 text-xs sm:text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-[#2a2d3a] dark:bg-[#0F1117] dark:text-white"
          />
        </div>

        {/* Type Filter Chips */}
        <div className="flex items-center gap-1.5 flex-wrap w-full md:w-auto">
          {[
            { id: "all", label: "Todos" },
            { id: "pdf", label: "PDFs" },
            { id: "image", label: "Imagens" },
            { id: "doc", label: "Docs" },
            { id: "link", label: "Links" },
            { id: "audio", label: "Áudios" },
          ].map((typeChip) => (
            <button
              key={typeChip.id}
              onClick={() => setSelectedType(typeChip.id)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                selectedType === typeChip.id
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              {typeChip.label}
            </button>
          ))}
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl self-end md:self-auto">
          <button
            onClick={() => setViewMode("grid")}
            className={cn(
              "p-1.5 rounded-lg transition-colors cursor-pointer",
              viewMode === "grid"
                ? "bg-white dark:bg-[#1A1D27] text-blue-600 shadow-2xs"
                : "text-gray-500 hover:text-gray-900 dark:text-gray-400"
            )}
            title="Visualização em Grade"
          >
            <LayoutGrid size={16} />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "p-1.5 rounded-lg transition-colors cursor-pointer",
              viewMode === "list"
                ? "bg-white dark:bg-[#1A1D27] text-blue-600 shadow-2xs"
                : "text-gray-500 hover:text-gray-900 dark:text-gray-400"
            )}
            title="Visualização em Lista"
          >
            <ListIcon size={16} />
          </button>
        </div>
      </div>

      {/* 3. Materials Content */}
      {filteredMaterials.length > 0 ? (
        viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredMaterials.map((mat) => (
              <div
                key={mat.id}
                className="group relative bg-white dark:bg-[#1A1D27] rounded-2xl border border-gray-200 dark:border-[#2a2d3a] p-4 shadow-xs hover:shadow-md hover:border-blue-400 dark:hover:border-blue-500 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center shadow-2xs">
                      {getIcon(mat.type)}
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleCopyLink(mat.url, mat.name)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                        title="Copiar link ou nome"
                      >
                        <Copy size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(mat.id, mat.name)}
                        className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40"
                        title="Excluir"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-bold text-sm text-gray-900 dark:text-white line-clamp-2 mb-1" title={mat.name}>
                    {mat.name}
                  </h3>

                  <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                    {mat.subject}
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-[#2a2d3a] flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>{mat.size}</span>
                  {mat.url ? (
                    <a
                      href={mat.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                    >
                      <span>Abrir</span>
                      <ExternalLink size={12} />
                    </a>
                  ) : (
                    <span>{mat.date}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-[#1A1D27] rounded-2xl border border-gray-200 dark:border-[#2a2d3a] overflow-hidden shadow-xs divide-y divide-gray-100 dark:divide-[#2a2d3a]">
            {filteredMaterials.map((mat) => (
              <div
                key={mat.id}
                className="flex items-center justify-between p-3.5 hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center shrink-0">
                    {getIcon(mat.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                      {mat.name}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      <span className="font-medium text-gray-700 dark:text-gray-300">{mat.subject}</span>
                      <span>•</span>
                      <span>{mat.size}</span>
                      <span>•</span>
                      <span>{mat.date}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-4">
                  {mat.url && (
                    <a
                      href={mat.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-400 flex items-center gap-1"
                    >
                      <span>Acessar</span>
                      <ExternalLink size={12} />
                    </a>
                  )}
                  <button
                    onClick={() => handleCopyLink(mat.url, mat.name)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                    title="Copiar link"
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(mat.id, mat.name)}
                    className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40"
                    title="Excluir"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-gray-50/50 dark:bg-[#1A1D27]/30 rounded-3xl border border-dashed border-gray-200 dark:border-[#2a2d3a]">
          <div className="w-14 h-14 bg-blue-100 dark:bg-blue-950/50 rounded-2xl flex items-center justify-center mb-3 text-blue-600 dark:text-blue-400">
            <FolderOpen className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">
            Nenhum material encontrado
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mb-5 leading-relaxed">
            Faça upload de apostilas, slides de aula, imagens médicas ou registre links úteis para consultar durante os estudos.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Upload size={14} />
              <span>Fazer Upload</span>
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 border border-gray-200 dark:border-[#2a2d3a] bg-white dark:bg-[#1A1D27] text-gray-700 dark:text-gray-300 rounded-xl text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            >
              Adicionar Link
            </button>
          </div>
        </div>
      )}

      {/* 4. Add Link Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#1A1D27] rounded-3xl border border-gray-200 dark:border-[#2a2d3a] p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#2a2d3a] pb-3">
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <LinkIcon size={18} className="text-blue-600" />
                Adicionar Material ou Link
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddLinkOrNote} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                  Título / Nome do Material
                </label>
                <input
                  type="text"
                  value={materialName}
                  onChange={(e) => setMaterialName(e.target.value)}
                  placeholder="Ex: Artigo de Tratamento de HAS, Slide Aula 04..."
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 dark:bg-[#0F1117] dark:border-[#2a2d3a] px-3.5 py-2 text-xs sm:text-sm text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                  Link / URL (Opcional)
                </label>
                <input
                  type="url"
                  value={materialUrl}
                  onChange={(e) => setMaterialUrl(e.target.value)}
                  placeholder="https://scielo.br/artigo..."
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 dark:bg-[#0F1117] dark:border-[#2a2d3a] px-3.5 py-2 text-xs sm:text-sm text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                    Matéria / Disciplina
                  </label>
                  <input
                    type="text"
                    value={materialSubject}
                    onChange={(e) => setMaterialSubject(e.target.value)}
                    placeholder="Ex: Cardiologia"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 dark:bg-[#0F1117] dark:border-[#2a2d3a] px-3.5 py-2 text-xs sm:text-sm text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                    Tipo
                  </label>
                  <select
                    value={materialType}
                    onChange={(e: any) => setMaterialType(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 dark:bg-[#0F1117] dark:border-[#2a2d3a] px-3 py-2 text-xs sm:text-sm text-gray-900 dark:text-white outline-none"
                  >
                    <option value="link">Link Web</option>
                    <option value="pdf">PDF</option>
                    <option value="doc">Documento</option>
                    <option value="image">Imagem</option>
                    <option value="audio">Áudio</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#2a2d3a]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-colors cursor-pointer"
                >
                  Salvar Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  X,
  Loader2,
  Clock,
  Timer,
  FileText,
  Upload,
  CheckCircle2,
  Trash2,
  BookOpen,
  HelpCircle,
  PenTool,
  Plus,
  Paperclip,
  Microscope,
} from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

interface CreateSimuladoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSimuladoCreated: (simulado: any) => void;
}

interface ManualTissueItem {
  id: string;
  name: string;
  expectedAnswer: string;
  microscopicFeatures: string;
  imageFile?: File;
  imagePreview?: string;
}

export default function CreateSimuladoModal({
  isOpen,
  onClose,
  onSimuladoCreated,
}: CreateSimuladoModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Form states
  const [prompt, setPrompt] = useState("");
  const [subject, setSubject] = useState("");
  const [totalCount, setTotalCount] = useState(10);
  const [essayCount, setEssayCount] = useState(1);
  const [hasTimer, setHasTimer] = useState(true);
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [difficulty, setDifficulty] = useState("all");

  // Histology tissue settings (1 to 3 tissues)
  const [includeHistology, setIncludeHistology] = useState<boolean>(true);
  const [histologyMode, setHistologyMode] = useState<"ai" | "manual">("ai");
  const [aiHistologyCount, setAiHistologyCount] = useState<number>(2);
  const [manualTissues, setManualTissues] = useState<ManualTissueItem[]>([
    {
      id: "tissue-1",
      name: "",
      expectedAnswer: "",
      microscopicFeatures: "",
    },
  ]);

  // File attachment state (multiple files without size limits)
  const [attachedFiles, setAttachedFiles] = useState<
    Array<{
      id: string;
      name: string;
      size: string;
      base64?: string;
      mimeType: string;
      file?: File;
    }>
  >([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newFiles = files.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name: file.name,
      size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      mimeType: file.type || "application/pdf",
      file,
    }));

    setAttachedFiles((prev) => [...prev, ...newFiles]);
    toast.success(`${files.length} arquivo(s) anexado(s) como base da prova!`);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveFile = (id: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleClearFiles = () => {
    setAttachedFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Histology manual handlers
  const handleAddManualTissue = () => {
    if (manualTissues.length >= 3) return;
    setManualTissues((prev) => [
      ...prev,
      {
        id: `tissue-${Date.now()}`,
        name: "",
        expectedAnswer: "",
        microscopicFeatures: "",
      },
    ]);
  };

  const handleRemoveManualTissue = (id: string) => {
    setManualTissues((prev) => prev.filter((t) => t.id !== id));
  };

  const handleUpdateManualTissue = (id: string, field: keyof ManualTissueItem, val: string) => {
    setManualTissues((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: val } : t))
    );
  };

  const handleUploadTissueImage = (id: string, file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setManualTissues((prev) =>
        prev.map((t) =>
          t.id === id
            ? { ...t, imageFile: file, imagePreview: reader.result as string }
            : t
        )
      );
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveTissueImage = (id: string) => {
    setManualTissues((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, imageFile: undefined, imagePreview: undefined } : t
      )
    );
  };

  const handleGenerate = async () => {
    const hasFiles = attachedFiles.length > 0;
    if (!prompt.trim() && !hasFiles) {
      toast.error("Por favor, descreva o tema/instruções da prova ou anexe um ou mais materiais de estudo.");
      return;
    }

    if (includeHistology && histologyMode === "manual") {
      const emptyName = manualTissues.some((t) => !t.name.trim());
      if (emptyName) {
        toast.error("Informe o nome de cada tecido histológico adicionado ou mude para o modo automático da IA.");
        return;
      }
    }

    setIsGenerating(true);
    setElapsedSeconds(0);
    const interval = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {}, 0);

    try {
      let res: Response;

      const hasDirectFiles = hasFiles && attachedFiles.some((f) => f.file);
      const hasTissueFiles = includeHistology && histologyMode === "manual" && manualTissues.some((t) => t.imageFile);

      if (hasDirectFiles || hasTissueFiles) {
        const formData = new FormData();
        formData.append("prompt", prompt.trim());
        formData.append("subject", subject.trim());
        formData.append("totalCount", String(totalCount));
        formData.append("essayCount", String(essayCount));
        formData.append("hasTimer", String(hasTimer));
        formData.append("durationMinutes", String(durationMinutes));
        formData.append("difficulty", difficulty);

        // Histology parameters
        formData.append("includeHistology", String(includeHistology));
        formData.append("histologyMode", histologyMode);
        formData.append("aiHistologyCount", String(aiHistologyCount));
        if (includeHistology && histologyMode === "manual") {
          formData.append(
            "manualTissues",
            JSON.stringify(
              manualTissues.map((t) => ({
                id: t.id,
                name: t.name,
                expectedAnswer: t.expectedAnswer,
                microscopicFeatures: t.microscopicFeatures,
              }))
            )
          );
          manualTissues.forEach((t, i) => {
            if (t.imageFile) {
              formData.append(`tissue_image_${i}`, t.imageFile);
            }
          });
        }

        for (const item of attachedFiles) {
          if (item.file) {
            formData.append("files", item.file);
          }
        }

        res = await fetch("/api/ai/generate-simulado", {
          method: "POST",
          body: formData,
          signal: controller.signal,
        });
      } else {
        res = await fetch("/api/ai/generate-simulado", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: prompt.trim(),
            subject: subject.trim(),
            totalCount,
            essayCount,
            hasTimer,
            durationMinutes,
            difficulty,
            includeHistology,
            histologyMode,
            aiHistologyCount,
            manualTissues:
              includeHistology && histologyMode === "manual"
                ? manualTissues.map((t) => ({
                    id: t.id,
                    name: t.name,
                    expectedAnswer: t.expectedAnswer,
                    microscopicFeatures: t.microscopicFeatures,
                    imagePreview: t.imagePreview,
                  }))
                : [],
            fileAttachments: attachedFiles.map((f) => ({
              name: f.name,
              data: f.base64 || "",
              mimeType: f.mimeType,
            })),
          }),
          signal: controller.signal,
        });
      }

      clearTimeout(timeoutId);
      clearInterval(interval);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Erro do servidor (${res.status}).`);
      }

      const data = await res.json();
      if (data && data.questions && data.questions.length > 0) {
        toast.success(`Simulado gerado com sucesso com ${data.questions.length} questões!`);
        onSimuladoCreated(data);
        onClose();
        setPrompt("");
        handleClearFiles();
      } else {
        throw new Error("A IA não retornou questões válidas. Tente refinar o tema ou instruções.");
      }
    } catch (err: any) {
      console.error(err);
      let msg = err.message || "Erro ao gerar simulado.";
      if (err.name === "AbortError") {
        msg = "A geração demorou mais que o esperado. Tente novamente.";
      } else if (msg === "Failed to fetch" || msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
        msg = "Falha de conexão com o servidor. Verifique se o servidor está ativo e tente novamente.";
      }
      toast.error(msg);
    } finally {
      clearInterval(interval);
      clearTimeout(timeoutId);
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="flex w-full max-w-2xl flex-col rounded-3xl bg-white shadow-2xl dark:bg-[#1A1D27] dark:border dark:border-[#2a2d3a] overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#2a2d3a] px-6 py-4 bg-gradient-to-r from-blue-50/70 to-indigo-50/70 dark:from-blue-950/20 dark:to-indigo-950/20">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Criar Novo Simulado com IA
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Padrão de prova universitária de medicina com casos clínicos e lâminas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Form Body */}
        <div className="p-6 space-y-5 max-h-[72vh] overflow-y-auto pr-2">
          {/* 1. Tema, Descrição ou Instruções da Prova */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                Tema, Descrição ou Instruções {attachedFiles.length === 0 ? "*" : "(Opcional com anexos)"}
              </label>
              <span className="text-[11px] text-gray-400 dark:text-gray-500">
                {attachedFiles.length > 0 ? "Você pode dar ordens ou focar em partes dos anexos" : "Obrigatório"}
              </span>
            </div>
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isGenerating}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-2xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-[#2a2d3a] dark:bg-[#0F1117] dark:text-white disabled:opacity-60 resize-none transition-all"
              placeholder={
                attachedFiles.length > 0
                  ? "Ex: 'Foque em proliferação celular, neoplasias e diagnóstico diferencial', ou deixe em branco para cobrir todo o material anexado..."
                  : "Ex: Proliferação Celular: Carcinogênese, tipos histológicos (CEC, CBC, adenocarcinoma), imuno-histoquímica e mutações genéticas..."
              }
            />
            {attachedFiles.length === 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">Sugestões:</span>
                {[
                  "Medicina - Proliferação Celular e Neoplasias",
                  "Patologia: Diferencial de CBC, CEC e Melanoma",
                  "Clínica Médica: Casos Clínicos e Plano Assistencial",
                ].map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => setPrompt(sug)}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors cursor-pointer"
                  >
                    {sug.split(":")[0]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 2. Disciplina / Matéria */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
              Disciplina / Matéria (Opcional)
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={isGenerating}
              placeholder="Ex: Medicina, Patologia, Morfologia, Clínica Médica..."
              className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-[#2a2d3a] dark:bg-[#0F1117] dark:text-white"
            />
          </div>

          {/* Multiple File Attachments Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                Anexar PDFs / Materiais Base da Prova ({attachedFiles.length})
              </label>
              {attachedFiles.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    {attachedFiles.length} arquivo(s) carregado(s)
                  </span>
                  <button
                    type="button"
                    onClick={handleClearFiles}
                    className="text-[10px] text-gray-400 hover:text-red-500 underline cursor-pointer"
                  >
                    Remover todos
                  </button>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg,.ppt,.pptx"
              onChange={handleFileUpload}
              className="hidden"
            />

            {attachedFiles.length === 0 ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isGenerating}
                className="w-full flex items-center justify-center gap-2 p-3.5 border border-dashed border-gray-300 dark:border-[#2a2d3a] rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              >
                <Upload size={15} className="text-blue-500" />
                <span>Clique para selecionar um ou mais PDFs, apostilas ou slides (sem limite)</span>
              </button>
            ) : (
              <div className="space-y-2">
                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                  {attachedFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-2 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 text-xs"
                    >
                      <div className="flex items-center gap-2 truncate pr-2 min-w-0">
                        <FileText size={15} className="text-blue-600 shrink-0" />
                        <span className="font-semibold text-gray-900 dark:text-white truncate">
                          {file.name}
                        </span>
                        <span className="text-gray-400 text-[10px] shrink-0">({file.size})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(file.id)}
                        disabled={isGenerating}
                        className="text-gray-400 hover:text-red-500 p-1 cursor-pointer shrink-0"
                        title="Remover este arquivo"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isGenerating}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-blue-300 dark:border-blue-800 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Adicionar mais PDFs ou materiais</span>
                </button>
              </div>
            )}
          </div>

          {/* ─────────────────── Lâminas & Tecidos Histológicos (1 a 3 tecidos) ─────────────────── */}
          <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-900/50 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Microscope className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-950 dark:text-indigo-200">
                    Tecidos Histológicos da Prova (1 a 3 tecidos)
                  </h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Toda prova inclui de 1 a 3 questões com análise microscópica de lâminas/biópsias
                  </p>
                </div>
              </div>

              {/* Toggle to include histology questions */}
              <button
                type="button"
                onClick={() => setIncludeHistology(!includeHistology)}
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer",
                  includeHistology ? "bg-indigo-600" : "bg-gray-300 dark:bg-gray-700"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                    includeHistology ? "translate-x-6" : "translate-x-1"
                  )}
                />
              </button>
            </div>

            {includeHistology && (
              <div className="space-y-3.5 pt-2 border-t border-indigo-100 dark:border-indigo-900/40">
                {/* Mode Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setHistologyMode("ai")}
                    className={cn(
                      "py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                      histologyMode === "ai"
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-white dark:bg-[#1A1D27] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
                    )}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>A IA escolhe os tecidos e lâminas</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistologyMode("manual")}
                    className={cn(
                      "py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                      histologyMode === "manual"
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-white dark:bg-[#1A1D27] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
                    )}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Eu adiciono os tecidos e respostas</span>
                  </button>
                </div>

                {histologyMode === "ai" ? (
                  /* AI Generation Mode */
                  <div className="p-3.5 rounded-xl bg-white dark:bg-[#1A1D27] border border-indigo-100 dark:border-indigo-900/40 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                        Quantidade de tecidos/lâminas para analisar:
                      </span>
                      <div className="flex items-center gap-1.5">
                        {[1, 2, 3].map((count) => (
                          <button
                            key={count}
                            type="button"
                            onClick={() => setAiHistologyCount(count)}
                            className={cn(
                              "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                              aiHistologyCount === count
                                ? "bg-indigo-600 text-white shadow-xs"
                                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                            )}
                          >
                            {count} {count === 1 ? "tecido" : "tecidos"}
                          </button>
                        ))}
                      </div>
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      A IA selecionará {aiHistologyCount} corte(s) histológico(s) pertinentes ao tema da prova com lâminas microscópicas ilustradas, perguntas morfológicas de diagnóstico e gabarito fundamentado.
                    </p>
                  </div>
                ) : (
                  /* Manual Mode */
                  <div className="space-y-3">
                    {manualTissues.map((tissue, index) => (
                      <div
                        key={tissue.id}
                        className="p-3.5 rounded-xl bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-gray-700 space-y-3"
                      >
                        <div className="flex items-center justify-between pb-1.5 border-b border-gray-100 dark:border-gray-800">
                          <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                            <Microscope className="w-3.5 h-3.5" />
                            Tecido Histológico {index + 1} de {manualTissues.length}
                          </span>
                          {manualTissues.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveManualTissue(tissue.id)}
                              className="text-gray-400 hover:text-red-500 p-1 cursor-pointer"
                              title="Remover tecido"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                              Nome do Tecido / Biópsia *
                            </label>
                            <input
                              type="text"
                              value={tissue.name}
                              onChange={(e) => handleUpdateManualTissue(tissue.id, "name", e.target.value)}
                              placeholder="Ex: Biópsia Pulmonar (Carcinoma Escamoso)"
                              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#12141c] px-3 py-1.5 text-xs text-gray-900 dark:text-white outline-none focus:border-indigo-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                              Resposta / Diagnóstico Esperado *
                            </label>
                            <input
                              type="text"
                              value={tissue.expectedAnswer}
                              onChange={(e) => handleUpdateManualTissue(tissue.id, "expectedAnswer", e.target.value)}
                              placeholder="Ex: Carcinoma escamoso (pérolas córneas)"
                              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#12141c] px-3 py-1.5 text-xs text-gray-900 dark:text-white outline-none focus:border-indigo-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                            Características Microscópicas / Enunciado (Opcional)
                          </label>
                          <input
                            type="text"
                            value={tissue.microscopicFeatures}
                            onChange={(e) => handleUpdateManualTissue(tissue.id, "microscopicFeatures", e.target.value)}
                            placeholder="Ex: Células poligonais com citoplasma eosinofílico, queratinização e pontes intercelulares..."
                            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#12141c] px-3 py-1.5 text-xs text-gray-900 dark:text-white outline-none focus:border-indigo-500"
                          />
                        </div>

                        {/* Tissue Image Upload */}
                        <div>
                          <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                            Foto da Lâmina / Imagem Histológica (Opcional)
                          </label>
                          {tissue.imagePreview ? (
                            <div className="flex items-center gap-3 p-2 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700">
                              <img
                                src={tissue.imagePreview}
                                alt="Lâmina"
                                className="w-14 h-14 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
                                  {tissue.imageFile?.name || "Lâmina carregada"}
                                </p>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTissueImage(tissue.id)}
                                  className="text-[10px] text-red-600 hover:underline mt-0.5 cursor-pointer"
                                >
                                  Remover imagem
                                </button>
                              </div>
                            </div>
                          ) : (
                            <label className="flex items-center justify-center gap-2 p-3 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
                              <Upload size={14} className="text-indigo-500" />
                              <span>Upload da foto da lâmina histológica (PNG, JPG, WEBP)</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleUploadTissueImage(tissue.id, file);
                                }}
                              />
                            </label>
                          )}
                        </div>
                      </div>
                    ))}

                    {manualTissues.length < 3 && (
                      <button
                        type="button"
                        onClick={handleAddManualTissue}
                        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-indigo-300 dark:border-indigo-800 text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Adicionar Mais um Tecido Histológico ({manualTissues.length}/3)</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. Cronômetro & Tempo da Prova */}
          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#0F1117]/60 border border-gray-200 dark:border-[#2a2d3a] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Timer size={16} className="text-blue-500" />
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200">
                    Cronômetro Regressivo
                  </span>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Finaliza e corrige a prova automaticamente ao esgotar o tempo
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setHasTimer(!hasTimer)}
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer",
                  hasTimer ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-700"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                    hasTimer ? "translate-x-6" : "translate-x-1"
                  )}
                />
              </button>
            </div>

            {hasTimer && (
              <div className="pt-2 border-t border-gray-200 dark:border-[#2a2d3a]">
                <div className="flex items-center justify-between text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  <span>Duração da Prova:</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400 text-sm">
                    {durationMinutes} minutos ({Math.floor(durationMinutes / 60)}h{" "}
                    {durationMinutes % 60}m)
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[20, 30, 45, 60, 90, 120].map((min) => (
                    <button
                      key={min}
                      type="button"
                      onClick={() => setDurationMinutes(min)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                        durationMinutes === min
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100"
                      )}
                    >
                      {min} min
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 4. Quantidade de Questões & Dissertativas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Quantidade Total */}
            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#0F1117]/60 border border-gray-200 dark:border-[#2a2d3a]">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <HelpCircle size={14} className="text-blue-500" />
                  Total de Questões:
                </label>
                <span className="text-sm font-extrabold text-blue-600 dark:text-blue-400">
                  {totalCount} questões
                </span>
              </div>
              <input
                type="range"
                min="3"
                max="50"
                value={totalCount}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setTotalCount(val);
                  if (essayCount > val) setEssayCount(val);
                }}
                disabled={isGenerating}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <div className="flex items-center gap-1.5 mt-2">
                {[5, 10, 15, 20, 30, 40].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => {
                      setTotalCount(num);
                      if (essayCount > num) setEssayCount(num);
                    }}
                    disabled={isGenerating}
                    className={cn(
                      "px-2 py-0.5 rounded text-xs font-bold transition-all cursor-pointer",
                      totalCount === num
                        ? "bg-blue-600 text-white"
                        : "bg-white dark:bg-[#1A1D27] text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700"
                    )}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Questões Dissertativas */}
            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#0F1117]/60 border border-gray-200 dark:border-[#2a2d3a]">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <PenTool size={14} className="text-purple-500" />
                  Dissertativas:
                </label>
                <span className="text-sm font-extrabold text-purple-600 dark:text-purple-400">
                  {essayCount} dissertativa{essayCount > 1 ? "s" : ""}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max={totalCount}
                value={essayCount}
                onChange={(e) => setEssayCount(Number(e.target.value))}
                disabled={isGenerating}
                className="w-full accent-purple-600 cursor-pointer"
              />
              <div className="flex items-center gap-1.5 mt-2">
                {[0, 1, 2, 3, 5].filter((n) => n <= totalCount).map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setEssayCount(num)}
                    disabled={isGenerating}
                    className={cn(
                      "px-2 py-0.5 rounded text-xs font-bold transition-all cursor-pointer",
                      essayCount === num
                        ? "bg-purple-600 text-white"
                        : "bg-white dark:bg-[#1A1D27] text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700"
                    )}
                  >
                    {num}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2">
                {totalCount - essayCount} questões serão de múltipla escolha.
              </p>
            </div>
          </div>

          {/* 5. Nível de Dificuldade */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
              Nível de Dificuldade
            </label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              disabled={isGenerating}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-[#2a2d3a] dark:bg-[#0F1117] dark:text-white cursor-pointer"
            >
              <option value="all">Mista / Equilibrada (Universitário)</option>
              <option value="easy">Fácil (Conceitos Essenciais)</option>
              <option value="medium">Média (Padrão Acadêmico)</option>
              <option value="hard">Difícil (Residência / Casos Complexos)</option>
            </select>
          </div>
        </div>

        {/* Generation Progress Indicator */}
        {isGenerating && (
          <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-2xl flex items-center justify-between text-xs text-blue-700 dark:text-blue-300 mx-6 mb-4">
            <span className="flex items-center gap-2 font-medium">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              A IA está formulando os casos clínicos, lâminas histológicas, gabarito e justificativas...
            </span>
            <span className="flex items-center gap-1 font-mono font-bold">
              <Clock className="w-3.5 h-3.5" />
              {elapsedSeconds}s
            </span>
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-100 dark:border-[#2a2d3a] px-6 py-4 bg-gray-50/50 dark:bg-[#12141c]">
          <button
            type="button"
            onClick={onClose}
            disabled={isGenerating}
            className="rounded-xl px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating || (!prompt.trim() && attachedFiles.length === 0)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:from-blue-700 hover:to-indigo-700 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Gerando Simulado ({elapsedSeconds}s)...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Gerar Prova com IA</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

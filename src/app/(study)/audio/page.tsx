"use client";

import { Mic, Sparkles, Clock, History, Calendar, FileText, ArrowRight, GitBranch, Trash2, Timer, Zap, ChevronLeft } from "lucide-react";
import { useState, useEffect } from "react";
import AudioRecorder from "@/components/audio/AudioRecorder";
import dynamic from "next/dynamic";
import { useAppStore, AudioRecording } from "@/stores/useAppStore";
import toast from "react-hot-toast";

const TranscriptView = dynamic(() => import("@/components/audio/TranscriptView"), {
  loading: () => (
    <div className="flex items-center justify-center p-12 text-sm text-gray-500">
      <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin mr-2.5" />
      Carregando transcrição e resumo...
    </div>
  ),
  ssr: false,
});

export default function AudioPage() {
  const { audioRecordings, addAudioRecording, deleteAudioRecording } = useAppStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandMode, setExpandMode] = useState(false);
  const [hasAttachedFile, setHasAttachedFile] = useState(false);
  const [currentResult, setCurrentResult] = useState<any | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined" || audioRecordings.length === 0) return;
    const resumeId = new URLSearchParams(window.location.search).get("resumeId");
    if (resumeId) {
      const target = audioRecordings.find((r) => r.id === resumeId);
      if (target?.processedData) {
        setCurrentResult(target.processedData);
        try {
          localStorage.setItem("medsetup_last_audio_id", target.id);
        } catch {}
      }
    }
  }, [audioRecordings]);

  // Timer while AI is processing large audio
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isProcessing) {
      setElapsedSeconds(0);
      interval = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isProcessing]);

  const formatElapsed = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handleRecordingComplete = async ({
    audioBlob,
    liveTranscript,
    duration,
    expand,
  }: {
    audioBlob: Blob | File | null;
    liveTranscript: string;
    duration: number;
    expand?: boolean;
  }) => {
    setIsProcessing(true);
    setCurrentResult(null);

    const willExpand = expand !== undefined ? expand : expandMode;

    // Generous 15-minute (900.000 ms) safety ceiling for huge lecture recordings
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 900000);

    try {
      const formData = new FormData();
      if (audioBlob) {
        const filename = (audioBlob as any).name || "recording.webm";
        formData.append("audio", audioBlob, filename);
      }
      if (liveTranscript) {
        formData.append("transcriptText", liveTranscript);
      }
      formData.append("expand", willExpand ? "true" : "false");

      const response = await fetch("/api/ai/transcribe", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Falha ao processar o áudio com a IA");
      }

      const data = await response.json();
      setCurrentResult({ ...data, expanded: willExpand });

      const formatDuration = (secs: number) => {
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        const s = secs % 60;
        if (h > 0) {
          return `${h}h ${m}m ${s.toString().padStart(2, "0")}s`;
        }
        return `${m}:${s.toString().padStart(2, "0")}`;
      };

      const newRecording: AudioRecording = {
        id: Date.now().toString(),
        title: data.title || `Aula gravada - ${new Date().toLocaleDateString("pt-BR")}`,
        duration: formatDuration(duration),
        date: new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
        processedData: { ...data, expanded: willExpand },
      };

      addAudioRecording(newRecording);
      try {
        localStorage.setItem("medsetup_last_audio_id", newRecording.id);
      } catch {}
      toast.success(
        willExpand
          ? "Aula decodificada com Resumo e Mapa Mental Expandidos!"
          : "Aula decodificada, transcrita e salva com sucesso!"
      );
    } catch (error: any) {
      console.error("Erro na transcrição:", error);
      if (error.name === "AbortError") {
        toast.error("O processamento excedeu o limite máximo de 15 minutos.");
      } else {
        toast.error(error.message || "Erro ao processar gravação.");
      }
    } finally {
      clearTimeout(timeoutId);
      setIsProcessing(false);
    }
  };

  const handleDeleteRecording = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteAudioRecording(id);
    if (currentResult?.id === id) {
      setCurrentResult(null);
    }
    toast.success("Gravação movida para a lixeira.");
  };

  return (
    <div className="w-full space-y-6 pb-12">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
          <Mic className="text-red-500 w-8 h-8" />
          Gravação e Transcrição de Aula
        </h1>
      </div>

      {currentResult && !isProcessing ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2">
            <button
              type="button"
              onClick={() => setCurrentResult(null)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              Voltar para Nova Gravação
            </button>
          </div>
          <TranscriptView data={currentResult} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <AudioRecorder
              onComplete={handleRecordingComplete}
              isProcessing={isProcessing}
              expandMode={expandMode}
              onFileAttached={setHasAttachedFile}
            />

            {/* Unified "Expand" Toggle — Só exibe após anexar arquivo */}
            {hasAttachedFile && (
              <div
                onClick={() => setExpandMode((v) => !v)}
                className={`flex items-start gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all select-none ${
                  expandMode
                    ? "border-amber-400 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-500 shadow-xs"
                    : "border-gray-200 dark:border-[#2a2d3a] bg-white dark:bg-[#1A1D27] hover:border-amber-300 dark:hover:border-amber-700"
                }`}
              >
                <div
                  className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    expandMode ? "border-amber-500 bg-amber-500" : "border-gray-400 bg-transparent"
                  }`}
                >
                  {expandMode && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Zap className={`w-4 h-4 ${expandMode ? "text-amber-500" : "text-gray-400"}`} />
                    <span
                      className={`font-bold text-sm ${
                        expandMode ? "text-amber-700 dark:text-amber-400" : "text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      Expandir
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        expandMode
                          ? "bg-amber-500 text-white"
                          : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      OPCIONAL
                    </span>
                  </div>
                  <p
                    className={`text-xs mt-1 leading-relaxed ${
                      expandMode
                        ? "text-amber-700/90 dark:text-amber-400/90 font-medium"
                        : "text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {expandMode
                      ? "✅ Ativado para Resumo Completo e Mapa Mental — a IA aprofundará as explicações com definições completas, contexto clínico/prático, fisiopatologia, exemplos e mapa mental ampliado."
                      : "Ative para aprofundar e enriquecer as informações na geração do Resumo Completo e do Mapa Mental da aula."}
                  </p>
                </div>
              </div>
            )}

            {isProcessing && (
              <div className="bg-white dark:bg-[#1A1D27] rounded-2xl p-8 border border-gray-200 dark:border-[#2a2d3a] shadow-sm text-center">
                <div className="inline-flex p-4 bg-red-50 dark:bg-red-950/30 rounded-full mb-4">
                  <div className="w-8 h-8 border-3 border-red-500 border-t-transparent rounded-full animate-spin" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center justify-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  Analisando e Transcrevendo o Áudio Completo...
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-md mx-auto text-xs sm:text-sm">
                  Ouvindo a gravação do início ao fim sem cortes, filtrando ruídos, gerando a transcrição integral, o resumo aprofundado e o mapa mental.
                </p>

                <div className="mt-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-mono font-medium">
                  <Timer className="w-3.5 h-3.5 text-red-500" />
                  <span>Tempo em processamento: {formatElapsed(elapsedSeconds)}</span>
                </div>
              </div>
            )}
          </div>

        {/* Histórico Lateral Persistido */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <History className="w-5 h-5 text-gray-400" />
              Gravações Salvas
            </h2>
            <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full font-medium">
              {audioRecordings.length}
            </span>
          </div>

          <div className="space-y-3">
            {audioRecordings.length > 0 ? (
              audioRecordings.map((rec) => (
                <div
                  key={rec.id}
                  onClick={() => {
                    setCurrentResult(rec.processedData);
                    try {
                      localStorage.setItem("medsetup_last_audio_id", rec.id);
                    } catch {}
                  }}
                  className="p-4 bg-white dark:bg-[#1A1D27] rounded-xl border border-gray-200 dark:border-[#2a2d3a] hover:border-blue-500 dark:hover:border-blue-500 transition-all cursor-pointer shadow-sm group relative"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium text-gray-900 dark:text-white text-sm line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors pr-6">
                      {rec.title}
                    </h3>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteRecording(e, rec.id)}
                      className="absolute top-3.5 right-3.5 p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      title="Excluir gravação"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {rec.duration}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {rec.date}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-800/50">
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex items-center gap-1">
                      <FileText className="w-3 h-3" /> Resumo
                    </span>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 flex items-center gap-1">
                      <GitBranch className="w-3 h-3" /> Mapa Mental
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 bg-white dark:bg-[#1A1D27] rounded-xl border border-dashed border-gray-200 dark:border-[#2a2d3a] text-center">
                <Mic className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Nenhuma gravação recente. Grave uma aula pelo microfone ou envie um arquivo para ver o histórico salvo aqui.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    )}
    </div>
  );
}

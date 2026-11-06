"use client";

import { Mic, Square, Volume2, AlertCircle, Sparkles, UploadCloud, FileAudio, FileText, Zap, Video, FileVideo } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface AudioRecorderProps {
  onComplete: (data: {
    audioBlob: Blob | File | null;
    liveTranscript: string;
    duration: number;
    expand?: boolean;
  }) => void;
  isProcessing?: boolean;
  expandMode?: boolean;
  onFileAttached?: (hasFile: boolean) => void;
}

export default function AudioRecorder({
  onComplete,
  isProcessing,
  expandMode = false,
  onFileAttached,
}: AudioRecorderProps) {
  const [mode, setMode] = useState<"mic" | "upload" | "text">("mic");
  const [isRecording, setIsRecording] = useState(false);
  const [time, setTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [manualText, setManualText] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedDuration, setUploadedDuration] = useState<number>(0);
  const [micPermissionError, setMicPermissionError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // References to guarantee continuous, infinite live transcription across Chrome session timeouts
  const isRecordingRef = useRef(false);
  const shouldRestartRecognitionRef = useRef(false);
  const finalTranscriptRef = useRef("");
  const interimTranscriptRef = useRef("");

  // Helper to accurately extract duration from uploaded audio/video files
  const getMediaDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      try {
        const isVideo = file.type.startsWith("video/") || /\.(mp4|mov|mkv|m4v|avi|webm)$/i.test(file.name);
        const media = document.createElement(isVideo ? "video" : "audio");
        media.preload = "metadata";
        const url = URL.createObjectURL(file);
        media.src = url;
        media.onloadedmetadata = () => {
          URL.revokeObjectURL(url);
          const d = Math.round(media.duration);
          resolve(isNaN(d) || !isFinite(d) || d <= 0 ? 0 : d);
        };
        media.onerror = () => {
          URL.revokeObjectURL(url);
          resolve(0);
        };
      } catch {
        resolve(0);
      }
    });
  };

  // Timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => setTime((t) => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  useEffect(() => {
    onFileAttached?.(mode === "upload" && !!uploadedFile);
  }, [mode, uploadedFile, onFileAttached]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    if (h > 0) {
      return `${h.toString().padStart(2, "0")}:${m}:${s}`;
    }
    return `${m}:${s}`;
  };

  const getSupportedMimeType = () => {
    const types = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/mp4",
      "audio/wav",
    ];
    for (const t of types) {
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) {
        return t;
      }
    }
    return "";
  };

  const startRecording = async () => {
    setMicPermissionError(null);
    setLiveTranscript("");
    finalTranscriptRef.current = "";
    interimTranscriptRef.current = "";
    isRecordingRef.current = true;
    shouldRestartRecognitionRef.current = true;
    audioChunksRef.current = [];

    try {
      // 1. Get Microphone Stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      // 2. Setup Audio Visualizer (Web Audio API)
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioCtx;
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        analyserRef.current = analyser;

        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        const updateAudioVisual = () => {
          if (!analyserRef.current) return;
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);

          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
          animationFrameRef.current = requestAnimationFrame(updateAudioVisual);
        };
        updateAudioVisual();
      } catch (audioCtxErr) {
        console.warn("Web Audio Visualizer not supported:", audioCtxErr);
      }

      // 3. Setup MediaRecorder with 1-second chunks for optimal memory & long duration recording
      const mimeType = getSupportedMimeType();
      const options = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(1000);

      // 4. Setup Self-Restarting Continuous Live Speech Recognition (No 60-second limit!)
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const initRecognition = () => {
          try {
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = "pt-BR";
            recognition.maxAlternatives = 1;

            recognition.onresult = (event: any) => {
              let currentInterim = "";
              for (let i = event.resultIndex; i < event.results.length; i++) {
                const res = event.results[i];
                if (res.isFinal) {
                  const text = res[0].transcript.trim();
                  if (text) {
                    finalTranscriptRef.current += (finalTranscriptRef.current ? " " : "") + text;
                  }
                } else {
                  currentInterim += res[0].transcript + " ";
                }
              }
              interimTranscriptRef.current = currentInterim;
              const fullText = (finalTranscriptRef.current + " " + currentInterim).trim();
              setLiveTranscript(fullText);
            };

            recognition.onerror = (event: any) => {
              if (event.error !== "no-speech") {
                console.warn("Speech recognition notice:", event.error);
              }
            };

            recognition.onend = () => {
              // Chrome automatically disconnects after ~60s or on silence.
              // If recording is still active, immediately restart recognition seamlessly!
              if (isRecordingRef.current && shouldRestartRecognitionRef.current) {
                try {
                  recognition.start();
                } catch (e) {
                  setTimeout(() => {
                    if (isRecordingRef.current && shouldRestartRecognitionRef.current) {
                      initRecognition();
                    }
                  }, 200);
                }
              }
            };

            recognition.start();
            recognitionRef.current = recognition;
          } catch (recErr) {
            console.warn("Speech recognition start skipped:", recErr);
          }
        };

        initRecognition();
      }

      setIsRecording(true);
      setTime(0);
    } catch (err: any) {
      console.error("Microphone access error:", err);
      isRecordingRef.current = false;
      shouldRestartRecognitionRef.current = false;
      setMicPermissionError(
        "Não foi possível acessar o microfone. Verifique as permissões de áudio no seu navegador ou use a opção 'Enviar Arquivo de Áudio' abaixo."
      );
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    isRecordingRef.current = false;
    shouldRestartRecognitionRef.current = false;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
    }

    const currentDuration = time || 1;
    // Read directly from refs to avoid any React closure stale state
    const completeTranscript = (finalTranscriptRef.current + " " + interimTranscriptRef.current).trim();

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.requestData();
      } catch (e) {}

      mediaRecorderRef.current.onstop = () => {
        const mime = getSupportedMimeType() || "audio/webm";
        const audioBlob = new Blob(audioChunksRef.current, { type: mime });
        onComplete({
          audioBlob,
          liveTranscript: completeTranscript,
          duration: currentDuration,
          expand: expandMode,
        });
      };
      mediaRecorderRef.current.stop();
    } else {
      const mime = getSupportedMimeType() || "audio/webm";
      const audioBlob = audioChunksRef.current.length > 0 ? new Blob(audioChunksRef.current, { type: mime }) : null;
      onComplete({
        audioBlob,
        liveTranscript: completeTranscript,
        duration: currentDuration,
        expand: expandMode,
      });
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const handleProcessUploaded = () => {
    if (!uploadedFile) {
      toast.error("Selecione um arquivo de áudio primeiro.");
      return;
    }
    onComplete({
      audioBlob: uploadedFile,
      liveTranscript: "",
      duration: uploadedDuration || 1800,
      expand: expandMode,
    });
  };

  const handleProcessManualText = () => {
    if (!manualText.trim()) {
      toast.error("Digite ou cole as anotações da aula primeiro.");
      return;
    }
    onComplete({
      audioBlob: null,
      liveTranscript: manualText.trim(),
      duration: 30,
      expand: expandMode,
    });
  };

  return (
    <div className="bg-white dark:bg-[#1A1D27] rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center border border-gray-200 dark:border-[#2a2d3a] shadow-sm relative overflow-hidden">
      {/* Mode switcher */}
      <div className="flex bg-gray-100 dark:bg-[#0F1117] p-1 rounded-xl mb-6 self-center border border-gray-200 dark:border-[#2a2d3a]">
        <button
          type="button"
          onClick={() => setMode("mic")}
          className={cn(
            "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer",
            mode === "mic"
              ? "bg-white dark:bg-[#1A1D27] text-blue-600 dark:text-blue-400 shadow-sm"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          )}
        >
          <Mic size={14} />
          <span>Gravar Microfone</span>
        </button>
        <button
          type="button"
          onClick={() => setMode("upload")}
          className={cn(
            "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer",
            mode === "upload"
              ? "bg-white dark:bg-[#1A1D27] text-blue-600 dark:text-blue-400 shadow-sm"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          )}
        >
          <FileAudio size={14} />
          <span>Enviar Áudio / Vídeo (.mp4, .m4a, .mp3...)</span>
        </button>
        <button
          type="button"
          onClick={() => setMode("text")}
          className={cn(
            "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer",
            mode === "text"
              ? "bg-white dark:bg-[#1A1D27] text-blue-600 dark:text-blue-400 shadow-sm"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          )}
        >
          <FileText size={14} />
          <span>Colar Texto/Anotação</span>
        </button>
      </div>

      {/* MODE 1: MIC RECORDING */}
      {mode === "mic" && (
        <div className="w-full flex flex-col items-center">
          {micPermissionError && (
            <div className="mb-6 w-full max-w-md p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3 text-red-700 dark:text-red-300 text-xs sm:text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{micPermissionError}</span>
            </div>
          )}

          {/* Timer */}
          <div className="text-5xl font-mono font-light text-gray-800 dark:text-gray-100 mb-6 tracking-widest flex items-center gap-3">
            {isRecording && (
              <span className="w-3.5 h-3.5 rounded-full bg-red-500 animate-ping inline-block" />
            )}
            {formatTime(time)}
          </div>

          {/* Waveform */}
          {isRecording && (
            <div className="w-full max-w-md mb-8 flex flex-col items-center gap-3">
              <div className="flex items-center justify-center gap-1.5 h-14 w-full">
                {Array.from({ length: 24 }).map((_, i) => {
                  const variance = Math.sin((i + time * 3) * 0.8) * 20;
                  const barHeight = Math.max(12, Math.min(100, audioLevel * 1.5 + variance));
                  return (
                    <div
                      key={i}
                      className="w-2 bg-gradient-to-t from-red-500 to-rose-400 rounded-full transition-all duration-75"
                      style={{
                        height: `${barHeight}%`,
                        opacity: 0.4 + (audioLevel / 100) * 0.6,
                      }}
                    />
                  );
                })}
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <Volume2 className="w-4 h-4 text-red-500" />
                <span>Captação do microfone: {audioLevel}%</span>
              </div>
            </div>
          )}

          {/* Button */}
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
            className={cn(
              "w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg cursor-pointer",
              isRecording
                ? "bg-gray-100 dark:bg-gray-800 text-red-500 hover:scale-105 border-4 border-red-500 animate-pulse"
                : "bg-gradient-to-tr from-red-600 to-rose-500 text-white hover:scale-105 hover:shadow-xl hover:shadow-red-500/25",
              isProcessing && "opacity-50 cursor-not-allowed"
            )}
          >
            {isRecording ? (
              <Square className="w-8 h-8 fill-current" />
            ) : (
              <Mic className="w-10 h-10" />
            )}
          </button>

          <p className="mt-4 text-sm text-gray-600 dark:text-gray-300 font-medium">
            {isRecording
              ? "Gravando aula... Clique no botão para concluir e resumir"
              : "Clique no microfone para iniciar a gravação da aula"}
          </p>

          {/* Live Transcript / Notes */}
          {isRecording && (
            <div className="mt-6 w-full max-w-xl bg-gray-50 dark:bg-[#0F1117]/80 rounded-xl p-4 border border-gray-200 dark:border-[#2a2d3a]">
              <div className="flex items-center justify-between text-xs text-blue-600 dark:text-blue-400 font-semibold mb-2">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  Captação de voz ao vivo:
                </span>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 italic min-h-[35px] max-h-24 overflow-y-auto">
                {liveTranscript || "Ouvindo... O áudio completo será decodificado e resumido pela IA ao finalizar."}
              </p>
            </div>
          )}
        </div>
      )}

      {/* MODE 2: UPLOAD AUDIO / VIDEO FILE */}
      {mode === "upload" && (
        <div className="w-full max-w-md flex flex-col items-center text-center py-4">
          <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-4">
            <UploadCloud className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">
            Envie a gravação da aula (Áudio ou Vídeo)
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">
            Suporta MP4, M4A, MP3, WAV, AAC, WEBM, OGG, MOV, MKV, FLAC, WMA gravados em celular ou computador.
          </p>

          {uploadedFile ? (
            <div className="w-full p-4 bg-gray-50 dark:bg-[#0F1117] rounded-xl border border-gray-200 dark:border-[#2a2d3a] flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5 truncate">
                {uploadedFile.type.startsWith("video/") || uploadedFile.name.match(/\.(mp4|mov|mkv|m4v|avi)$/i) ? (
                  <Video className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                ) : (
                  <FileAudio className="w-5 h-5 text-blue-500 flex-shrink-0" />
                )}
                <div className="flex flex-col text-left truncate">
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                    {uploadedFile.name}
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-bold uppercase px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                      {uploadedFile.name.split(".").pop()?.toUpperCase() || "ARQUIVO"}
                    </span>
                    <span className="text-[11px] text-gray-400">
                      {(uploadedFile.size / (1024 * 1024)).toFixed(1)} MB
                    </span>
                    {uploadedDuration > 0 && (
                      <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                        {formatTime(uploadedDuration)} de áudio
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setUploadedFile(null);
                  setUploadedDuration(0);
                }}
                className="text-xs text-red-500 hover:underline flex-shrink-0 ml-2 font-medium"
              >
                Remover
              </button>
            </div>
          ) : (
            <label className="border-2 border-dashed border-gray-300 dark:border-[#2a2d3a] hover:border-blue-500 rounded-xl p-6 w-full cursor-pointer flex flex-col items-center mb-4 transition-colors group">
              <UploadCloud className="w-8 h-8 text-gray-400 group-hover:text-blue-500 mb-2 transition-colors" />
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                Clique para selecionar áudio ou vídeo da aula
              </span>
              <span className="text-[11px] text-gray-400 mt-1">
                MP4, M4A, MP3, WAV, MOV, WEBM, AAC, MKV e outros (qualquer duração)
              </span>
              <input
                type="file"
                accept="audio/*,video/*,.mp4,.m4a,.mp3,.wav,.webm,.ogg,.aac,.flac,.wma,.mov,.mkv,.m4v"
                className="hidden"
                onChange={async (e) => {
                  if (e.target.files && e.target.files[0]) {
                    const file = e.target.files[0];
                    setUploadedFile(file);
                    const dur = await getMediaDuration(file);
                    setUploadedDuration(dur);
                  }
                }}
              />
            </label>
          )}

          <button
            type="button"
            onClick={handleProcessUploaded}
            disabled={!uploadedFile || isProcessing}
            className={`w-full py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 cursor-pointer shadow-sm flex items-center justify-center gap-2 text-white ${
              expandMode
                ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-amber-500/20"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {expandMode ? <Zap className="w-4 h-4 fill-white" /> : <Sparkles className="w-4 h-4" />}
            <span>
              {isProcessing
                ? "Processando com IA..."
                : expandMode
                ? "Transcrever e Gerar Resumo & Mapa Expandidos"
                : "Transcrever e Resumir com IA"}
            </span>
          </button>
        </div>
      )}

      {/* MODE 3: TEXT NOTES */}
      {mode === "text" && (
        <div className="w-full max-w-lg flex flex-col">
          <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
            Cole ou digite a transcrição ou anotações da aula:
          </label>
          <textarea
            rows={5}
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            placeholder="Ex: O professor explicou sobre o sistema circulatório, abordando a diferença entre artérias e veias..."
            className="w-full p-3.5 bg-gray-50 dark:bg-[#0F1117] border border-gray-200 dark:border-[#2a2d3a] rounded-xl text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-4"
          />
          <button
            type="button"
            onClick={handleProcessManualText}
            disabled={!manualText.trim() || isProcessing}
            className={`py-3 px-6 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 cursor-pointer shadow-sm self-end flex items-center gap-2 text-white ${
              expandMode
                ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-amber-500/20"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {expandMode ? <Zap className="w-4 h-4 fill-white" /> : <Sparkles className="w-4 h-4" />}
            <span>
              {isProcessing
                ? "Gerando com IA..."
                : expandMode
                ? "Gerar Resumo & Mapa Mental Expandidos"
                : "Gerar Resumo e Mapa Mental"}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

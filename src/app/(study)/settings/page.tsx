"use client";

import {
  BrainCircuit,
  Database,
  Eye,
  Info,
  Key,
  Moon,
  Monitor,
  Sun,
  Trash,
  Save,
  CheckCircle2,
  Loader2,
  Download,
  Sparkles,
  ExternalLink,
  XCircle,
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/useAppStore";
import toast from "react-hot-toast";

export default function SettingsPage() {
  const { theme: currentTheme, setTheme: setGlobalTheme } = useAppStore();
  const [theme, setThemeState] = useState<string>("dark");
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [trashDays, setTrashDays] = useState(30);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [detectedProvider, setDetectedProvider] = useState<string>("Nenhuma Chave Configurada");

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          if (data.theme) {
            setThemeState(data.theme);
            setGlobalTheme(data.theme as any);
          }
          if (data.openaiApiKey && data.openaiApiKey.trim().length > 5) {
            const key = data.openaiApiKey.trim();
            setApiKey(key);
            if (key.startsWith("sk-")) {
              setDetectedProvider("OpenAI");
            } else {
              setDetectedProvider("Google Gemini (Gratuito)");
            }
          } else {
            setApiKey("");
            setDetectedProvider("Nenhuma Chave Configurada");
          }
          if (data.trashAutoDelete) {
            setTrashDays(data.trashAutoDelete);
          }
        }
      } catch (err) {
        console.error("Error loading settings:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, [setGlobalTheme]);

  const handleKeyChange = (val: string) => {
    const trimmed = val.trim();
    setApiKey(trimmed);

    if (!trimmed) {
      setDetectedProvider("Nenhuma Chave Configurada");
    } else if (trimmed.startsWith("sk-")) {
      setDetectedProvider("OpenAI");
    } else {
      setDetectedProvider("Google Gemini (Gratuito)");
    }
  };

  const handleClearKey = () => {
    setApiKey("");
    setDetectedProvider("Nenhuma Chave Configurada");
    toast.success("Campo da chave limpo. Clique em 'Salvar Alterações' para confirmar a remoção.");
  };

  const handleThemeChange = (newTheme: string) => {
    setThemeState(newTheme);
    setGlobalTheme(newTheme as any);
  };

  const handleTestKey = async () => {
    const keyToTest = apiKey.trim();
    if (!keyToTest || keyToTest.length < 5) {
      toast.error("Por favor, cole sua chave da API antes de testar.");
      return;
    }

    setIsTesting(true);
    try {
      const res = await fetch("/api/settings/test-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: keyToTest }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || `Conexão com ${data.provider} realizada com sucesso!`);
        await saveSettings(keyToTest);
      } else {
        toast.error(data.error || "Chave inválida ou sem permissão.", { duration: 6000 });
      }
    } catch (err) {
      toast.error("Erro ao testar chave. Verifique sua conexão com a internet.");
    } finally {
      setIsTesting(false);
    }
  };

  const saveSettings = async (keyToSave: string) => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          theme,
          openaiApiKey: keyToSave.trim(),
          trashAutoDelete: trashDays,
        }),
      });

      if (!res.ok) {
        throw new Error("Falha ao salvar configurações");
      }

      if (keyToSave.trim()) {
        toast.success("Chave de API salva e ativada com sucesso no MedSetup!");
      } else {
        toast.success("Configurações salvas (sem chave integrada).");
      }
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível salvar as configurações.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = () => saveSettings(apiKey);

  const handleExportData = () => {
    const dataToExport = {
      version: "1.0.0",
      exportDate: new Date().toISOString(),
      theme,
      trashDays,
    };

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `medsetup-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Backup exportado com sucesso!");
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8 pb-32">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
          Configurações
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Gerencie sua chave do Google Gemini gratuito, preferências e dados do MedSetup.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mr-3" />
          <span>Carregando configurações...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Inteligência Artificial */}
          <section className="bg-white dark:bg-[#1A1D27] rounded-2xl border border-gray-200 dark:border-[#2a2d3a] shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-[#2a2d3a] flex items-center justify-between bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-900/10 dark:to-purple-900/10">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h2 className="font-semibold text-gray-900 dark:text-white text-base">
                  Inteligência Artificial (Google Gemini Gratuito)
                </h2>
              </div>
              <span
                className={cn(
                  "text-xs px-2.5 py-1 rounded-full font-semibold",
                  apiKey
                    ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                )}
              >
                {detectedProvider}
              </span>
            </div>

            <div className="p-6 space-y-5">
              {/* Tutorial / Guia Rápido */}
              <div className="p-4 rounded-xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-blue-900 dark:text-blue-300">
                    <Sparkles size={16} className="text-blue-600" />
                    <span>Como obter sua chave gratuita do Google Gemini (1 minuto):</span>
                  </div>

                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-xs"
                  >
                    <span>Abrir Google AI Studio</span>
                    <ExternalLink size={12} />
                  </a>
                </div>

                <ol className="text-xs text-blue-950 dark:text-blue-200/90 space-y-1.5 list-decimal list-inside leading-relaxed">
                  <li>
                    Acesse o <strong>Google AI Studio</strong> no link acima e faça login com sua conta Google.
                  </li>
                  <li>
                    Clique no botão azul <strong>&quot;Create API key&quot;</strong> (Criar chave de API).
                  </li>
                  <li>
                    Copie a chave gerada.
                  </li>
                  <li>
                    Cole a chave no campo abaixo e clique em <strong>&quot;Testar Conexão com a IA&quot;</strong>.
                  </li>
                </ol>
              </div>

              {/* Input da Chave */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Sua Chave da API (API Key)
                  </label>
                  {apiKey && (
                    <button
                      type="button"
                      onClick={handleClearKey}
                      className="text-xs text-red-500 hover:text-red-700 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <XCircle size={13} />
                      <span>Limpar Chave</span>
                    </button>
                  )}
                </div>

                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-gray-400">
                    <Key className="w-4 h-4" />
                  </div>
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => handleKeyChange(e.target.value)}
                    placeholder="Cole sua chave aqui"
                    className="w-full pl-10 pr-28 py-3 bg-gray-50 dark:bg-[#0F1117] border border-gray-300 dark:border-[#2a2d3a] rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm transition-all"
                  />
                  <div className="absolute right-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
                    >
                      {showApiKey ? "Ocultar" : "Mostrar"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleTestKey}
                  disabled={isTesting || !apiKey}
                  className="inline-flex items-center gap-2 text-sm bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl transition-colors font-bold shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isTesting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Validando Chave no Google...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Testar Conexão com a IA</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>

          {/* Aparência */}
          <section className="bg-white dark:bg-[#1A1D27] rounded-2xl border border-gray-200 dark:border-[#2a2d3a] shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-[#2a2d3a] flex items-center gap-2 bg-gray-50 dark:bg-[#0F1117]/50">
              <Eye className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <h2 className="font-semibold text-gray-900 dark:text-white text-base">Aparência do Tema</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { id: "light", label: "Claro", icon: Sun },
                  { id: "dark", label: "Escuro", icon: Moon },
                  { id: "system", label: "Sistema", icon: Monitor },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleThemeChange(t.id)}
                    className={cn(
                      "flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer",
                      theme === t.id
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-semibold shadow-sm"
                        : "border-gray-200 dark:border-[#2a2d3a] hover:border-gray-300 dark:hover:border-gray-700 text-gray-600 dark:text-gray-400"
                    )}
                  >
                    <t.icon className="w-6 h-6" />
                    <span className="font-medium text-sm">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Lixeira */}
          <section className="bg-white dark:bg-[#1A1D27] rounded-2xl border border-gray-200 dark:border-[#2a2d3a] shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-[#2a2d3a] flex items-center gap-2 bg-gray-50 dark:bg-[#0F1117]/50">
              <Trash className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <h2 className="font-semibold text-gray-900 dark:text-white text-base">Lixeira</h2>
            </div>
            <div className="p-6 flex items-center justify-between gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white">
                  Exclusão Automática
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Número de dias antes de itens da lixeira serem apagados definitivamente.
                </p>
              </div>
              <input
                type="number"
                value={trashDays}
                onChange={(e) => setTrashDays(Math.max(1, Number(e.target.value) || 30))}
                min={1}
                max={90}
                className="w-20 py-2 px-3 bg-gray-50 dark:bg-[#0F1117] border border-gray-300 dark:border-[#2a2d3a] rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-center font-medium"
              />
            </div>
          </section>

          {/* Dados & Backup */}
          <section className="bg-white dark:bg-[#1A1D27] rounded-2xl border border-gray-200 dark:border-[#2a2d3a] shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-[#2a2d3a] flex items-center gap-2 bg-gray-50 dark:bg-[#0F1117]/50">
              <Database className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <h2 className="font-semibold text-gray-900 dark:text-white text-base">Backup & Dados</h2>
            </div>
            <div className="p-6 flex flex-col sm:flex-row gap-4">
              <button
                type="button"
                onClick={handleExportData}
                className="flex-1 flex items-center justify-center gap-2 bg-white dark:bg-[#1A1D27] border border-gray-300 dark:border-[#2a2d3a] hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 px-4 py-2.5 rounded-xl transition-colors font-medium text-sm cursor-pointer shadow-sm"
              >
                <Download className="w-4 h-4 text-blue-500" />
                <span>Exportar Backup (JSON)</span>
              </button>
            </div>
          </section>

          {/* Sobre */}
          <div className="p-4 flex items-center gap-2 text-gray-400 dark:text-gray-500 justify-center text-xs">
            <Info className="w-4 h-4" />
            <span>MedSetup — Plataforma de Estudos com IA • Versão 1.0.0</span>
          </div>
        </div>
      )}

      {/* Floating Save Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-[#1A1D27]/90 backdrop-blur-md border-t border-gray-200 dark:border-[#2a2d3a] z-30 flex justify-end">
        <div className="max-w-4xl mx-auto w-full flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl transition-colors font-medium shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Salvar Alterações</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { X, Plus, Trash2, Save, AlignLeft, Folder as FolderIcon, CheckCircle2 } from "lucide-react";
import { useAppStore, Question } from "@/stores/useAppStore";
import toast from "react-hot-toast";

interface QuestionEditorProps {
  isOpen: boolean;
  onClose: () => void;
  questionToEdit?: Question | null;
  defaultFolderId?: string | null;
}

export default function QuestionEditor({
  isOpen,
  onClose,
  questionToEdit,
  defaultFolderId,
}: QuestionEditorProps) {
  const { folders, addQuestion, updateQuestion } = useAppStore();

  const [type, setType] = useState("Múltipla Escolha");
  const [difficulty, setDifficulty] = useState("Médio");
  const [subject, setSubject] = useState("");
  const [targetFolderId, setTargetFolderId] = useState(defaultFolderId || "folder-geral");
  const [text, setText] = useState("");
  const [options, setOptions] = useState<string[]>(["", "", "", ""]);
  const [correctOption, setCorrectOption] = useState(0);
  const [tfAnswer, setTfAnswer] = useState<"V" | "F">("V");
  const [explanation, setExplanation] = useState("");

  useEffect(() => {
    if (questionToEdit) {
      setType(
        questionToEdit.type === "true_false" || questionToEdit.type === "V/F"
          ? "Verdadeiro ou Falso"
          : questionToEdit.type === "essay" || questionToEdit.type === "Dissertativa"
          ? "Dissertativa"
          : "Múltipla Escolha"
      );
      setDifficulty(
        questionToEdit.difficulty === "easy" || questionToEdit.difficulty === "Fácil"
          ? "Fácil"
          : questionToEdit.difficulty === "hard" || questionToEdit.difficulty === "Difícil"
          ? "Difícil"
          : "Médio"
      );
      setSubject(questionToEdit.subject || "");
      setTargetFolderId(questionToEdit.folderId || defaultFolderId || "folder-geral");
      setText(questionToEdit.text || "");
      setExplanation(questionToEdit.explanation || "");

      // Handle options
      if (questionToEdit.options && questionToEdit.options.length > 0) {
        const optionTexts = questionToEdit.options.map((o) => o.text);
        setOptions(optionTexts);

        // Figure out correctOption index from question.answer
        const ans = (questionToEdit.answer || "").toLowerCase();
        let foundIdx = questionToEdit.options.findIndex(
          (o) => o.id.toLowerCase() === ans || o.text.toLowerCase() === ans
        );
        if (foundIdx === -1 && ans.length === 1) {
          const charCode = ans.charCodeAt(0) - 97; // 'a' = 0
          if (charCode >= 0 && charCode < questionToEdit.options.length) {
            foundIdx = charCode;
          }
        }
        setCorrectOption(foundIdx >= 0 ? foundIdx : 0);
      } else {
        setOptions(["", "", "", ""]);
        setCorrectOption(0);
      }

      if (questionToEdit.answer?.toUpperCase() === "F" || questionToEdit.answer?.toLowerCase() === "falso") {
        setTfAnswer("F");
      } else {
        setTfAnswer("V");
      }
    } else {
      // Reset for new question
      setType("Múltipla Escolha");
      setDifficulty("Médio");
      setSubject("");
      setTargetFolderId(defaultFolderId || "folder-geral");
      setText("");
      setOptions(["", "", "", ""]);
      setCorrectOption(0);
      setTfAnswer("V");
      setExplanation("");
    }
  }, [questionToEdit, defaultFolderId, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!text.trim()) {
      toast.error("Por favor, digite o enunciado da questão.");
      return;
    }

    let finalAnswer = "";
    let finalOptions: Array<{ id: string; text: string }> = [];

    if (type === "Múltipla Escolha") {
      const validOptions = options.map((o) => o.trim()).filter(Boolean);
      if (validOptions.length < 2) {
        toast.error("Adicione pelo menos 2 alternativas preenchidas.");
        return;
      }

      finalOptions = validOptions.map((optText, idx) => ({
        id: String.fromCharCode(97 + idx), // 'a', 'b', 'c', ...
        text: optText,
      }));

      const safeCorrectIdx = Math.min(correctOption, finalOptions.length - 1);
      finalAnswer = finalOptions[safeCorrectIdx]?.id || "a";
    } else if (type === "Verdadeiro ou Falso") {
      finalAnswer = tfAnswer.toLowerCase();
      finalOptions = [
        { id: "v", text: "Verdadeiro" },
        { id: "f", text: "Falso" },
      ];
    } else {
      finalAnswer = "dissertativa";
      finalOptions = [];
    }

    if (questionToEdit) {
      const updated: Question = {
        ...questionToEdit,
        text: text.trim(),
        type,
        difficulty,
        subject: subject.trim() || undefined,
        folderId: targetFolderId || "folder-geral",
        options: finalOptions,
        answer: finalAnswer,
        explanation: explanation.trim() || undefined,
      };

      updateQuestion(updated);
      toast.success("Questão atualizada com sucesso!");
    } else {
      const newQuestion: Question = {
        id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        text: text.trim(),
        type,
        difficulty,
        subject: subject.trim() || "Geral",
        folderId: targetFolderId || "folder-geral",
        options: finalOptions,
        answer: finalAnswer,
        explanation: explanation.trim() || undefined,
        date: "Hoje",
        status: "unanswered",
        timesAnswered: 0,
        timesCorrect: 0,
        timesIncorrect: 0,
      };

      addQuestion(newQuestion);
      toast.success("Questão criada com sucesso!");
    }

    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto cursor-pointer"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-3xl flex-col max-h-[90vh] rounded-2xl bg-white shadow-2xl dark:bg-[#1A1D27] border border-gray-200 dark:border-[#2a2d3a] overflow-hidden my-auto cursor-default"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#2a2d3a] px-6 py-4 bg-gradient-to-r from-blue-50/50 via-indigo-50/30 to-transparent dark:from-blue-950/20 dark:via-indigo-950/10 dark:to-transparent">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              {questionToEdit ? "Editar Questão" : "Criar Nova Questão"}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {questionToEdit
                ? "Altere o enunciado, alternativas ou gabarito desta questão."
                : "Cadastre uma questão com gabarito e alternativas detalhadas."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Metadata Row */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Tipo
              </label>
              <select
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs sm:text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-[#2a2d3a] dark:bg-[#0F1117] dark:text-white cursor-pointer"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="Múltipla Escolha">Múltipla Escolha</option>
                <option value="Verdadeiro ou Falso">Verdadeiro ou Falso</option>
                <option value="Dissertativa">Dissertativa</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Dificuldade
              </label>
              <select
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs sm:text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-[#2a2d3a] dark:bg-[#0F1117] dark:text-white cursor-pointer"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
              >
                <option value="Fácil">Fácil</option>
                <option value="Médio">Médio</option>
                <option value="Difícil">Difícil</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <FolderIcon className="w-3.5 h-3.5 text-blue-500" />
                Pasta / Deck
              </label>
              <select
                value={targetFolderId}
                onChange={(e) => setTargetFolderId(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs sm:text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-[#2a2d3a] dark:bg-[#0F1117] dark:text-white cursor-pointer"
              >
                {folders
                  .filter((f) => f.type === "questions")
                  .map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Matéria / Assunto
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Ex: Cardiologia, Histologia..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs sm:text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-[#2a2d3a] dark:bg-[#0F1117] dark:text-white"
              />
            </div>
          </div>

          {/* Enunciado */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Enunciado da Questão
            </label>
            <textarea
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3.5 text-xs sm:text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-[#2a2d3a] dark:bg-[#0F1117] dark:text-white resize-none"
              placeholder="Digite aqui o texto da questão..."
            />
          </div>

          {/* Alternativas: Múltipla Escolha */}
          {type === "Múltipla Escolha" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Alternativas (Marque a opção correta)
                </label>
                <span className="text-[11px] text-gray-400">
                  {options.length} alternativas
                </span>
              </div>

              <div className="space-y-2.5">
                {options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="correct-option"
                      checked={correctOption === i}
                      onChange={() => setCorrectOption(i)}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      title="Marcar como correta"
                    />

                    <span
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold shrink-0 transition-colors",
                        correctOption === i
                          ? "bg-emerald-500 text-white shadow-xs"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
                      )}
                    >
                      {String.fromCharCode(65 + i)}
                    </span>

                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...options];
                        newOpts[i] = e.target.value;
                        setOptions(newOpts);
                      }}
                      className={cn(
                        "w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs sm:text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-[#2a2d3a] dark:bg-[#0F1117] dark:text-white",
                        correctOption === i &&
                          "border-emerald-500 bg-emerald-50/30 dark:border-emerald-700 dark:bg-emerald-950/20"
                      )}
                      placeholder={`Texto da alternativa ${String.fromCharCode(65 + i)}`}
                    />

                    {options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => {
                          const newOpts = options.filter((_, idx) => idx !== i);
                          setOptions(newOpts);
                          if (correctOption === i) setCorrectOption(0);
                          else if (correctOption > i) setCorrectOption(correctOption - 1);
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded-lg cursor-pointer"
                        title="Remover alternativa"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {options.length < 5 && (
                <button
                  type="button"
                  onClick={() => setOptions([...options, ""])}
                  className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 cursor-pointer pt-1"
                >
                  <Plus size={14} /> Adicionar alternativa ({String.fromCharCode(65 + options.length)})
                </button>
              )}
            </div>
          )}

          {/* Alternativas: Verdadeiro ou Falso */}
          {type === "Verdadeiro ou Falso" && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Gabarito (Resposta Correta)
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setTfAnswer("V")}
                  className={cn(
                    "flex-1 py-2.5 px-4 rounded-xl border text-xs sm:text-sm font-bold transition-all cursor-pointer text-center",
                    tfAnswer === "V"
                      ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-2xs"
                      : "border-gray-200 dark:border-[#2a2d3a] text-gray-600 dark:text-gray-400"
                  )}
                >
                  Verdadeiro (V)
                </button>
                <button
                  type="button"
                  onClick={() => setTfAnswer("F")}
                  className={cn(
                    "flex-1 py-2.5 px-4 rounded-xl border text-xs sm:text-sm font-bold transition-all cursor-pointer text-center",
                    tfAnswer === "F"
                      ? "bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-700 dark:text-rose-300 shadow-2xs"
                      : "border-gray-200 dark:border-[#2a2d3a] text-gray-600 dark:text-gray-400"
                  )}
                >
                  Falso (F)
                </button>
              </div>
            </div>
          )}

          {/* Explanation */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <AlignLeft size={14} /> Explicação / Justificativa do Gabarito (Opcional)
            </label>
            <textarea
              rows={3}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs sm:text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-[#2a2d3a] dark:bg-[#0F1117] dark:text-white resize-none"
              placeholder="Explique o motivo da alternativa estar correta para enriquecer o estudo..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-100 dark:border-[#2a2d3a] px-6 py-4 bg-gray-50/50 dark:bg-[#1A1D27]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-2 text-xs sm:text-sm font-bold text-white transition-colors shadow-sm cursor-pointer"
          >
            <Save size={16} />
            <span>{questionToEdit ? "Salvar Alterações" : "Salvar Questão"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

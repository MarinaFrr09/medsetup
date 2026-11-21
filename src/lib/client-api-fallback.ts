"use client";

import {
  calculateBalancedMindMapLayout,
  calculateFree4DLayout,
  DEFAULT_MINDMAP_PALETTE,
} from "@/lib/mindmap-layout";
import { cleanLatexAndBadges } from "@/lib/text-sanitize";
import { reduceExcessiveBulletsInTranscription } from "@/lib/rich-text-utils";
import { FAITHFUL_TRANSCRIPTION_RULES } from "@/lib/transcription-prompts";

function balanceQuestionsBrowser(questions: any[]): any[] {
  const letters = ["a", "b", "c", "d", "e"];
  return (questions || []).map((q, idx) => {
    if (!q || !Array.isArray(q.options) || q.options.length < 2 || q.type === "true_false" || q.type === "essay") {
      return q;
    }
    const rawAnswer = String(q.answer || q.correctOptionId || "a").toLowerCase().trim();
    const opts = q.options.map((o: any, i: number) => ({
      origId: String(o?.id || letters[i] || "a").toLowerCase().trim(),
      text: String(o?.text || o || "").replace(/^[A-Ea-e][).:\-]\s*/, "").trim(),
    }));
    const correctIdx = Math.max(
      0,
      opts.findIndex((o: any) => o.origId === rawAnswer || rawAnswer.startsWith(o.origId))
    );
    const correctText = opts[correctIdx]?.text || opts[0]?.text || "";
    const shuffled = shuffleArray(opts);
    const targetLetterIdx = idx % Math.min(letters.length, shuffled.length);
    const currentCorrectPos = shuffled.findIndex((o: any) => o.text === correctText);
    if (currentCorrectPos >= 0 && currentCorrectPos !== targetLetterIdx) {
      const tmp = shuffled[targetLetterIdx];
      shuffled[targetLetterIdx] = shuffled[currentCorrectPos];
      shuffled[currentCorrectPos] = tmp;
    }
    const newOptions = shuffled.map((o: any, i: number) => ({
      id: letters[i] || String(i),
      text: o.text,
    }));
    const newCorrectId = letters[targetLetterIdx] || "a";
    return {
      ...q,
      options: newOptions,
      answer: newCorrectId,
      correctOptionId: newCorrectId,
    };
  });
}

const SESSION_KEY_STORAGE = "medsetup_volatile_session_api_key";
const SESSION_SETTINGS_STORAGE = "medsetup_volatile_session_settings";

function getSessionApiKey(): string {
  if (typeof window === "undefined") return "";
  try {
    return (sessionStorage.getItem(SESSION_KEY_STORAGE) || "").trim();
  } catch {
    return "";
  }
}

function setSessionApiKey(key: string): void {
  if (typeof window === "undefined") return;
  try {
    const clean = (key || "").trim();
    if (!clean) {
      sessionStorage.removeItem(SESSION_KEY_STORAGE);
    } else {
      sessionStorage.setItem(SESSION_KEY_STORAGE, clean);
    }
  } catch {}
}

function getSessionSettings() {
  const rawKey = getSessionApiKey();
  const maskedKey = rawKey ? `${rawKey.slice(0, 6)}...${rawKey.slice(-4)}` : "";
  let extra: Record<string, any> = {};
  try {
    extra = JSON.parse(sessionStorage.getItem(SESSION_SETTINGS_STORAGE) || "{}");
  } catch {}
  return {
    id: 1,
    aiProvider: extra.aiProvider || "gemini",
    apiKey: maskedKey,
    hasApiKey: Boolean(rawKey),
    theme: extra.theme || "dark",
    pomodoroWork: extra.pomodoroWork ?? 25,
    pomodoroBreak: extra.pomodoroBreak ?? 5,
    pomodoroLongBreak: extra.pomodoroLongBreak ?? 15,
    studyGoalHours: extra.studyGoalHours ?? 4,
  };
}

async function callGeminiDirectBrowser(
  prompt: string,
  systemPrompt: string,
  jsonMode = false,
  inlineParts: Array<{ mimeType: string; data: string }> = [],
  temperature = 0.35
): Promise<string> {
  const apiKey = getSessionApiKey();
  if (!apiKey) {
    throw new Error(
      "Chave de API não configurada nesta sessão. Vá em Configurações (canto inferior esquerdo) e insira sua chave do Google Gemini."
    );
  }

  const models = ["gemini-2.5-flash", "gemini-flash-latest"];
  let lastError = "";

  for (const model of models) {
    try {
      const parts: any[] = [];
      for (const p of inlineParts) {
        if (p.data && p.mimeType) {
          parts.push({
            inlineData: {
              mimeType: p.mimeType,
              data: p.data,
            },
          });
        }
      }
      parts.push({ text: prompt });

      const body: any = {
        contents: [{ role: "user", parts }],
        generationConfig: {
          temperature,
          maxOutputTokens: model.includes("2.5") ? 65536 : 8192,
        },
      };
      if (systemPrompt) {
        body.systemInstruction = {
          parts: [{ text: systemPrompt }],
        };
      }
      if (jsonMode) {
        body.generationConfig.responseMimeType = "application/json";
      }

      const res = await window.origFetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
          apiKey
        )}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const msg = errData?.error?.message || `HTTP ${res.status}`;
        lastError = msg;

        // Retry without binary PDF if Gemini reports "The document has no pages"
        if (/document has no pages/i.test(msg) && inlineParts.length > 0) {
          const nonPdfParts = inlineParts.filter((p) => p.mimeType !== "application/pdf");
          if (nonPdfParts.length !== inlineParts.length) {
            return callGeminiDirectBrowser(prompt, systemPrompt, jsonMode, nonPdfParts, temperature);
          }
        }
        continue;
      }

      const data = await res.json();
      const text =
        data?.candidates?.[0]?.content?.parts
          ?.map((p: any) => p?.text || "")
          .join("") || "";
      if (text.trim()) {
        return text.trim();
      }
    } catch (e: any) {
      lastError = e?.message || String(e);
    }
  }

  throw new Error(`Erro na API do Google Gemini: ${lastError}`);
}

function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function parseJsonSafe(raw: string): any {
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const objMatch = cleaned.match(/\{[\s\S]*\}/);
    if (objMatch) {
      try {
        return JSON.parse(objMatch[0]);
      } catch {}
    }
    const arrMatch = cleaned.match(/\[[\s\S]*\]/);
    if (arrMatch) {
      try {
        return JSON.parse(arrMatch[0]);
      } catch {}
    }
    throw new Error("Não foi possível interpretar o JSON retornado pela IA. Tente novamente.");
  }
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = String(reader.result || "");
      const idx = res.indexOf(",");
      resolve(idx >= 0 ? res.slice(idx + 1) : res);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function inferMimeType(file: File): string {
  if (file.type && file.type !== "application/octet-stream") return file.type;
  const ext = (file.name || "").toLowerCase().split(".").pop() || "";
  if (ext === "pdf") return "application/pdf";
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "webp") return "image/webp";
  if (ext === "webm") return "audio/webm";
  if (ext === "mp3") return "audio/mp3";
  if (ext === "wav") return "audio/wav";
  if (ext === "m4a" || ext === "mp4") return "audio/mp4";
  if (ext === "txt" || ext === "md") return "text/plain";
  return "application/pdf";
}

function shuffleArray<T>(array: T[]): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

async function handleStaticApiRequest(
  rawPath: string,
  init?: RequestInit
): Promise<Response> {
  const cleanPath = rawPath.split("?")[0].replace(/\/+$/, "");
  const method = (init?.method || "GET").toUpperCase();

  // 1. /api/settings
  if (cleanPath.endsWith("/api/settings")) {
    if (method === "GET") {
      return jsonResponse({ settings: getSessionSettings() });
    }
    if (method === "POST") {
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      if (typeof body.apiKey === "string") {
        const trimmed = body.apiKey.trim();
        if (!trimmed) {
          setSessionApiKey("");
        } else if (!trimmed.includes("...")) {
          setSessionApiKey(trimmed);
        }
      }
      try {
        sessionStorage.setItem(
          SESSION_SETTINGS_STORAGE,
          JSON.stringify({
            aiProvider: body.aiProvider || "gemini",
            theme: body.theme || "dark",
            pomodoroWork: body.pomodoroWork ?? 25,
            pomodoroBreak: body.pomodoroBreak ?? 5,
            pomodoroLongBreak: body.pomodoroLongBreak ?? 15,
            studyGoalHours: body.studyGoalHours ?? 4,
          })
        );
      } catch {}
      return jsonResponse({
        settings: getSessionSettings(),
        message: "Configurações aplicadas na memória desta sessão!",
      });
    }
  }

  // 2. /api/settings/test-key
  if (cleanPath.endsWith("/api/settings/test-key")) {
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    const testKey =
      body.apiKey && !String(body.apiKey).includes("...")
        ? String(body.apiKey).trim()
        : getSessionApiKey();
    if (!testKey) {
      return jsonResponse(
        { success: false, error: "Insira uma chave de API para testar." },
        400
      );
    }
    setSessionApiKey(testKey);
    try {
      await callGeminiDirectBrowser("Responda apenas: OK", "Você é um assistente médico.");
      return jsonResponse({
        success: true,
        message: "Conexão com Google Gemini estabelecida com sucesso!",
      });
    } catch (err: any) {
      return jsonResponse(
        { success: false, error: err?.message || "Falha ao testar chave." },
        400
      );
    }
  }

  // 3. /api/upload
  if (cleanPath.endsWith("/api/upload")) {
    if (init?.body instanceof FormData) {
      const file = (init.body.get("file") || init.body.get("files")) as File | null;
      if (!file) {
        return jsonResponse({ error: "Nenhum arquivo enviado." }, 400);
      }
      const base64Data = await fileToBase64(file);
      const mimeType = inferMimeType(file);
      let extractedText = "";
      if (mimeType.startsWith("text/") || file.name.endsWith(".txt") || file.name.endsWith(".md")) {
        extractedText = await file.text();
      }
      return jsonResponse({
        url: `data:${mimeType};base64,${base64Data}`,
        name: file.name,
        size: file.size,
        mimeType,
        base64Data,
        data: base64Data,
        extractedText,
      });
    }
  }

  // Extract body & file attachments from either FormData or JSON for all /api/ai/* routes
  try {
    let body: Record<string, any> = {};
    const inlineParts: Array<{ mimeType: string; data: string; name?: string }> = [];
    const uploadedFilesMeta: Array<{ name: string; url: string; size: number; type: string }> = [];

    if (init?.body instanceof FormData) {
      const formData = init.body;
      formData.forEach((value, key) => {
        if (typeof value === "string") {
          if (body[key] !== undefined) {
            if (Array.isArray(body[key])) {
              body[key].push(value);
            } else {
              body[key] = [body[key], value];
            }
          } else {
            body[key] = value;
          }
        }
      });

      const fileKeys = ["files", "file", "image", "audio", "tutoriaFiles", "bookFiles"];
      const allFormFiles: File[] = [];
      for (const fk of fileKeys) {
        const items = formData.getAll(fk);
        for (const item of items) {
          if (item instanceof File && item.size > 0) {
            allFormFiles.push(item);
          }
        }
      }

      for (const file of allFormFiles) {
        const b64 = await fileToBase64(file);
        const mimeType = inferMimeType(file);
        inlineParts.push({
          mimeType,
          data: b64,
          name: file.name,
        });
        uploadedFilesMeta.push({
          name: file.name,
          url: mimeType.startsWith("image/") ? `data:${mimeType};base64,${b64}` : "",
          size: file.size,
          type: mimeType,
        });
      }
    } else if (typeof init?.body === "string" && init.body.trim()) {
      body = JSON.parse(init.body);
      const rawAtts = [
        ...(Array.isArray(body.fileAttachments) ? body.fileAttachments : []),
        ...(body.fileAttachment ? [body.fileAttachment] : []),
        ...(Array.isArray(body.attachments) ? body.attachments : []),
      ];
      for (const att of rawAtts) {
        const b64 = att?.data || att?.base64Data;
        const mime = att?.mimeType || "application/pdf";
        if (b64 && mime) {
          inlineParts.push({ mimeType: mime, data: b64, name: att?.name });
        }
      }
    }

    // 4. /api/ai/expand-text
    if (cleanPath.endsWith("/api/ai/expand-text")) {
      const action = body.action === "explain" ? "explain" : "expand";
      const sys =
        "Você é um professor titular de Medicina redigindo material técnico-científico objetivo. É proibido usar adjetivos subjetivos ('altamente', 'necessário', 'crucial', 'fundamental', 'essencial', 'importante'). Responda apenas com o texto técnico completo em português.";
      const prompt =
        action === "explain"
          ? `Explique de forma técnica, direta, objetiva e detalhada os mecanismos fisiopatológicos, farmacológicos e clínicos do seguinte trecho:\n\n"${body.text}"`
          : `Expanda tecnicamente com alto rigor científico, mecanismos celulares/moleculares, parâmetros quantitativos e repercussões clínicas o seguinte trecho:\n\n"${body.text}"`;
      const result = await callGeminiDirectBrowser(prompt, sys, false, inlineParts, 0.3);
      return jsonResponse({ result, action });
    }

    // 5. /api/ai/expand-mindmap-node
    if (cleanPath.endsWith("/api/ai/expand-mindmap-node")) {
      const sys =
        'Você é um professor de Medicina especialista em Mapas Mentais. Retorne APENAS um JSON válido com { "nodes": [ { "label": "...", "type": "subtopic" | "note", "icon": "..." } ] }.';
      const prompt = `Tópico central: "${body.mapTitle || "Estudo Médico"}". Nó pai: "${body.parentLabel || ""}". Nó selecionado: "${body.nodeLabel}". Ação: "${body.action || "expand"}". Gere 4 nós filhos objetivos, técnicos e específicos sobre "${body.nodeLabel}" no formato JSON { "nodes": [ { "label": "Texto técnico específico sobre o tema", "type": "subtopic", "icon": "🔬" } ] }.`;
      const raw = await callGeminiDirectBrowser(prompt, sys, true, inlineParts);
      const parsed = parseJsonSafe(raw);
      return jsonResponse({ nodes: parsed.nodes || [] });
    }

    // 6. /api/ai/generate-questions
    if (cleanPath.endsWith("/api/ai/generate-questions")) {
      const count = Math.min(30, Math.max(1, Number(body.count) || 10));
      const type = body.type || "multiple_choice";
      const difficulty = body.difficulty || "medium";
      const userTopic = body.prompt || body.topic || body.text || "Medicina";

      const sys = `Você é um professor titular de Medicina elaborando questões de residência médica (USP, UNICAMP, ENARE, Revalida).
Crie exatamente ${count} questões do tipo "${type}" com dificuldade "${difficulty}".
REGRA CRÍTICA DE PARIDADE: Todas as alternativas devem ter extensão equivalente (proibido a correta ser a mais longa).
PROIBIÇÃO ABSOLUTA DE METARREFERÊNCIAS: NUNCA mencione "na vinheta clínica", "no Caso #...", "na Pista X/5", "no caso apresentado", "segundo o texto", "conforme o documento" ou "no debriefing". Formule cada questão de forma 100% direta, independente e puramente sobre o conteúdo médico.
Responda APENAS em JSON válido neste formato:
{
  "questions": [
    {
      "question": "Enunciado clínico detalhado da questão",
      "type": "${type}",
      "difficulty": "${difficulty === "all" ? "medium" : difficulty}",
      "options": ${
        type === "multiple_choice"
          ? '[{"id": "a", "text": "Alternativa A"}, {"id": "b", "text": "Alternativa B"}, {"id": "c", "text": "Alternativa C"}, {"id": "d", "text": "Alternativa D"}, {"id": "e", "text": "Alternativa E"}]'
          : type === "true_false"
          ? '[{"id": "true", "text": "Verdadeiro"}, {"id": "false", "text": "Falso"}]'
          : "[]"
      },
      "answer": "${type === "multiple_choice" ? "a" : type === "true_false" ? "true" : "Resposta dissertativa padrão"}",
      "explanation": "Comentário completo explicando o gabarito e o erro de cada alternativa incorreta."
    }
  ]
}`;
      const prompt =
        inlineParts.length > 0
          ? `Elabore ${count} questões médicas rigorosamente baseadas nos documentos anexados. Foco adicional: "${userTopic}".`
          : `Elabore ${count} questões médicas sobre: "${userTopic}".`;
      const raw = await callGeminiDirectBrowser(prompt, sys, true, inlineParts, 0.45);
      const parsed = parseJsonSafe(raw);
      const list = Array.isArray(parsed?.questions)
        ? parsed.questions
        : Array.isArray(parsed)
        ? parsed
        : [];
      const balanced = balanceQuestionsBrowser(list);
      return jsonResponse({ questions: shuffleArray(balanced) });
    }

    // 7. /api/ai/generate-flashcards
    if (cleanPath.endsWith("/api/ai/generate-flashcards")) {
      const count = Math.min(40, Math.max(1, Number(body.count) || 15));
      const userTopic = body.prompt || body.topic || body.text || "Medicina";
      const sys = `Você é um professor de Medicina especialista em repetição espaçada (Anki).
Crie exatamente ${count} flashcards de alto rendimento.
PROIBIÇÃO ABSOLUTA DE METARREFERÊNCIAS: NUNCA mencione "na vinheta clínica", "no Caso #...", "na Pista X/5", "no caso apresentado", "segundo o texto", "conforme o documento" ou "no debriefing". Formule cada pergunta (front) de forma 100% direta, autossuficiente e puramente sobre o conteúdo médico em si.
Retorne APENAS JSON válido no formato:
{
  "flashcards": [
    {
      "front": "Pergunta direta e objetiva (frente)",
      "back": "Resposta técnica, precisa e explicativa (verso)"
    }
  ]
}`;
      const prompt =
        inlineParts.length > 0
          ? `Gere ${count} flashcards médicos cobrindo todos os conceitos essenciais dos documentos anexados. Foco: "${userTopic}".`
          : `Gere ${count} flashcards médicos sobre: "${userTopic}".`;
      const raw = await callGeminiDirectBrowser(prompt, sys, true, inlineParts);
      const parsed = parseJsonSafe(raw);
      const cards = Array.isArray(parsed?.flashcards) ? parsed.flashcards : [];
      return jsonResponse({ flashcards: shuffleArray(cards) });
    }

    // 8. /api/ai/generate-mindmap
    if (cleanPath.endsWith("/api/ai/generate-mindmap")) {
      const colorTheme = body.colorTheme || "blue";
      const layout = body.layout || "free";
      const expand = Boolean(body.expand);
      const userPromptText = body.prompt || body.topic || "";

      const palettes: Record<string, string[]> = {
        blue: ["#2563EB", "#0284C7", "#0D9488", "#38BDF8", "#6366F1"],
        green: ["#059669", "#10B981", "#14B8A6", "#84CC16", "#047857"],
        purple: ["#7C3AED", "#A855F7", "#EC4899", "#8B5CF6", "#C084FC"],
        amber: ["#D97706", "#F59E0B", "#EA580C", "#FB923C", "#F97316"],
        monochrome: ["#334155", "#475569", "#64748B", "#1E293B", "#0F172A"],
      };
      const palette = palettes[colorTheme] || DEFAULT_MINDMAP_PALETTE;

      const sys = `Você é um arquiteto especialista em Mapas Mentais Médicos.
Crie um mapa mental ${expand ? "EXPANDIDO (6 a 8 subtópicos de nível 2, cada um com 3 a 5 notas de nível 3)" : "completo (4 a 6 subtópicos de nível 2, cada um com 2 a 4 notas de nível 3)"}.
Responda APENAS em JSON válido com esta estrutura:
{
  "title": "Título Central do Mapa",
  "nodes": [
    { "id": "root", "label": "Tema Central", "type": "topic", "level": 1, "children": ["sub-1", "sub-2"] },
    { "id": "sub-1", "label": "Subtópico 1", "type": "subtopic", "level": 2, "children": ["detail-1-1"] },
    { "id": "detail-1-1", "label": "Conceito e mecanismo técnico", "type": "note", "level": 3, "children": [] }
  ]
}`;
      const prompt =
        inlineParts.length > 0
          ? `Crie um mapa mental completo baseado no(s) documento(s) anexado(s). ${userPromptText ? `Foco: "${userPromptText}".` : ""}`
          : `Crie um mapa mental médico completo sobre: "${userPromptText || "Medicina"}".`;

      const raw = await callGeminiDirectBrowser(prompt, sys, true, inlineParts);
      const result = parseJsonSafe(raw);
      const title =
        result?.title ||
        userPromptText ||
        (inlineParts[0]?.name ? inlineParts[0].name.replace(/\.[^/.]+$/, "") : "Mapa Mental");
      const rawNodes = Array.isArray(result?.nodes) ? result.nodes : [];
      const { nodes, edges } =
        layout === "free"
          ? calculateFree4DLayout(rawNodes, title, palette)
          : calculateBalancedMindMapLayout(rawNodes, title, palette);
      return jsonResponse({ title, nodes, edges });
    }

    // 9. /api/ai/generate-summary
    if (cleanPath.endsWith("/api/ai/generate-summary")) {
      const expand = Boolean(body.expand);
      const text = String(body.text || "");
      const sys = `Você é um professor catedrático de Medicina.
Organize e reescreva o material em Markdown estruturado com subtítulos (### e ####) e parágrafos técnicos fluidos, usando marcadores (* ) apenas para listas curtas. Não use LaTeX ($).
Responda OBRIGATORIAMENTE em JSON válido:
{
  "summary": "Texto completo em Markdown estruturado...",
  "keyPoints": ["Ponto-chave 1", "Ponto-chave 2", "Ponto-chave 3", "Ponto-chave 4"]
}`;
      const prompt = `${expand ? "Expanda com máximo aprofundamento fisiopatológico, farmacológico e clínico" : "Organize e sintetize com fidelidade"} o seguinte material:\n\n${text.slice(0, 50000)}`;
      const raw = await callGeminiDirectBrowser(prompt, sys, true, inlineParts);
      const parsed = parseJsonSafe(raw);
      const cleanSummary = reduceExcessiveBulletsInTranscription(
        cleanLatexAndBadges(String(parsed?.summary || ""))
      );
      return jsonResponse({
        summary: cleanSummary,
        keyPoints: Array.isArray(parsed?.keyPoints) ? parsed.keyPoints : [],
      });
    }

    // 10. /api/ai/transcribe-document
    if (cleanPath.endsWith("/api/ai/transcribe-document")) {
      const expand = body.expand === "true" || body.expand === true;
      const customPrompt = String(body.customPrompt || "");
      const sys = `${FAITHFUL_TRANSCRIPTION_RULES}
${
  expand
    ? "\nMODO EXPANDIDO ATIVADO: Aprofunde cada tópico com mecanismos fisiopatológicos, farmacológicos e correlações clínicas mantendo EXATAMENTE a mesma hierarquia limpa (##, ###, * **Termo:** e subtópicos recuados   * )."
    : ""
}
Responda OBRIGATORIAMENTE em JSON válido:
{
  "title": "Título do Documento (máximo 6 palavras)",
  "transcription": "Transcrição completa e estruturada em Markdown seguindo exatamente a hierarquia acima...",
  "summary": "Uma única frase neutra descrevendo o tema do material...",
  "keyPoints": ["Ponto-chave 1", "Ponto-chave 2", "Ponto-chave 3", "Ponto-chave 4"]
}`;
      const prompt = `Transcreva e estruture integralmente o documento anexado seguindo exatamente o modelo hierárquico (## tema principal + frase introdutória, ### subseções, * **Termo:** explicação fluida e subtópicos recuados   * ).${customPrompt ? ` Instruções adicionais: ${customPrompt}` : ""}`;
      const raw = await callGeminiDirectBrowser(prompt, sys, true, inlineParts, expand ? 0.3 : 0.15);
      const parsed = parseJsonSafe(raw);
      const cleanTrans = reduceExcessiveBulletsInTranscription(
        cleanLatexAndBadges(String(parsed?.transcription || parsed?.summary || ""))
      );
      return jsonResponse({
        title: parsed?.title || inlineParts[0]?.name?.replace(/\.[^/.]+$/, "") || "Transcrição Acadêmica",
        transcription: cleanTrans,
        summary: cleanLatexAndBadges(String(parsed?.summary || "")),
        keyPoints: Array.isArray(parsed?.keyPoints) ? parsed.keyPoints : [],
      });
    }

    // 11. /api/ai/generate-tutoria
    if (cleanPath.endsWith("/api/ai/generate-tutoria")) {
      const userNotes = String(body.userNotes || body.notes || "");
      const sys = `Você é um Professor Titular de Clínica Médica especialista em Tutoria Médica / PBL.
Analise o caso clínico/documento anexado e as anotações do estudante e resolva integralmente a Tutoria.
REGRAS OBRIGATÓRIAS:
1. "caseTranscription": Transcreva literalmente todas as palavras do caso clínico (incluindo OCR de imagens/PDFs).
2. "unknownTerms": Defina os termos desconhecidos presentes no documento/anotações.
3. "hypothesisAnalysis": Julgue as hipóteses diagnósticas ("Correta (Provável)" ou "Incorreta (Descartada)") com justificativa clínica.
4. "clinicalConclusion": Forneça "summary", "clinicalReasoning", "conductAndOutcome" e "differentialTable" (tabela Markdown completa comparando diagnósticos diferenciais).
5. "learningQuestions": Responda a TODOS os Objetivos/Questões de Aprendizagem do documento com profundidade de tratado médico (Contextualização, Bases Morfofuncionais, Fisiopatologia Celular/Molecular, Clínica, Propedêutica e Terapêutica Completa).
Responda OBRIGATORIAMENTE em JSON válido:
{
  "title": "Título Acadêmico do Caso Clínico",
  "caseTranscription": "Transcrição integral do caso clínico palavra por palavra",
  "unknownTerms": [ { "term": "Termo", "definition": "Definição médica completa" } ],
  "hypothesisAnalysis": [ { "hypothesis": "Hipótese", "judgment": "Correta (Provável)", "explanation": "Justificativa clínica" } ],
  "clinicalConclusion": {
    "summary": "Síntese diagnóstica",
    "clinicalReasoning": "Raciocínio clínico integrativo",
    "conductAndOutcome": "Conduta médica e terapêutica",
    "differentialTable": "| Patologia | Fisiopatologia | Achados Clínicos | Conduta |\\n| --- | --- | --- | --- |\\n| ... | ... | ... | ... |"
  },
  "learningQuestions": [
    {
      "question": "Enunciado do objetivo/questão de aprendizagem",
      "detailedAnswer": "Resposta teórica exaustiva e estruturada em Markdown com subtítulos (### e ####)"
    }
  ],
  "references": ["Harrison - Medicina Interna", "UpToDate"]
}`;
      const prompt = `Resolva integralmente a Tutoria Médica / PBL dos arquivos anexados.${userNotes ? `\n\nAnotações/Objetivos do estudante:\n${userNotes}` : ""}`;
      const raw = await callGeminiDirectBrowser(prompt, sys, true, inlineParts);
      const result = parseJsonSafe(raw);

      const parts: string[] = [];
      parts.push(`# ${result.title || "Resolução de Tutoria Clínica"}\n`);
      if (result.caseTranscription) {
        parts.push(`## Caso Clínico\n\n${result.caseTranscription}\n`);
      }
      if (Array.isArray(result.unknownTerms) && result.unknownTerms.length > 0) {
        parts.push(`## Termos e Palavras Desconhecidas\n`);
        for (const ut of result.unknownTerms) {
          parts.push(`* **${ut.term}**: ${ut.definition}`);
        }
        parts.push("");
      }
      if (Array.isArray(result.hypothesisAnalysis) && result.hypothesisAnalysis.length > 0) {
        parts.push(`## Hipóteses Diagnósticas\n`);
        for (const h of result.hypothesisAnalysis) {
          parts.push(`* **${h.hypothesis}** — *${h.judgment}*: ${h.explanation}`);
        }
        parts.push("");
      }
      if (result.clinicalConclusion) {
        parts.push(`## Conclusão do Caso Clínico\n`);
        if (result.clinicalConclusion.summary) {
          parts.push(`* **Síntese Diagnóstica**: ${result.clinicalConclusion.summary}`);
        }
        if (result.clinicalConclusion.clinicalReasoning) {
          parts.push(`* **Raciocínio Clínico**: ${result.clinicalConclusion.clinicalReasoning}`);
        }
        if (result.clinicalConclusion.conductAndOutcome) {
          parts.push(`* **Conduta e Manejo**: ${result.clinicalConclusion.conductAndOutcome}`);
        }
        if (result.clinicalConclusion.differentialTable) {
          parts.push(`\n### Quadro Comparativo de Diagnóstico Diferencial\n\n${result.clinicalConclusion.differentialTable}\n`);
        }
      }
      if (Array.isArray(result.learningQuestions) && result.learningQuestions.length > 0) {
        parts.push(`## Questões de Aprendizagem\n`);
        result.learningQuestions.forEach((lq: any, i: number) => {
          parts.push(`### Questão ${i + 1}: ${lq.question}\n\n${lq.detailedAnswer}\n`);
        });
      }

      return jsonResponse({
        title: result.title || "Resolução de Tutoria Clínica",
        caseTranscription: result.caseTranscription || "",
        unknownTerms: result.unknownTerms || [],
        hypothesisAnalysis: result.hypothesisAnalysis || [],
        clinicalConclusion: result.clinicalConclusion || {},
        learningQuestions: result.learningQuestions || [],
        references: result.references || [],
        markdownContent: cleanLatexAndBadges(parts.join("\n")),
        files: uploadedFilesMeta,
        selectedBookTitles: [],
        detailLevel: "detalhado",
      });
    }

    // 12. /api/ai/analyze-atelie
    if (cleanPath.endsWith("/api/ai/analyze-atelie")) {
      const notes = String(body.notes || "");
      const tutoriaText = String(body.tutoriaText || "");
      const hasTutoria = Boolean(tutoriaText.trim());
      const sys = `Você é um professor titular de Morfologia (Histologia, Anatomia e Patologia) e Clínica Médica especialista em Ateliê / Situação-Problema (SP).
Analise o roteiro da SP anexado e produza a resolução completa em JSON válido:
{
  "title": "Título curto da SP",
  "theme": "Tema central em uma frase",
  "summary": "Visão geral objetiva da SP",
  "detailedSummary": [
    {
      "topic": "Nome do Tópico",
      "subtopics": [
        {
          "title": "Nome do Subtópico",
          "content": "Frase introdutória.\\n* **Estrutura / Conceito:** descrição detalhada:\\n  * **Componente:** detalhe específico."
        }
      ]
    }
  ],
  "objectives": [ { "title": "Objetivo com verbo no infinitivo", "detail": "Fundamentação técnica direta" } ],
  "questions": [ { "number": 1, "area": "morfologia", "question": "Pergunta/atividade copiada do roteiro", "theme": "Assunto central", "answer": "Resposta aprofundada", "keyTerms": ["termo 1"] } ],
  "histology": [ { "structure": "Tecido/lâmina", "request": "Pedido do roteiro", "description": "Descrição microscópica", "features": ["característica 1"], "staining": "H&E", "clinicalRelevance": "Relevância clínica" } ],
  "anatomy": [ { "structure": "Estrutura anatômica", "request": "Pedido do roteiro", "description": "Descrição anatômica", "features": ["ponto 1"], "staining": "", "clinicalRelevance": "Relevância clínica" } ],
  "clinicalCases": [
    {
      "title": "Nome clínico limpo do caso",
      "summary": "Resumo clínico",
      "caseTranscription": "Transcrição literal exclusivamente clínica do caso",
      "answers": [ { "question": "Pergunta do caso", "theme": "Tema", "answer": "Resposta clínica aprofundada" } ],
      "resolvedTable": "",
      "diagnosticReasoning": "Raciocínio diagnóstico",
      "differentials": ["Diferencial 1"],
      "management": "Conduta médica"
    }
  ],
  "exams": [ { "name": "Nome do exame", "summary": "Resumo", "markers": [], "interpretation": "Interpretação", "correlation": "Correlação clínica" } ],
  "correlations": [ { "title": "Título da correlação", "text": "Integração morfofuncional e clínica" } ],
  "keyPoints": ["Ponto-chave 1", "Ponto-chave 2"],
  "glossary": [ { "term": "Termo", "definition": "Definição" } ],
  "tutoria": ${hasTutoria ? '{ "caseSummary": "...", "resolution": "...", "links": [] }' : "null"}
}`;
      const prompt = `Analise o roteiro da SP anexado e resolva todos os objetivos, perguntas, atividades práticas, histologia, anatomia, caso clínico e resumo teórico completo.${notes ? `\nInstruções do aluno: ${notes}` : ""}${tutoriaText ? `\nCaso da Tutoria: ${tutoriaText}` : ""}`;
      const raw = await callGeminiDirectBrowser(prompt, sys, true, inlineParts);
      const result = parseJsonSafe(raw);
      return jsonResponse({
        ...result,
        files: uploadedFilesMeta,
      });
    }

    // 13. /api/ai/generate-atelie-summary
    if (cleanPath.endsWith("/api/ai/generate-atelie-summary")) {
      const sys = `Você é um professor catedrático de Medicina elaborando um Resumo Teórico Completo para Ateliê / PBL.
Organize em 5 a 8 tópicos centrais, cada um com 2 a 4 subtópicos estruturados com tópicos e subtópicos de bolinhas.
Retorne APENAS JSON válido:
{
  "topics": [
    {
      "topic": "Nome do Tópico",
      "subtopics": [
        {
          "title": "Nome do Subtópico",
          "content": "Frase introdutória.\\n* **Estrutura 1:** descrição:\\n  * **Subitem A:** detalhe."
        }
      ]
    }
  ]
}`;
      const prompt = `TEMA DA SP: ${body.title || "Ateliê de Medicina"}\nSUBTEMA: ${body.theme || ""}\nRESUMO: ${body.summary || ""}\nCONTEXTO: ${String(body.contextText || "").slice(0, 25000)}`;
      const raw = await callGeminiDirectBrowser(prompt, sys, true, inlineParts);
      const parsed = parseJsonSafe(raw);
      return jsonResponse({ topics: parsed?.topics || parsed?.detailedSummary || [] });
    }

    // 14. /api/ai/generate-simulado
    if (cleanPath.endsWith("/api/ai/generate-simulado")) {
      const totalCount = Math.min(40, Math.max(1, Number(body.totalCount) || 10));
      const essayCount = Math.min(totalCount, Math.max(0, Number(body.essayCount) || 0));
      const mcCount = Math.max(0, totalCount - essayCount);
      const subject = String(body.subject || "Medicina");
      const userPromptText = String(body.prompt || subject || "Medicina");
      const durationMinutes = Number(body.durationMinutes) || 45;
      const hasTimer = body.hasTimer !== "false" && body.hasTimer !== false;

      const sys = `Você é uma banca examinadora de Medicina (estilo Simulado Anhembi / Residência Médica).
Elabore um simulado com exatamente ${totalCount} questões (${mcCount} de múltipla escolha com 5 alternativas A-E e ${essayCount} dissertativas).
Retorne APENAS JSON válido:
{
  "title": "Simulado — ${subject}",
  "questions": [
    {
      "number": 1,
      "type": "multiple_choice",
      "difficulty": "medium",
      "subject": "${subject}",
      "text": "Enunciado clínico detalhado da questão",
      "options": [
        { "id": "a", "text": "Alternativa A" },
        { "id": "b", "text": "Alternativa B" },
        { "id": "c", "text": "Alternativa C" },
        { "id": "d", "text": "Alternativa D" },
        { "id": "e", "text": "Alternativa E" }
      ],
      "correctOptionId": "a",
      "explanation": "Comentário detalhado da banca explicando o gabarito e os distratores."
    }
  ]
}`;
      const prompt =
        inlineParts.length > 0
          ? `Gere o simulado de ${totalCount} questões (${mcCount} múltipla escolha e ${essayCount} dissertativas) baseado nos documentos anexados. Foco: "${userPromptText}".`
          : `Gere o simulado de ${totalCount} questões (${mcCount} múltipla escolha e ${essayCount} dissertativas) sobre: "${userPromptText}".`;
      const raw = await callGeminiDirectBrowser(prompt, sys, true, inlineParts, 0.45);
      const parsed = parseJsonSafe(raw);
      const rawQs = Array.isArray(parsed?.questions) ? parsed.questions : [];
      const balanced = balanceQuestionsBrowser(rawQs);
      const formatted = shuffleArray(balanced).map((q: any, idx: number) => ({
        ...q,
        id: q.id || `q_${Date.now()}_${idx}`,
        number: idx + 1,
        type: q.type || "multiple_choice",
        text: q.text || q.question || "",
        correctOptionId: q.correctOptionId || q.answer || "a",
      }));

      return jsonResponse({
        id: Date.now().toString(),
        title: parsed?.title || `Simulado — ${subject}`,
        subject,
        date: new Date().toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        durationMinutes,
        hasTimer,
        timeSpentSeconds: 0,
        status: "in_progress",
        totalQuestions: formatted.length,
        essayCount: formatted.filter((q: any) => q.type === "essay").length,
        questions: formatted,
      });
    }

    // 15. /api/ai/grade-simulado-essay
    if (cleanPath.endsWith("/api/ai/grade-simulado-essay")) {
      const studentAnswer = String(body.studentAnswer || "").trim();
      if (!studentAnswer) {
        return jsonResponse({
          score: 0.0,
          feedback: "Questão deixada em branco pelo aluno.",
        });
      }
      const sys = `Você é um corretor de banca examinadora médica. Avalie a resposta dissertativa de 0.0 a 10.0 e forneça feedback detalhado em JSON: { "score": 8.5, "feedback": "..." }`;
      const prompt = `Enunciado: "${body.questionText}"\nEspelho Oficial: "${body.expectedAnswer}"\nResposta do Aluno: "${studentAnswer}"`;
      const raw = await callGeminiDirectBrowser(prompt, sys, true);
      const parsed = parseJsonSafe(raw);
      return jsonResponse({
        score: typeof parsed?.score === "number" ? parsed.score : 7.5,
        feedback: parsed?.feedback || "Avaliação concluída pela banca.",
      });
    }

    // 16. /api/ai/analyze-error
    if (cleanPath.endsWith("/api/ai/analyze-error")) {
      const sys = `Você é um preceptor médico especialista em engenharia reversa de erros em provas médicas.
Retorne APENAS JSON válido:
{
  "pontoCego": "O conceito específico que faltou ou foi confundido",
  "pegadinhaDistrator": "O que tornou a alternativa errada atraente",
  "gatilhoMemoria": "Regra de bolso curta (X -> Y) para nunca mais errar",
  "especialidade": "Grande área médica",
  "subtema": "Subtema específico",
  "causaErro": "conceitual",
  "referenciaFonte": "Simulado / Residência Médica"
}`;
      const prompt = `Analise o erro na questão:\nDisciplina: ${body.subject || "Medicina"}\nEnunciado: ${body.questionText}\nResposta marcada (errada): ${body.userAnswer}\nGabarito oficial: ${body.correctAnswer}\nExplicação: ${body.explanation || ""}`;
      const raw = await callGeminiDirectBrowser(prompt, sys, true);
      const parsed = parseJsonSafe(raw);
      return jsonResponse(parsed);
    }

    // 17. /api/ai/read-image
    if (cleanPath.endsWith("/api/ai/read-image")) {
      const mode = String(body.mode || "board");
      const expand = body.expand === "true" || body.expand === true;
      const imageUrl = uploadedFilesMeta[0]?.url;

      if (mode === "mindmap") {
        const sys = `Analise a imagem médica/acadêmica, expanda todas as siglas e gere um Mapa Mental estruturado em JSON:
{
  "title": "Título Central Extraído da Imagem",
  "summary": "Síntese explicativa do conteúdo da imagem",
  "nodes": [
    { "id": "root", "type": "topic", "label": "Tema Central", "color": "#2563EB", "children": ["a", "b"] },
    { "id": "a", "type": "subtopic", "label": "Ramo 1", "color": "#059669", "children": ["a1"] },
    { "id": "a1", "type": "note", "label": "Detalhe técnico completo", "color": "#059669", "children": [] }
  ]
}`;
        const raw = await callGeminiDirectBrowser(
          `Crie um mapa mental ${expand ? "EXPANDIDO" : "completo"} a partir da imagem anexada.`,
          sys,
          true,
          inlineParts
        );
        const result = parseJsonSafe(raw);
        const title = result?.title || "Mapa Mental da Imagem";
        const { nodes, edges } = calculateBalancedMindMapLayout(
          Array.isArray(result?.nodes) ? result.nodes : [],
          title
        );
        return jsonResponse({
          title,
          summary: result?.summary || "",
          nodes,
          edges,
          imageUrl,
        });
      }

      if (mode === "summary") {
        const sys = `Analise a imagem médica/acadêmica, expanda todas as siglas e gere um Resumo Didático Estruturado em JSON:
{
  "title": "Título Completo do Resumo",
  "summary": "Resumo completo em Markdown com tópicos (##), subtópicos (###), listas e caixas de destaque (> 💡 **Conceito-Chave:** ...)",
  "keyPoints": ["Ponto essencial 1", "Ponto essencial 2", "Ponto essencial 3"]
}`;
        const raw = await callGeminiDirectBrowser(
          `Transcreva e gere um resumo ${expand ? "EXPANDIDO e aprofundado" : "estruturado"} da imagem anexada.`,
          sys,
          true,
          inlineParts
        );
        const result = parseJsonSafe(raw);
        return jsonResponse({ ...result, imageUrl });
      }

      // mode === "board"
      const sys = `Analise a imagem de lousa/caderno/esquema médico, expanda todas as siglas e gere um Quadro Digital em JSON válido:
{
  "title": "TÍTULO PRINCIPAL DO QUADRO",
  "subtitle": "Subtítulo didático com escopo clínico",
  "themeStyle": "studygram_pastel",
  "columns": [
    {
      "id": "col_1",
      "title": "Coluna 1 - Conceitos Centrais",
      "clusters": [
        {
          "id": "cluster_1",
          "title": "Tópico Principal",
          "headerStyle": "highlighter_blue",
          "badgeNumber": "1º",
          "container": "card",
          "flowSteps": [
            {
              "text": "Conceito e mecanismo detalhado",
              "emphasis": "(Destaque clínico)",
              "arrow": "down",
              "bulletPoints": ["Detalhe 1", "Detalhe 2"]
            }
          ],
          "alertBox": {
            "type": "gold_rule",
            "title": "Regra de Ouro / Atenção Clínica",
            "content": "Síntese de alto rendimento para prova."
          }
        }
      ]
    }
  ]
}`;
      const raw = await callGeminiDirectBrowser(
        `Transforme a imagem anexada em um Quadro Digital estruturado ${expand ? "e EXPANDIDO com notas clínicas e tabelas" : "fiel ao conteúdo"}.`,
        sys,
        true,
        inlineParts
      );
      const result = parseJsonSafe(raw);
      return jsonResponse({ ...result, imageUrl });
    }

    // 18. /api/ai/transcribe (Gravação de Aula / Áudio)
    if (cleanPath.endsWith("/api/ai/transcribe")) {
      const transcriptText = String(body.transcriptText || "");
      const expand = body.expand === "true" || body.expand === true;
      const sys = `Você é um professor de Medicina especialista em transcrição e síntese de aulas gravadas.
Responda OBRIGATORIAMENTE em JSON válido:
{
  "title": "Título do Tema da Aula (máximo 5 palavras)",
  "cleanTranscript": "Transcrição integral limpa e organizada da aula",
  "summary": "Resumo completo e aprofundado da aula em Markdown estruturado (## SEÇÃO, ### Subtópico, * **Termo**: explicação)",
  "keyPoints": ["Ponto-chave 1", "Ponto-chave 2", "Ponto-chave 3", "Ponto-chave 4"],
  "topics": [
    { "title": "Nome do Tópico", "content": "Explicação detalhada do tópico abordado na aula" }
  ],
  "mindMap": {
    "title": "Tema Central",
    "nodes": [
      { "id": "1", "label": "Tema Central", "type": "topic", "color": "#3B82F6" },
      { "id": "2", "label": "Subtópico 1", "type": "subtopic", "color": "#10B981" }
    ],
    "edges": [
      { "id": "e1-2", "source": "1", "target": "2" }
    ]
  }
}`;
      const prompt = `Processe a gravação de aula anexada${transcriptText ? ` e a transcrição capturada:\n"""\n${transcriptText}\n"""` : ""} e gere a transcrição limpa, resumo ${expand ? "EXPANDIDO" : "completo"}, tópicos, pontos-chave e mapa mental.`;
      const raw = await callGeminiDirectBrowser(prompt, sys, true, inlineParts);
      const parsed = parseJsonSafe(raw);
      return jsonResponse(parsed);
    }

    // 19. /api/ai/generate-interactive-case (5-Clue Progressive Clinical Case, Drug, Exam, or Treatment Challenge)
    if (cleanPath.endsWith("/api/ai/generate-interactive-case")) {
      const rawMode = String(body.mode || "clinical");
      const mode =
        rawMode === "drug"
          ? "drug"
          : rawMode === "exam"
          ? "exam"
          : rawMode === "treatment"
          ? "treatment"
          : "clinical";
      const specialty = String(
        body.specialty || "Aleatória (Todas as Áreas da Medicina)"
      );
      const difficulty = String(
        body.difficulty || "Aleatório (Fácil a Difícil)"
      );
      const topic = String(body.topic || "");
      const materialContext = String(body.materialContext || "");
      const avoidRaw = body.avoidDiagnoses;
      const avoidDiagnoses: string[] = Array.isArray(avoidRaw)
        ? avoidRaw
        : typeof avoidRaw === "string" && avoidRaw.startsWith("[")
        ? (() => {
            try {
              return JSON.parse(avoidRaw);
            } catch {
              return [];
            }
          })()
        : [];

      const hasMaterial =
        materialContext.trim().length > 20 || inlineParts.length > 0;

      if (mode === "treatment") {
        const treatSys = `Você é um Professor Titular de Terapêutica Médica e Emergência criador de desafios para adivinhar o TRATAMENTO / CONDUTA padrão-ouro.
Responda OBRIGATORIAMENTE em JSON válido com esta estrutura exata:
{
  "treatmentName": "Nome Claro e Objetivo do Tratamento / Conduta em Português",
  "acceptedSynonyms": ["sinonimo", "sigla"],
  "specialty": "Especialidade",
  "difficulty": "Fácil | Médio | Difícil",
  "clues": [
    "Cenário clínico conciso (1-2 frases) que exige uma conduta terapêutica decisiva",
    "Pista 2/5: Sinais vitais, exame físico e critérios de gravidade",
    "Pista 3/5: Exames diagnósticos confirmando a indicação do tratamento",
    "Pista 4/5: Princípio terapêutico, via ou janela de tempo sem citar o nome literal",
    "Pista 5/5: Protocolo aproximado, monitoramento ou resposta esperada sem entregar o nome"
  ],
  "suggestedDistractors": ["Conduta 1", "Conduta 2", "Conduta 3", "Conduta 4", "Conduta 5", "Conduta 6"],
  "debriefing": {
    "overview": "Síntese terapêutica completa.",
    "clueBreakdown": ["Pista 1", "Pista 2", "Pista 3", "Pista 4", "Pista 5"],
    "differentials": [
      { "name": "Conduta Incorreta/Secundária A", "distinction": "Por que não é a 1ª escolha" },
      { "name": "Conduta Incorreta/Secundária B", "distinction": "Por que não é a 1ª escolha" }
    ],
    "protocolAndDoses": "Protocolo completo, doses exatas, via e monitoramento.",
    "pearls": ["Pérola 1", "Pérola 2", "Pérola 3"]
  }
}`;
        const treatPrompt = `Gere um Desafio de Tratamento / Conduta Médica em 5 Pistas Progressivas em JSON.
${
  hasMaterial
    ? `Escolha uma conduta terapêutica chave abordada no PDF/material anexado pelo estudante!`
    : `- Especialidade: ${specialty}\n- Dificuldade: ${difficulty}${
        topic ? `\n- Foco: ${topic}` : ""
      }${
        avoidDiagnoses.length > 0
          ? `\n- Não repita estes tratamentos: ${avoidDiagnoses.join(", ")}`
          : ""
      }`
}
${
  materialContext
    ? `\nCONTEÚDO DO PDF / MATERIAL:\n"""\n${materialContext.slice(0, 35000)}\n"""`
    : ""
}`;
        const rawTreat = await callGeminiDirectBrowser(
          treatPrompt,
          treatSys,
          true,
          inlineParts,
          0.45
        );
        const parsedTreat = parseJsonSafe(rawTreat);
        const now = new Date();
        const dateStr = `${String(now.getDate()).padStart(2, "0")}/${String(
          now.getMonth() + 1
        ).padStart(2, "0")}/${now.getFullYear()}`;
        const rawClues = Array.isArray(parsedTreat?.clues) ? parsedTreat.clues : [];
        return jsonResponse({
          id: `ptreat_${Date.now()}`,
          date: dateStr,
          treatmentName: String(
            parsedTreat?.treatmentName || "Conduta Terapêutica"
          ).trim(),
          acceptedSynonyms: Array.isArray(parsedTreat?.acceptedSynonyms)
            ? parsedTreat.acceptedSynonyms
            : [],
          specialty: String(parsedTreat?.specialty || specialty),
          difficulty:
            parsedTreat?.difficulty === "Fácil" ||
            parsedTreat?.difficulty === "Médio" ||
            parsedTreat?.difficulty === "Difícil"
              ? parsedTreat.difficulty
              : "Médio",
          clues: [
            String(rawClues[0] || "Cenário clínico inicial."),
            String(rawClues[1] || "Sinais vitais e exame físico."),
            String(rawClues[2] || "Exames confirmatórios."),
            String(rawClues[3] || "Princípio terapêutico."),
            String(rawClues[4] || "Protocolo e monitoramento."),
          ],
          suggestedDistractors: Array.isArray(parsedTreat?.suggestedDistractors)
            ? parsedTreat.suggestedDistractors
            : [],
          debriefing: {
            overview: String(parsedTreat?.debriefing?.overview || ""),
            clueBreakdown: [
              String(parsedTreat?.debriefing?.clueBreakdown?.[0] || ""),
              String(parsedTreat?.debriefing?.clueBreakdown?.[1] || ""),
              String(parsedTreat?.debriefing?.clueBreakdown?.[2] || ""),
              String(parsedTreat?.debriefing?.clueBreakdown?.[3] || ""),
              String(parsedTreat?.debriefing?.clueBreakdown?.[4] || ""),
            ],
            differentials: Array.isArray(parsedTreat?.debriefing?.differentials)
              ? parsedTreat.debriefing.differentials
              : [],
            protocolAndDoses: String(
              parsedTreat?.debriefing?.protocolAndDoses || ""
            ),
            pearls: Array.isArray(parsedTreat?.debriefing?.pearls)
              ? parsedTreat.debriefing.pearls
              : [],
          },
        });
      }

      if (mode === "exam") {
        const examSys = `Você é um Professor Titular de Propedêutica Médica, Radiologia e Medicina Diagnóstica criador de desafios de adivinhação do EXAME COMPLEMENTAR ideal.
Responda OBRIGATORIAMENTE em JSON válido com esta estrutura exata:
{
  "examName": "Nome Oficial do Exame Complementar em Português",
  "acceptedSynonyms": ["sigla", "sinonimo"],
  "examCategory": "Categoria (Imagem / Laboratorial / Funcional / Endoscopia / Biópsia)",
  "difficulty": "Fácil | Médio | Difícil",
  "clues": [
    "Cenário clínico conciso (1-2 frases) onde este exame é decisivo",
    "Pista 2/5: Achados clínicos que justificam pedir este exame agora",
    "Pista 3/5: Princípio técnico, contraste/preparo ou invasividade sem citar o nome do exame",
    "Pista 4/5: Achado clássico ou sinal patognomônico revelado pelo exame",
    "Pista 5/5: Papel padrão-ouro, metas de tempo ou contraindicações sem entregar o nome literal"
  ],
  "suggestedDistractors": ["Exame 1", "Exame 2", "Exame 3", "Exame 4", "Exame 5", "Exame 6"],
  "debriefing": {
    "overview": "Síntese diagnóstica completa sobre o exame.",
    "clueBreakdown": ["Pista 1", "Pista 2", "Pista 3", "Pista 4", "Pista 5"],
    "differentials": [
      { "name": "Exame Concorrente A", "distinction": "Como diferenciar a indicação" },
      { "name": "Exame Concorrente B", "distinction": "Como diferenciar a indicação" }
    ],
    "indicationsAndInterpretation": "Principais indicações, interpretação e contraindicações.",
    "pearls": ["Pérola 1", "Pérola 2", "Pérola 3"]
  }
}`;
        const examPrompt = `Gere um Desafio de Exame Complementar em 5 Pistas Progressivas em JSON.
${
  hasMaterial
    ? `Escolha um exame diagnóstico chave abordado no PDF/material anexado pelo estudante!`
    : `- Categoria/Área: ${specialty}\n- Dificuldade: ${difficulty}${
        topic ? `\n- Foco: ${topic}` : ""
      }${
        avoidDiagnoses.length > 0
          ? `\n- Não repita estes exames: ${avoidDiagnoses.join(", ")}`
          : ""
      }`
}
${
  materialContext
    ? `\nCONTEÚDO DO PDF / MATERIAL:\n"""\n${materialContext.slice(0, 35000)}\n"""`
    : ""
}`;
        const rawExam = await callGeminiDirectBrowser(
          examPrompt,
          examSys,
          true,
          inlineParts,
          0.45
        );
        const parsedExam = parseJsonSafe(rawExam);
        const now = new Date();
        const dateStr = `${String(now.getDate()).padStart(2, "0")}/${String(
          now.getMonth() + 1
        ).padStart(2, "0")}/${now.getFullYear()}`;
        const rawClues = Array.isArray(parsedExam?.clues) ? parsedExam.clues : [];
        return jsonResponse({
          id: `pexam_${Date.now()}`,
          date: dateStr,
          examName: String(parsedExam?.examName || "Exame Complementar").trim(),
          acceptedSynonyms: Array.isArray(parsedExam?.acceptedSynonyms)
            ? parsedExam.acceptedSynonyms
            : [],
          examCategory: String(parsedExam?.examCategory || specialty),
          difficulty:
            parsedExam?.difficulty === "Fácil" ||
            parsedExam?.difficulty === "Médio" ||
            parsedExam?.difficulty === "Difícil"
              ? parsedExam.difficulty
              : "Médio",
          clues: [
            String(rawClues[0] || "Cenário clínico inicial."),
            String(rawClues[1] || "Raciocínio clínico."),
            String(rawClues[2] || "Princípio técnico do exame."),
            String(rawClues[3] || "Achado clássico."),
            String(rawClues[4] || "Papel padrão-ouro e contraindicações."),
          ],
          suggestedDistractors: Array.isArray(parsedExam?.suggestedDistractors)
            ? parsedExam.suggestedDistractors
            : [],
          debriefing: {
            overview: String(parsedExam?.debriefing?.overview || ""),
            clueBreakdown: [
              String(parsedExam?.debriefing?.clueBreakdown?.[0] || ""),
              String(parsedExam?.debriefing?.clueBreakdown?.[1] || ""),
              String(parsedExam?.debriefing?.clueBreakdown?.[2] || ""),
              String(parsedExam?.debriefing?.clueBreakdown?.[3] || ""),
              String(parsedExam?.debriefing?.clueBreakdown?.[4] || ""),
            ],
            differentials: Array.isArray(parsedExam?.debriefing?.differentials)
              ? parsedExam.debriefing.differentials
              : [],
            indicationsAndInterpretation: String(
              parsedExam?.debriefing?.indicationsAndInterpretation || ""
            ),
            pearls: Array.isArray(parsedExam?.debriefing?.pearls)
              ? parsedExam.debriefing.pearls
              : [],
          },
        });
      }

      if (mode === "drug") {
        const drugSys = `Você é um Professor Titular de Farmacologia Clínica criador de desafios de adivinhação de medicamentos em 5 Pistas Progressivas.
Responda OBRIGATORIAMENTE em JSON válido com esta estrutura exata:
{
  "drugName": "Nome Genérico Oficial do Medicamento em Português",
  "acceptedSynonyms": ["nome comercial", "sinonimo"],
  "drugClass": "Classe Farmacológica",
  "difficulty": "Fácil | Médio | Difícil",
  "clues": [
    "Indicação clínica inicial concisa (1-2 frases) sem citar o nome do remédio",
    "Pista 2/5: Mecanismo de ação molecular/celular",
    "Pista 3/5: Farmacocinética (meia-vida, metabolismo, excreção, janela terapêutica)",
    "Pista 4/5: Efeitos adversos clássicos, toxicidades ou monitorização",
    "Pista 5/5: Contraindicações, interações marcantes, antídoto ou pérola final sem entregar o nome"
  ],
  "suggestedDistractors": ["Fármaco 1", "Fármaco 2", "Fármaco 3", "Fármaco 4", "Fármaco 5", "Fármaco 6"],
  "debriefing": {
    "overview": "Síntese farmacológica completa do medicamento.",
    "clueBreakdown": ["Pista 1", "Pista 2", "Pista 3", "Pista 4", "Pista 5"],
    "differentials": [
      { "name": "Fármaco Comparável A", "distinction": "Como diferenciar" },
      { "name": "Fármaco Comparável B", "distinction": "Como diferenciar" }
    ],
    "clinicalUseAndMonitoring": "Posologia prática, monitorização e antídoto.",
    "pearls": ["Pérola 1", "Pérola 2", "Pérola 3"]
  }
}`;
        const drugPrompt = `Gere um Desafio de Remédio em 5 Pistas Progressivas em JSON.
${
  hasMaterial
    ? `Escolha um medicamento relevante presente no PDF/material anexado pelo estudante!`
    : `- Sistema/Classe: ${specialty}\n- Dificuldade: ${difficulty}${
        topic ? `\n- Foco: ${topic}` : ""
      }${
        avoidDiagnoses.length > 0
          ? `\n- Não repita estes fármacos: ${avoidDiagnoses.join(", ")}`
          : ""
      }`
}
${
  materialContext
    ? `\nCONTEÚDO DO PDF / MATERIAL:\n"""\n${materialContext.slice(0, 35000)}\n"""`
    : ""
}`;
        const rawDrug = await callGeminiDirectBrowser(
          drugPrompt,
          drugSys,
          true,
          inlineParts,
          0.45
        );
        const parsedDrug = parseJsonSafe(rawDrug);
        const now = new Date();
        const dateStr = `${String(now.getDate()).padStart(2, "0")}/${String(
          now.getMonth() + 1
        ).padStart(2, "0")}/${now.getFullYear()}`;
        const rawClues = Array.isArray(parsedDrug?.clues) ? parsedDrug.clues : [];
        return jsonResponse({
          id: `pdrug_${Date.now()}`,
          date: dateStr,
          drugName: String(parsedDrug?.drugName || "Medicamento").trim(),
          acceptedSynonyms: Array.isArray(parsedDrug?.acceptedSynonyms)
            ? parsedDrug.acceptedSynonyms
            : [],
          drugClass: String(parsedDrug?.drugClass || specialty),
          difficulty:
            parsedDrug?.difficulty === "Fácil" ||
            parsedDrug?.difficulty === "Médio" ||
            parsedDrug?.difficulty === "Difícil"
              ? parsedDrug.difficulty
              : "Médio",
          clues: [
            String(rawClues[0] || "Indicação clínica inicial."),
            String(rawClues[1] || "Mecanismo de ação."),
            String(rawClues[2] || "Farmacocinética."),
            String(rawClues[3] || "Efeitos adversos."),
            String(rawClues[4] || "Contraindicações, interações e antídoto."),
          ],
          suggestedDistractors: Array.isArray(parsedDrug?.suggestedDistractors)
            ? parsedDrug.suggestedDistractors
            : [],
          debriefing: {
            overview: String(parsedDrug?.debriefing?.overview || ""),
            clueBreakdown: [
              String(parsedDrug?.debriefing?.clueBreakdown?.[0] || ""),
              String(parsedDrug?.debriefing?.clueBreakdown?.[1] || ""),
              String(parsedDrug?.debriefing?.clueBreakdown?.[2] || ""),
              String(parsedDrug?.debriefing?.clueBreakdown?.[3] || ""),
              String(parsedDrug?.debriefing?.clueBreakdown?.[4] || ""),
            ],
            differentials: Array.isArray(parsedDrug?.debriefing?.differentials)
              ? parsedDrug.debriefing.differentials
              : [],
            clinicalUseAndMonitoring: String(
              parsedDrug?.debriefing?.clinicalUseAndMonitoring || ""
            ),
            pearls: Array.isArray(parsedDrug?.debriefing?.pearls)
              ? parsedDrug.debriefing.pearls
              : [],
          },
        });
      }

      const sys = `Você é um Professor Titular de Medicina criador de desafios diagnósticos baseados em 5 Pistas Progressivas.
Crie um CASO CLÍNICO PONTUAL DE DIAGNÓSTICO EM 5 PISTAS PROGRESSIVAS com debriefing completo ao final.
Responda OBRIGATORIAMENTE em JSON válido com esta estrutura exata:
{
  "diagnosis": "Nome Oficial e Conciso do Diagnóstico (ex: 'Acidente crotálico', 'Dissecção aguda de aorta')",
  "acceptedSynonyms": ["sinonimo 1", "sinonimo 2"],
  "specialty": "Área da Medicina",
  "difficulty": "Fácil | Médio | Difícil",
  "clues": [
    "Vinheta clínica: apresentação inicial concisa em 1 a 2 frases (idade, sexo, contexto de atendimento e queixa principal com tempo de evolução)",
    "Pista 2/5: HDA detalhada, história da exposição, início e progressão dos sintomas, sem citar o nome da doença",
    "Pista 3/5: Sinais vitais e achados do exame físico direcionado com sinais semiológicos clássicos",
    "Pista 4/5: Exames laboratoriais/complementares com valores numéricos e valores de referência entre parênteses",
    "Pista 5/5: Conduta terapêutica específica instituída e evolução clínica sem entregar o nome literal do diagnóstico"
  ],
  "suggestedDistractors": [
    "Diagnóstico Diferencial 1",
    "Diagnóstico Diferencial 2",
    "Diagnóstico Diferencial 3",
    "Diagnóstico Diferencial 4",
    "Diagnóstico Diferencial 5",
    "Diagnóstico Diferencial 6"
  ],
  "debriefing": {
    "overview": "Explicação fisiopatológica e clínica completa da doença e do caso.",
    "clueBreakdown": [
      "Explicação detalhada do que a Vinheta clínica indicava",
      "Explicação detalhada dos achados da Pista 2/5",
      "Explicação detalhada dos sinais físicos da Pista 3/5",
      "Explicação detalhada dos exames complementares da Pista 4/5",
      "Explicação detalhada da conduta e desfecho da Pista 5/5"
    ],
    "differentials": [
      {
        "name": "Diagnóstico Diferencial A",
        "distinction": "Por que se assemelha ao caso e como descartá-lo"
      },
      {
        "name": "Diagnóstico Diferencial B",
        "distinction": "Por que se assemelha ao caso e como descartá-lo"
      }
    ],
    "management": "Conduta médica padrão-ouro detalhada (medidas imediatas, fármacos, doses, antídotos ou cirurgia e monitoramento).",
    "pearls": [
      "Pérola clínica de alto rendimento 1",
      "Pérola clínica de alto rendimento 2",
      "Pérola clínica de alto rendimento 3"
    ]
  }
}`;

      const prompt = `Gere um Caso Clínico Pontual Interativo de 5 Pistas Progressivas em JSON.
${
  hasMaterial
    ? `Baseie o caso clínico DIRETAMENTE no documento/PDF anexado pelo estudante!`
    : `- Área/Especialidade: ${specialty}\n- Dificuldade: ${difficulty}${
        topic ? `\n- Tema sugerido: ${topic}` : ""
      }${
        avoidDiagnoses.length > 0
          ? `\n- Não repita estes diagnósticos: ${avoidDiagnoses.join(", ")}`
          : ""
      }`
}
${
  materialContext
    ? `\nCONTEÚDO DO PDF / MATERIAL:\n"""\n${materialContext.slice(0, 35000)}\n"""`
    : ""
}`;

      const raw = await callGeminiDirectBrowser(
        prompt,
        sys,
        true,
        inlineParts,
        0.45
      );
      const parsed = parseJsonSafe(raw);
      const now = new Date();
      const dateStr = `${String(now.getDate()).padStart(2, "0")}/${String(
        now.getMonth() + 1
      ).padStart(2, "0")}/${now.getFullYear()}`;
      const rawClues = Array.isArray(parsed?.clues) ? parsed.clues : [];
      return jsonResponse({
        id: `pcase_${Date.now()}`,
        caseNumber: Math.floor(220 + Math.random() * 780),
        date: dateStr,
        diagnosis: String(parsed?.diagnosis || "Diagnóstico Clínico").trim(),
        acceptedSynonyms: Array.isArray(parsed?.acceptedSynonyms)
          ? parsed.acceptedSynonyms
          : [],
        specialty: String(parsed?.specialty || specialty),
        difficulty:
          parsed?.difficulty === "Fácil" ||
          parsed?.difficulty === "Médio" ||
          parsed?.difficulty === "Difícil"
            ? parsed.difficulty
            : "Médio",
        clues: [
          String(rawClues[0] || "Vinheta clínica inicial."),
          String(rawClues[1] || "História clínica detalhada."),
          String(rawClues[2] || "Exame físico direcionado."),
          String(rawClues[3] || "Exames complementares com valores de referência."),
          String(rawClues[4] || "Conduta instituída e evolução clínica."),
        ],
        suggestedDistractors: Array.isArray(parsed?.suggestedDistractors)
          ? parsed.suggestedDistractors
          : [],
        debriefing: {
          overview: String(parsed?.debriefing?.overview || ""),
          clueBreakdown: [
            String(parsed?.debriefing?.clueBreakdown?.[0] || ""),
            String(parsed?.debriefing?.clueBreakdown?.[1] || ""),
            String(parsed?.debriefing?.clueBreakdown?.[2] || ""),
            String(parsed?.debriefing?.clueBreakdown?.[3] || ""),
            String(parsed?.debriefing?.clueBreakdown?.[4] || ""),
          ],
          differentials: Array.isArray(parsed?.debriefing?.differentials)
            ? parsed.debriefing.differentials
            : [],
          management: String(parsed?.debriefing?.management || ""),
          pearls: Array.isArray(parsed?.debriefing?.pearls)
            ? parsed.debriefing.pearls
            : [],
        },
      });
    }

    // Generic fallback for any future /api/ai/* route
    if (cleanPath.includes("/api/ai/")) {
      const sys =
        "Você é um professor titular de Medicina. Responda em português com rigor técnico e científico.";
      const text = await callGeminiDirectBrowser(
        JSON.stringify(body) || "Analise o documento anexado.",
        sys,
        false,
        inlineParts
      );
      return jsonResponse({
        result: text,
        summary: text,
        transcription: text,
        content: text,
      });
    }
  } catch (err: any) {
    return jsonResponse(
      { error: err?.message || "Erro ao processar requisição com IA." },
      500
    );
  }

  return jsonResponse({ error: `Rota não encontrada: ${cleanPath}` }, 404);
}

declare global {
  interface Window {
    origFetch: typeof fetch;
    __medsetupFetchInstalled?: boolean;
  }
}

export function installClientApiInterceptor() {
  if (typeof window === "undefined" || window.__medsetupFetchInstalled) return;
  window.__medsetupFetchInstalled = true;
  window.origFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const urlStr =
      typeof input === "string"
        ? input
        : input instanceof URL
        ? input.toString()
        : input.url;

    const isApiCall =
      urlStr.startsWith("/api/") ||
      urlStr.startsWith("/medsetup/api/") ||
      urlStr.includes("/api/settings") ||
      urlStr.includes("/api/ai/") ||
      urlStr.includes("/api/upload");

    // Always mirror API key changes to sessionStorage so volatile session memory works everywhere
    if (isApiCall && urlStr.includes("/api/settings") && init?.method?.toUpperCase() === "POST") {
      try {
        const body = init?.body ? JSON.parse(String(init.body)) : {};
        if (typeof body.apiKey === "string") {
          const trimmed = body.apiKey.trim();
          if (!trimmed) {
            setSessionApiKey("");
          } else if (!trimmed.includes("...")) {
            setSessionApiKey(trimmed);
          }
        }
      } catch {}
    }

    const isStaticHost =
      window.location.hostname.endsWith("github.io") ||
      window.location.protocol === "file:";

    if (isApiCall && isStaticHost) {
      return handleStaticApiRequest(urlStr, init);
    }

    // On localhost, if sessionStorage holds the active session key, ensure the server process has it
    if (isApiCall && urlStr.includes("/api/ai/")) {
      const localKey = getSessionApiKey();
      if (localKey) {
        try {
          await window.origFetch("/api/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ apiKey: localKey }),
          });
        } catch {}
      }
    }

    try {
      const response = await window.origFetch(input, init);
      if (isApiCall && (response.status === 404 || response.status === 405)) {
        return handleStaticApiRequest(urlStr, init);
      }
      return response;
    } catch (err) {
      if (isApiCall) {
        return handleStaticApiRequest(urlStr, init);
      }
      throw err;
    }
  };
}

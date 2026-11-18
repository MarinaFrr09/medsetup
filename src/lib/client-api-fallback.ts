"use client";

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
  inlineParts: Array<{ mimeType: string; data: string }> = []
): Promise<string> {
  const apiKey = getSessionApiKey();
  if (!apiKey) {
    throw new Error(
      "Chave de API não configurada nesta sessão. Vá em Configurações e insira sua chave do Google Gemini."
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
          temperature: 0.35,
          maxOutputTokens: model.includes("2.5") ? 32768 : 8192,
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
        lastError = errData?.error?.message || `HTTP ${res.status}`;
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
      return JSON.parse(objMatch[0]);
    }
    const arrMatch = cleaned.match(/\[[\s\S]*\]/);
    if (arrMatch) {
      return JSON.parse(arrMatch[0]);
    }
    throw new Error("Não foi possível interpretar o JSON retornado pela IA.");
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

async function handleStaticApiRequest(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const method = (init?.method || "GET").toUpperCase();

  if (path.endsWith("/api/settings")) {
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

  if (path.endsWith("/api/settings/test-key")) {
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

  if (path.endsWith("/api/upload")) {
    if (init?.body instanceof FormData) {
      const file = init.body.get("file") as File | null;
      if (!file) {
        return jsonResponse({ error: "Nenhum arquivo enviado." }, 400);
      }
      const base64Data = await fileToBase64(file);
      const mimeType = file.type || (file.name.endsWith(".pdf") ? "application/pdf" : "text/plain");
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
        extractedText,
      });
    }
  }

  // Handle AI Endpoints
  try {
    let body: any = {};
    const inlineParts: Array<{ mimeType: string; data: string }> = [];

    if (init?.body instanceof FormData) {
      const formData = init.body;
      formData.forEach((value, key) => {
        if (typeof value === "string") {
          body[key] = value;
        }
      });
      const files = formData.getAll("files").concat(formData.getAll("file"));
      for (const item of files) {
        if (item instanceof File && item.size > 0) {
          const b64 = await fileToBase64(item);
          inlineParts.push({
            mimeType: item.type || (item.name.endsWith(".pdf") ? "application/pdf" : "image/png"),
            data: b64,
          });
        }
      }
    } else if (typeof init?.body === "string" && init.body.trim()) {
      body = JSON.parse(init.body);
      if (Array.isArray(body.attachments)) {
        for (const att of body.attachments) {
          if (att?.base64Data && att?.mimeType) {
            inlineParts.push({ mimeType: att.mimeType, data: att.base64Data });
          }
        }
      }
    }

    if (path.endsWith("/api/ai/expand-text")) {
      const action = body.action === "explain" ? "explain" : "expand";
      const sys =
        "Você é um professor titular de Medicina redigindo material técnico-científico objetivo. É proibido usar adjetivos subjetivos ('altamente', 'necessário', 'crucial', 'fundamental', 'essencial'). Responda apenas com o texto técnico completo em português.";
      const prompt =
        action === "explain"
          ? `Explique de forma técnica, direta, objetiva e detalhada os mecanismos fisiopatológicos, farmacológicos e clínicos do seguinte trecho:\n\n"${body.text}"`
          : `Expanda tecnicamente com alto rigor científico, mecanismos celulares/moleculares, parâmetros quantitativos e repercussões clínicas o seguinte trecho:\n\n"${body.text}"`;
      const result = await callGeminiDirectBrowser(prompt, sys, false, inlineParts);
      return jsonResponse({ result, action });
    }

    if (path.endsWith("/api/ai/expand-mindmap-node")) {
      const sys =
        "Você é um professor de Medicina especialista em Mapas Mentais. Retorne APENAS um JSON válido com { \"nodes\": [ { \"label\": \"...\", \"type\": \"subtopic\" | \"note\", \"icon\": \"...\" } ] }.";
      const prompt = `Tópico central: "${body.mapTitle || "Estudo Médico"}". Nó selecionado: "${body.nodeLabel}". Ação: "${body.action || "expand"}". Gere 4 nós filhos objetivos e específicos sobre "${body.nodeLabel}" no formato JSON { "nodes": [ { "label": "Texto específico sobre o tema", "type": "subtopic", "icon": "🔬" } ] }.`;
      const raw = await callGeminiDirectBrowser(prompt, sys, true, inlineParts);
      const parsed = parseJsonSafe(raw);
      return jsonResponse({ nodes: parsed.nodes || [] });
    }

    if (path.endsWith("/api/ai/generate-questions")) {
      const count = Number(body.count) || 5;
      const sys =
        "Você é um professor titular de Medicina elaborando questões de residência médica. Retorne APENAS JSON válido no formato { \"questions\": [ { \"question\": \"...\", \"type\": \"multiple_choice\", \"difficulty\": \"medium\", \"options\": [\"A) ...\", \"B) ...\", \"C) ...\", \"D) ...\"], \"correctAnswer\": \"A) ...\", \"explanation\": \"...\" } ] }.";
      const prompt = `Gere ${count} questões médicas detalhadas sobre o tema/conteúdo: "${body.topic || body.text || body.context || "Medicina"}". Dificuldade: ${body.difficulty || "medium"}. Tipo: ${body.type || "multiple_choice"}.`;
      const raw = await callGeminiDirectBrowser(prompt, sys, true, inlineParts);
      const parsed = parseJsonSafe(raw);
      return jsonResponse({ questions: parsed.questions || parsed || [] });
    }

    if (path.endsWith("/api/ai/generate-flashcards")) {
      const count = Number(body.count) || 8;
      const sys =
        "Você é um professor de Medicina especialista em repetição espaçada (Anki). Retorne APENAS JSON válido no formato { \"flashcards\": [ { \"front\": \"Pergunta objetiva\", \"back\": \"Resposta direta e técnica\" } ] }.";
      const prompt = `Gere ${count} flashcards médicos de alto rendimento sobre: "${body.topic || body.text || "Medicina"}".`;
      const raw = await callGeminiDirectBrowser(prompt, sys, true, inlineParts);
      const parsed = parseJsonSafe(raw);
      return jsonResponse({ flashcards: parsed.flashcards || parsed || [] });
    }

    if (path.endsWith("/api/ai/generate-mindmap")) {
      const sys =
        "Você é um professor de Medicina criando um Mapa Mental estruturado. Retorne APENAS JSON válido com { \"title\": \"...\", \"nodes\": [ { \"id\": \"1\", \"label\": \"...\", \"type\": \"topic\", \"parentId\": null } ] }.";
      const prompt = `Crie um mapa mental médico completo e estruturado sobre: "${body.topic || body.text || "Medicina"}".`;
      const raw = await callGeminiDirectBrowser(prompt, sys, true, inlineParts);
      const parsed = parseJsonSafe(raw);
      return jsonResponse(parsed);
    }

    if (
      path.endsWith("/api/ai/generate-summary") ||
      path.endsWith("/api/ai/transcribe-document") ||
      path.endsWith("/api/ai/generate-tutoria") ||
      path.endsWith("/api/ai/analyze-atelie") ||
      path.endsWith("/api/ai/generate-atelie-summary")
    ) {
      const sys =
        "Você é um professor titular de Medicina redigindo um documento técnico, denso, didático e completo em Markdown estruturado. Use parágrafos fluidos para explicações e listas apenas para enumerações curtas.";
      const prompt = `Produza o conteúdo médico completo, estruturado e aprofundado solicitado a seguir:\n\n${JSON.stringify(body)}`;
      const text = await callGeminiDirectBrowser(prompt, sys, false, inlineParts);
      return jsonResponse({
        summary: text,
        transcription: text,
        content: text,
        result: text,
      });
    }
  } catch (err: any) {
    return jsonResponse(
      { error: err?.message || "Erro ao processar requisição com IA." },
      500
    );
  }

  return jsonResponse({ error: "Endpoint não disponível no modo estático." }, 404);
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

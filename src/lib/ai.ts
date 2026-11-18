import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import OpenAI from "openai";
import { prisma } from "@/lib/db";
import fs from "fs";
import path from "path";
import os from "os";

export type AIProvider = "gemini" | "openai" | "none";

// Modelos disponíveis na API Gemini rigorosamente validados e ativos
const GEMINI_MODELS = [
  "gemini-2.5-flash",         // Prioridade 1: Modelo padrão ultra-rápido, estável e com suporte a 65k tokens
  "gemini-flash-latest",      // Prioridade 2: Alias oficial sempre ativo
  "gemini-flash-lite-latest", // Prioridade 3: Alias leve oficial sempre ativo
  "gemini-2.5-pro",           // Prioridade 4: Modelo avançado de alta capacidade
];

const AUDIO_MODELS = [
  "gemini-2.5-flash",
  "gemini-flash-latest",
  "gemini-flash-lite-latest",
];

export function resolveMediaMimeAndExt(mime?: string, filename?: string): { mimeType: string; ext: string } {
  const extFromName = filename ? path.extname(filename).toLowerCase() : "";
  const lowerMime = (mime || "").toLowerCase();

  // 1. Deteção prioritária por extensão do arquivo
  if (extFromName === ".mp4" || extFromName === ".m4v") return { mimeType: "video/mp4", ext: ".mp4" };
  if (extFromName === ".m4a") return { mimeType: "audio/mp4", ext: ".m4a" };
  if (extFromName === ".mp3") return { mimeType: "audio/mp3", ext: ".mp3" };
  if (extFromName === ".wav") return { mimeType: "audio/wav", ext: ".wav" };
  if (extFromName === ".mov") return { mimeType: "video/quicktime", ext: ".mov" };
  if (extFromName === ".mkv") return { mimeType: "video/x-matroska", ext: ".mkv" };
  if (extFromName === ".avi") return { mimeType: "video/x-msvideo", ext: ".avi" };
  if (extFromName === ".flac") return { mimeType: "audio/flac", ext: ".flac" };
  if (extFromName === ".aac") return { mimeType: "audio/aac", ext: ".aac" };
  if (extFromName === ".ogg" || extFromName === ".oga" || extFromName === ".opus") return { mimeType: "audio/ogg", ext: ".ogg" };
  if (extFromName === ".wma") return { mimeType: "audio/x-ms-wma", ext: ".wma" };
  if (extFromName === ".wmv") return { mimeType: "video/x-ms-wmv", ext: ".wmv" };
  if (extFromName === ".webm") {
    const isVideo = lowerMime.includes("video");
    return { mimeType: isVideo ? "video/webm" : "audio/webm", ext: ".webm" };
  }

  // 2. Deteção por MIME type
  if (lowerMime.includes("mp4") || lowerMime.includes("m4v")) {
    if (lowerMime.startsWith("audio/")) return { mimeType: "audio/mp4", ext: ".m4a" };
    return { mimeType: "video/mp4", ext: ".mp4" };
  }
  if (lowerMime.includes("m4a")) return { mimeType: "audio/mp4", ext: ".m4a" };
  if (lowerMime.includes("mpeg") || lowerMime.includes("mp3")) return { mimeType: "audio/mp3", ext: ".mp3" };
  if (lowerMime.includes("wav")) return { mimeType: "audio/wav", ext: ".wav" };
  if (lowerMime.includes("quicktime") || lowerMime.includes("mov")) return { mimeType: "video/quicktime", ext: ".mov" };
  if (lowerMime.includes("matroska") || lowerMime.includes("mkv")) return { mimeType: "video/x-matroska", ext: ".mkv" };
  if (lowerMime.includes("flac")) return { mimeType: "audio/flac", ext: ".flac" };
  if (lowerMime.includes("aac")) return { mimeType: "audio/aac", ext: ".aac" };
  if (lowerMime.includes("ogg") || lowerMime.includes("opus")) return { mimeType: "audio/ogg", ext: ".ogg" };
  if (lowerMime.includes("video/webm")) return { mimeType: "video/webm", ext: ".webm" };
  if (lowerMime.includes("audio/webm")) return { mimeType: "audio/webm", ext: ".webm" };

  return { mimeType: lowerMime && !lowerMime.includes("octet-stream") ? lowerMime : "audio/webm", ext: ".webm" };
}

function repairIncompleteJSON(jsonStr: string): string {
  let s = jsonStr.trim();
  let inString = false;
  let isEscape = false;
  const stack: string[] = [];

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inString) {
      if (isEscape) {
        isEscape = false;
      } else if (ch === "\\") {
        isEscape = true;
      } else if (ch === '"') {
        inString = false;
      }
    } else {
      if (ch === '"') {
        inString = true;
      } else if (ch === "{") {
        stack.push("}");
      } else if (ch === "[") {
        stack.push("]");
      } else if (ch === "}" || ch === "]") {
        if (stack.length > 0 && stack[stack.length - 1] === ch) {
          stack.pop();
        }
      }
    }
  }

  if (inString) {
    s += '"';
  }

  s = s.replace(/,\s*$/, "");

  while (stack.length > 0) {
    s += stack.pop();
  }

  return s;
}

function parseAIResponseJSON(text: string): any {
  let clean = (text || "").trim();

  // 1. Strip markdown fences if present
  const fenceMatch = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch && fenceMatch[1]) {
    clean = fenceMatch[1].trim();
  } else if (clean.startsWith("```")) {
    clean = clean.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  }

  // 2. Extract substring between outer-most JSON delimiters if there is extra prose
  const firstBrace = clean.indexOf("{");
  const firstBracket = clean.indexOf("[");
  let startIdx = -1;
  let endIdx = -1;

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIdx = firstBrace;
    endIdx = clean.lastIndexOf("}");
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
    endIdx = clean.lastIndexOf("]");
  }

  if (startIdx !== -1) {
    if (endIdx !== -1 && endIdx > startIdx) {
      clean = clean.slice(startIdx, endIdx + 1);
    } else {
      clean = clean.slice(startIdx);
    }
  }

  // 3. Direct native parse attempt first
  try {
    return JSON.parse(clean);
  } catch (e1) {
    // Continue to repair passes
  }

  // 4. Character-by-character pass: sanitize literal raw newlines & control chars inside strings
  let out = "";
  let inStr = false;
  let esc = false;

  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (inStr) {
      if (esc) {
        out += c;
        esc = false;
      } else if (c === "\\") {
        out += c;
        esc = true;
      } else if (c === '"') {
        inStr = false;
        out += c;
      } else if (c === '\n') {
        out += '\\n';
      } else if (c === '\r') {
        // omit carriage return
      } else if (c === '\t') {
        out += '\\t';
      } else if (c.charCodeAt(0) < 32) {
        // drop invalid ascii control characters
      } else {
        out += c;
      }
    } else {
      if (c === '"') {
        inStr = true;
        out += c;
      } else {
        out += c;
      }
    }
  }

  // 5. Fix invalid backslash escapes
  out = out.replace(/\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, "\\\\");

  try {
    return JSON.parse(out);
  } catch (e2) {
    // 6. Attempt repair of unclosed truncated JSON
    try {
      const repaired = repairIncompleteJSON(out);
      return JSON.parse(repaired);
    } catch {}

    // 7. Fallback: balanced-brace parser for questions / flashcards
    const questions: any[] = [];
    let depth = 0;
    let objStart = -1;
    let insideStr = false;
    let isEsc = false;

    for (let i = 0; i < out.length; i++) {
      const ch = out[i];
      if (insideStr) {
        if (isEsc) isEsc = false;
        else if (ch === "\\") isEsc = true;
        else if (ch === '"') insideStr = false;
      } else {
        if (ch === '"') insideStr = true;
        else if (ch === "{") {
          if (depth === 1) objStart = i;
          depth++;
        } else if (ch === "}") {
          depth--;
          if (depth === 1 && objStart !== -1) {
            const chunk = out.slice(objStart, i + 1);
            try {
              const item = JSON.parse(chunk);
              if (item.text || item.question || item.enunciado || item.front) {
                questions.push(item);
              }
            } catch {}
            objStart = -1;
          }
        }
      }
    }

    if (questions.length > 0) {
      const titleM = out.match(/"title"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/);
      const subM = out.match(/"subject"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/);
      return {
        title: titleM ? titleM[1] : "Simulado",
        subject: subM ? subM[1] : "Geral",
        questions,
      };
    }

    // 8. Fallback: document transcription regex
    const transMatch = clean.match(/"transcription"\s*:\s*"([\s\S]*?)(?:"\s*,\s*"(?:keyPoints|pageCount|wordCount)|"$|$)/);
    if (transMatch) {
      const transText = transMatch[1]
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, "")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\");
      const titleMatch = clean.match(/"title"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/);
      return {
        title: titleMatch ? titleMatch[1] : "Documento Transcrito",
        transcription: transText,
        summary: transText,
        keyPoints: [],
      };
    }

    // 9. Fallback: Raw markdown response without JSON formatting
    if (clean.includes("# ") || clean.includes("### ") || clean.includes(" - **")) {
      const titleMatch = clean.match(/^#+\s+(.+)$/m);
      return {
        title: titleMatch ? titleMatch[1].trim() : "Documento Transcrito",
        transcription: clean,
        summary: clean,
        keyPoints: [],
      };
    }

    throw e2;
  }
}

function isValidApiKey(k: string): boolean {
  const trimmed = (k || "").trim();
  if (!trimmed || trimmed === "sua-chave-aqui" || trimmed.length < 5) return false;
  return true;
}

export function formatAIError(rawError: any): string {
  const msg = rawError?.message || "Erro desconhecido";
  if (
    msg.includes("503") ||
    msg.includes("high demand") ||
    msg.includes("Service Unavailable") ||
    msg.includes("overloaded")
  ) {
    return "Os servidores da IA do Google estão temporariamente com alta demanda no momento. Tentamos automaticamente outros modelos disponíveis, mas você pode tentar novamente em alguns segundos.";
  }
  if (
    msg.includes("429") ||
    msg.includes("quota") ||
    msg.includes("Quota exceeded") ||
    msg.includes("ResourceExhausted") ||
    msg.includes("Too Many Requests")
  ) {
    return "Limite temporário de requisições da chave do Gemini atingido. Aguarde cerca de 30 segundos ou adicione outra chave em Configurações.";
  }
  if (
    msg.includes("API_KEY_INVALID") ||
    msg.includes("API key not valid") ||
    msg.includes("403") ||
    msg.includes("unauthorized")
  ) {
    return "Chave de API do Google Gemini inválida ou não autorizada. Verifique sua chave em Configurações.";
  }
  if (msg.includes("404") || msg.includes("is not found") || msg.includes("no longer available")) {
    return "A IA do Google atualizou os modelos disponíveis. O sistema alternou automaticamente para os modelos mais rápidos e estáveis (Gemini 2.5 Flash e 3.5 Flash). Tente novamente em instantes.";
  }
  if (msg.includes("Timeout de processamento")) {
    return msg;
  }
  if (msg.includes("ECONNRESET") || msg.includes("ETIMEDOUT") || msg.includes("fetch failed")) {
    return "Instabilidade de conexão temporária com a IA do Google. Tente novamente em instantes.";
  }
  return `Erro na API do Google Gemini: ${msg.replace(/^\[GoogleGenerativeAI Error\]:\s*/, "")}`;
}

// Armazenamento exclusivamente em memória RAM volátil da sessão atual (nunca salvo em disco/banco ou pastas do projeto)
export function getVolatileApiKey(): string {
  return ((globalThis as any).__medsetupVolatileApiKey || "").trim();
}

export function setVolatileApiKey(key: string): void {
  (globalThis as any).__medsetupVolatileApiKey = (key || "").trim();
}

export async function getAllApiKeys(): Promise<string[]> {
  const keys: string[] = [];

  const sessionRaw = getVolatileApiKey();
  if (sessionRaw) {
    for (const k of sessionRaw.split(",")) {
      const trimmed = k.trim();
      if (isValidApiKey(trimmed) && !keys.includes(trimmed)) {
        keys.push(trimmed);
      }
    }
  }

  return keys;
}

export async function getActiveApiKey(): Promise<{ key: string; provider: AIProvider }> {
  const keys = await getAllApiKeys();
  if (keys.length === 0) {
    return { key: "", provider: "none" };
  }
  const primaryKey = keys[0];
  if (primaryKey.startsWith("sk-")) {
    return { key: primaryKey, provider: "openai" };
  }
  return { key: primaryKey, provider: "gemini" };
}

export function detectProvider(apiKey: string): AIProvider {
  const trimmed = (apiKey || "").trim();
  if (!trimmed) return "none";
  if (trimmed.startsWith("sk-")) {
    return "openai";
  }
  return "gemini";
}

export async function generateJSONFromAI({
  systemPrompt,
  userPrompt,
  customApiKey,
  fileAttachment,
  fileAttachments,
  maxOutputTokens = 65536,
  temperature = 0.6,
}: {
  systemPrompt: string;
  userPrompt: string;
  customApiKey?: string;
  maxOutputTokens?: number;
  temperature?: number;
  fileAttachment?: {
    data: string;
    mimeType: string;
    name?: string;
  };
  fileAttachments?: Array<{
    data: string;
    mimeType: string;
    name?: string;
  }>;
}): Promise<any> {
  const keysToTry = customApiKey ? [customApiKey] : await getAllApiKeys();

  if (keysToTry.length === 0) {
    throw new Error("Chave de API não configurada. Adicione sua chave em Configurações.");
  }

  // Normalize all attachments into a clean list
  const rawFiles: Array<{ data: string; mimeType: string; name?: string }> = [];
  if (fileAttachments && Array.isArray(fileAttachments) && fileAttachments.length > 0) {
    rawFiles.push(...fileAttachments);
  } else if (fileAttachment && fileAttachment.data) {
    rawFiles.push(fileAttachment);
  }

  // Strengthen system prompt when PDF/materials are present (only for exam questions/simulado/tutoria, NOT for transcription or content expansion)
  let effectiveSystemPrompt = systemPrompt;
  const isTutoriaOrPbl = systemPrompt.includes("PBL") || systemPrompt.includes("Tutoria") || systemPrompt.includes("preceptor médico");
  const isTranscriptionOrSummary =
    systemPrompt.includes("transcritor") ||
    systemPrompt.includes("transcrição") ||
    systemPrompt.includes("Resumo") ||
    systemPrompt.includes("ResumoPro") ||
    systemPrompt.includes("professor catedrático") ||
    systemPrompt.includes("MODO EXPANDIR");

  if (rawFiles.length > 0 && !isTutoriaOrPbl && !isTranscriptionOrSummary) {
    effectiveSystemPrompt = `ATENÇÃO OBRIGATÓRIA DA BANCA EXAMINADORA:
Foram fornecidos ${rawFiles.length} documento(s)/arquivo(s) anexados como FONTE OFICIAL E MATERIAL DE ESTUDO BASE.
Você DEVE LER com atenção máxima e aprofundada TODOS os arquivos anexados e formular as questões/conteúdos BASEANDO-SE ESTRITAMENTE e PROFUNDAMENTE nos fatos, dados, conceitos, terminologias, métodos, capítulos e ensinamentos presentes nesses arquivos.
Se o usuário incluiu perguntas, direcionamentos, dúvidas ou temas específicos, dê PRIORIDADE MÁXIMA para responder a essas perguntas e atender aos direcionamentos solicitados, fundamentando-se no material fornecido.

${systemPrompt}`;
  }

  const effectiveUserPrompt =
    userPrompt && userPrompt.trim().length > 0
      ? userPrompt
      : `Analise todos os documentos anexados e formule o conteúdo solicitado com base fiel e aprofundada no material fornecido.`;

  let lastError: any = null;

  for (const key of keysToTry) {
    const provider = detectProvider(key);

    if (provider === "gemini") {
      const genAI = new GoogleGenerativeAI(key);
      const fileManager = new GoogleAIFileManager(key);
      const tempFilesToClean: string[] = [];
      const uploadedGoogleFiles: any[] = [];

      try {
        // Prepare parts for Gemini
        const parts: any[] = [];

        // Process all attached files (supports multiple PDFs with instant digital text extraction)
        const textParts: string[] = [];
        const binaryFilesToProcess: Array<{ buffer: Buffer; mime: string; name: string; cleanBase64: string }> = [];

        for (let i = 0; i < rawFiles.length; i++) {
          const file = rawFiles[i];
          if (!file.data) continue;

          let cleanBase64 = file.data;
          if (cleanBase64.includes(";base64,")) {
            cleanBase64 = cleanBase64.split(";base64,")[1];
          }

          let fileMime = (file.mimeType || "application/pdf").toLowerCase();
          const extFromName = (file.name || "").toLowerCase().split(".").pop() || "";
          if (extFromName === "pdf" || fileMime.includes("pdf")) {
            fileMime = "application/pdf";
          } else if (extFromName === "png" || fileMime.includes("png")) {
            fileMime = "image/png";
          } else if (extFromName === "jpg" || extFromName === "jpeg" || fileMime.includes("jpeg") || fileMime.includes("jpg")) {
            fileMime = "image/jpeg";
          } else if (extFromName === "webp") {
            fileMime = "image/webp";
          } else if (extFromName === "txt" || fileMime.includes("text")) {
            fileMime = "text/plain";
          } else if (fileMime.includes("octet-stream") || !fileMime) {
            fileMime = "application/pdf";
          }

          const buffer = Buffer.from(cleanBase64, "base64");

          // 1. Text plain: inject directly into prompt parts (0ms latency, zero API upload needed)
          if (fileMime === "text/plain") {
            const textContent = buffer.toString("utf8");
            textParts.push(`\n═══════════════════════════════════════════════════════════\nCONTEÚDO DO DOCUMENTO: "${file.name || `documento_${i + 1}`}"\n═══════════════════════════════════════════════════════════\n${textContent}\n`);
            continue;
          }

          // 2. PDF: extract digital text first!
          // 95%+ of study PDFs have digital text. Reading text directly is 20x faster than sending raw binary PDF!
          if (fileMime === "application/pdf") {
            let parsedPdf: any = null;
            try {
              const { extractTextFromPdf } = await import("@/lib/document-parser");
              parsedPdf = await extractTextFromPdf(buffer);
              // For tutoria / PBL, documents often contain scanned images or photos of the clinical case.
              // We extract digital text as reference, but NEVER skip the binary PDF so Gemini Vision can inspect all images!
              const minCharsNeeded = isTutoriaOrPbl ? Math.max(500, 300 * (parsedPdf?.total || 1)) : 80;
              if (parsedPdf && parsedPdf.text && parsedPdf.text.trim().length > minCharsNeeded) {
                textParts.push(`\n═══════════════════════════════════════════════════════════\nTEXTO INTEGRAL EXTRAÍDO DO PDF: "${file.name || `documento_${i + 1}`}" (${parsedPdf.total || parsedPdf.pages.length} páginas)\n═══════════════════════════════════════════════════════════\n${parsedPdf.text}\n`);
                if (!isTutoriaOrPbl) {
                  continue;
                }
              }
            } catch (e) {
              console.warn(`[ai.ts] PDF fast-text fallback for ${file.name}:`, e);
            }

            // Se o PDF tiver estrutura inválida ou 0 páginas legíveis pelo parser, NUNCA envie o binário bruto
            // para a API do Gemini (pois ela rejeita com "[400 Bad Request] The document has no pages.")
            if (!parsedPdf || !parsedPdf.total || parsedPdf.total < 1) {
              console.warn(`[ai.ts] Skipping invalid/0-page binary PDF "${file.name}" to prevent Gemini 400 error.`);
              if (parsedPdf?.text && parsedPdf.text.trim().length > 0) {
                textParts.push(`\n═══════════════════════════════════════════════════════════\nTEXTO EXTRAÍDO DO DOCUMENTO: "${file.name || `documento_${i + 1}`}"\n═══════════════════════════════════════════════════════════\n${parsedPdf.text}\n`);
              } else if (file.name) {
                textParts.push(`\n[Tema/Arquivo de referência: "${file.name.replace(/\.[^/.]+$/, "")}"]\n`);
              }
              continue;
            }
          }

          // 3. Scanned PDF or Image: schedule for binary processing
          binaryFilesToProcess.push({
            buffer,
            mime: fileMime,
            name: file.name || `arquivo_${i + 1}`,
            cleanBase64,
          });
        }

        // Upload any binary files in PARALLEL to Google File API (drastically cuts wait time)
        if (binaryFilesToProcess.length > 0) {
          await Promise.all(
            binaryFilesToProcess.map(async (item, idx) => {
              // Images up to 15MB are passed directly as inlineData (0ms latency, 100% reliable)
              if (item.buffer.length <= 15 * 1024 * 1024 && !item.mime.includes("pdf")) {
                parts.push({
                  inlineData: {
                    data: item.cleanBase64,
                    mimeType: item.mime,
                  },
                });
                return;
              }

              try {
                const ext = item.mime.includes("pdf") ? ".pdf" : item.mime.includes("png") ? ".png" : ".jpg";
                const tempFilePath = path.join(os.tmpdir(), `sf_upload_${Date.now()}_${idx}${ext}`);
                fs.writeFileSync(tempFilePath, item.buffer);
                tempFilesToClean.push(tempFilePath);

                const uploadRes = await fileManager.uploadFile(tempFilePath, {
                  mimeType: item.mime,
                  displayName: item.name,
                });

                if (uploadRes?.file?.uri) {
                  let fileInfo = uploadRes.file;
                  let attempts = 0;
                  while (fileInfo.state === "PROCESSING" && attempts < 15) {
                    await new Promise((r) => setTimeout(r, 1000));
                    fileInfo = await fileManager.getFile(fileInfo.name);
                    attempts++;
                  }

                  if (fileInfo.state === "ACTIVE") {
                    uploadedGoogleFiles.push(fileInfo);
                    parts.push({
                      fileData: {
                        mimeType: fileInfo.mimeType,
                        fileUri: fileInfo.uri,
                      },
                    });
                  }
                }
              } catch (uploadErr: any) {
                console.warn(`[Gemini File API] upload failed for ${item.name}:`, uploadErr.message);
                if (item.buffer.length <= 15 * 1024 * 1024) {
                  parts.push({
                    inlineData: {
                      data: item.cleanBase64,
                      mimeType: item.mime,
                    },
                  });
                }
              }
            })
          );
        }

        // Append all extracted text parts
        for (const tp of textParts) {
          parts.push(tp);
        }

        parts.push(effectiveUserPrompt);

        for (const modelName of GEMINI_MODELS) {
          let attempts = 0;
          const maxAttempts = 2;
          // Somente gemini-2.5-flash suporta até 65536 tokens de saída; modelos lite/2.0 aceitam no máximo 8192 (acima disso gera 400 Bad Request)
          let effectiveMaxTokens: number | undefined =
            modelName === "gemini-2.5-flash"
              ? Math.min(65536, Math.max(8192, maxOutputTokens))
              : Math.min(8192, maxOutputTokens);

          while (attempts <= maxAttempts) {
            try {
              const genConfig: Record<string, any> = {
                responseMimeType: "application/json",
                temperature,
              };
              if (effectiveMaxTokens) {
                genConfig.maxOutputTokens = effectiveMaxTokens;
              }

              const model = genAI.getGenerativeModel({
                model: modelName,
                systemInstruction: effectiveSystemPrompt,
                generationConfig: genConfig,
              });

              // Timeout de segurança por chamada para permitir geração de tutoria e textos densos (6 minutos)
              const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error(`Timeout de processamento no modelo ${modelName}`)), 360000)
              );

              const res = await Promise.race([
                model.generateContent(parts),
                timeoutPromise,
              ]);

              const text = res.response.text();
              return parseAIResponseJSON(text);
            } catch (err: any) {
              if (!lastError || modelName === "gemini-2.5-flash") {
                lastError = err;
              }

              // Se o Gemini rejeitar um arquivo binário com "The document has no pages" ou "Unable to process input",
              // remove os anexos binários problemáticos e tenta imediatamente com o texto extraído + prompt
              const isNoPagesOrUnprocessable =
                err.message?.includes("The document has no pages") ||
                err.message?.includes("Unable to process");

              if (isNoPagesOrUnprocessable) {
                const textOnlyParts = parts.filter((p) => typeof p === "string");
                if (textOnlyParts.length > 0 && textOnlyParts.length < parts.length) {
                  console.warn(`[Gemini] Stripping invalid binary attachment after "document has no pages" and retrying with text parts...`);
                  parts.length = 0;
                  parts.push(...textOnlyParts);
                  attempts++;
                  continue;
                }
              }

              // Se o modelo rejeitar maxOutputTokens com 400 Bad Request, tenta imediatamente sem limite explícito
              const isInvalidArg =
                err.message?.includes("400") ||
                err.message?.includes("invalid argument") ||
                err.message?.includes("INVALID_ARGUMENT");

              if (isInvalidArg && effectiveMaxTokens !== undefined) {
                effectiveMaxTokens = undefined;
                attempts++;
                continue;
              }

              const isRetryable =
                err.message?.includes("503") ||
                err.message?.includes("429") ||
                err.message?.includes("high demand") ||
                err.message?.includes("overloaded") ||
                err.message?.includes("ResourceExhausted") ||
                err.message?.includes("Too Many Requests");

              if (isRetryable && attempts < maxAttempts) {
                attempts++;
                const delay = attempts * 1500;
                console.warn(`[Gemini] ${modelName} hit rate limit / demand spike. Retrying in ${delay}ms (${attempts}/${maxAttempts})...`);
                await new Promise((r) => setTimeout(r, delay));
                continue;
              }
              console.warn(`[Gemini] Model ${modelName} notice:`, (err.message || "").slice(0, 150));
              break;
            }
          }
        }
      } finally {
        // Cleanup local temporary files
        for (const tempPath of tempFilesToClean) {
          try {
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
          } catch (e) {}
        }
        // Cleanup files uploaded to Google File API
        for (const uploaded of uploadedGoogleFiles) {
          try {
            fileManager.deleteFile(uploaded.name).catch(() => {});
          } catch (e) {}
        }
      }
    } else {
      try {
        const openai = new OpenAI({ apiKey: key });
        const messages: any[] = [
          { role: "system", content: effectiveSystemPrompt },
        ];

        const userContent: any[] = [{ type: "text", text: effectiveUserPrompt }];
        for (const file of rawFiles) {
          if (file.mimeType?.startsWith("image/")) {
            userContent.push({
              type: "image_url",
              image_url: {
                url: file.data.startsWith("data:")
                  ? file.data
                  : `data:${file.mimeType};base64,${file.data}`,
              },
            });
          }
        }

        messages.push({ role: "user", content: userContent });

        const completion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages,
          temperature: 0.7,
          response_format: { type: "json_object" },
        });

        const content = completion.choices[0]?.message?.content;
        if (content) return JSON.parse(content);
      } catch (err: any) {
        lastError = err;
        console.warn(`[OpenAI] Key ...${key.slice(-6)} notice:`, err.message);
      }
    }
  }

  throw new Error(formatAIError(lastError));
}

export async function processAudioWithAI({
  audioBuffer,
  mimeType = "audio/webm",
  filename,
  fallbackText,
  systemPrompt,
}: {
  audioBuffer?: Buffer | null;
  mimeType?: string;
  filename?: string;
  fallbackText?: string;
  systemPrompt: string;
}): Promise<any> {
  if ((!audioBuffer || audioBuffer.length === 0) && fallbackText && fallbackText.trim().length >= 5) {
    return generateJSONFromAI({
      systemPrompt,
      userPrompt: `Conteúdo da aula gravada pelo microfone:\n\n"${fallbackText.trim()}"`,
    });
  }

  const keysToTry = await getAllApiKeys();
  if (keysToTry.length === 0) {
    throw new Error("Chave de API não configurada. Por favor, acesse Configurações e adicione sua chave do Google Gemini.");
  }
  let lastError: any = null;

  // Resolve MIME type exato e extensão de arquivo adequada para Google AI File API
  const { mimeType: resolvedMime, ext } = resolveMediaMimeAndExt(mimeType, filename);

  let tempFilePath: string | null = null;
  if (audioBuffer && audioBuffer.length > 0) {
    tempFilePath = path.join(
      os.tmpdir(),
      `studyflow_media_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`
    );
    try {
      fs.writeFileSync(tempFilePath, audioBuffer);
    } catch (e: any) {
      console.warn("Could not write temp media file, will use inline buffer:", e.message);
      tempFilePath = null;
    }
  }

  const audioPrompt = `Analise com extrema atenção a gravação COMPLETA desta aula/conferência (áudio ou vídeo) do PRIMEIRO AO ÚLTIMO SEGUNDO, cobrindo integralmente toda a duração sem truncar e sem limitar apenas aos momentos iniciais.
1. Transcreva com máxima fidelidade e completude todo o conteúdo falado pelo professor/apresentador no campo 'cleanTranscript', cobrindo o decorrer de toda a gravação do início ao fim sem pular nenhum trecho.
2. Elabore um Resumo Completo e minucioso no campo 'summary' com tópicos detalhados sobre todas as partes abordadas na aula.
3. Extraia todos os pontos-chave essenciais no campo 'keyPoints'.
4. Divida em seções explicativas aprofundadas no campo 'topics'.
5. Construa a árvore hierárquica do mapa mental conceitual com nós e ramificações no campo 'mindMap'.
Responda OBRIGATORIAMENTE em formato JSON válido.`;

  try {
    for (const key of keysToTry) {
      const provider = detectProvider(key);

      if (provider === "gemini") {
        const genAI = new GoogleGenerativeAI(key);

        let uploadedGoogleFile: any = null;
        let fileManager: GoogleAIFileManager | null = null;

        if (tempFilePath && fs.existsSync(tempFilePath)) {
          try {
            fileManager = new GoogleAIFileManager(key);
            const uploadRes = await fileManager.uploadFile(tempFilePath, {
              mimeType: resolvedMime,
              displayName: filename || `studyflow_media_${Date.now()}`,
            });
            let fileInfo = uploadRes.file;
            let attempts = 0;
            while (fileInfo.state === "PROCESSING" && attempts < 60) {
              await new Promise((r) => setTimeout(r, 1000));
              fileInfo = await fileManager.getFile(fileInfo.name);
              attempts++;
            }
            if (fileInfo.state === "ACTIVE") {
              uploadedGoogleFile = fileInfo;
            }
          } catch (uploadErr: any) {
            console.warn(`[Gemini Media] File API upload notice:`, uploadErr.message);
            uploadedGoogleFile = null;
          }
        }

        try {
          for (const modelName of AUDIO_MODELS) {
            let modelAttempts = 0;
            const maxModelAttempts = 1;

            while (modelAttempts <= maxModelAttempts) {
              try {
                const model = genAI.getGenerativeModel({
                  model: modelName,
                  systemInstruction: systemPrompt,
                  generationConfig: {
                    responseMimeType: "application/json",
                    temperature: 0.2,
                    maxOutputTokens: 8192,
                  },
                });

                const contents: any[] = [audioPrompt];

                if (uploadedGoogleFile) {
                  contents.push({
                    fileData: {
                      mimeType: uploadedGoogleFile.mimeType,
                      fileUri: uploadedGoogleFile.uri,
                    },
                  });
                } else if (audioBuffer && audioBuffer.length > 0) {
                  contents.push({
                    inlineData: {
                      data: audioBuffer.toString("base64"),
                      mimeType: resolvedMime,
                    },
                  });
                }

                if (fallbackText && fallbackText.trim().length > 0) {
                  contents.push(
                    `Transcrição contínua capturada durante toda a aula (utilize como apoio e referência de fidelidade para garantir que 100% das explicações sejam incluídas sem perdas):\n"""\n${fallbackText.trim()}\n"""`
                  );
                }

                const res = await model.generateContent(contents);
                const text = res.response.text();
                return parseAIResponseJSON(text);
              } catch (err: any) {
                lastError = err;
                const is503 = err.message?.includes("503") || err.message?.includes("high demand") || err.message?.includes("overloaded");
                if (is503 && modelAttempts < maxModelAttempts) {
                  modelAttempts++;
                  await new Promise((r) => setTimeout(r, 1200));
                  continue;
                }
                console.warn(`[Gemini Audio] Key ...${key.slice(-6)} Model ${modelName} notice:`, (err.message || "").slice(0, 120));
                break;
              }
            }
          }
        } finally {
          if (uploadedGoogleFile && fileManager) {
            fileManager.deleteFile(uploadedGoogleFile.name).catch(() => {});
          }
        }
      }
    }
  } finally {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (e) {}
    }
  }

  if (fallbackText && fallbackText.trim().length > 10) {
    return generateJSONFromAI({
      systemPrompt,
      userPrompt: `Conteúdo da aula gravada pelo microfone:\n\n"${fallbackText.trim()}"`,
    });
  }

  throw new Error(formatAIError(lastError));
}

export async function generateVisionFromAI({
  systemPrompt,
  userPrompt,
  imageBase64,
  mimeType = "image/jpeg",
  customApiKey,
}: {
  systemPrompt: string;
  userPrompt: string;
  imageBase64: string;
  mimeType?: string;
  customApiKey?: string;
}): Promise<any> {
  const keysToTry = customApiKey ? [customApiKey] : await getAllApiKeys();
  if (keysToTry.length === 0) {
    throw new Error("Chave de API não configurada. Por favor, acesse Configurações e adicione sua chave gratuita do Google Gemini.");
  }
  let lastError: any = null;

  for (const key of keysToTry) {
    const provider = detectProvider(key);

    if (provider === "gemini") {
      const genAI = new GoogleGenerativeAI(key);

      for (const modelName of GEMINI_MODELS) {
        try {
          const model = genAI.getGenerativeModel({
            model: modelName,
            systemInstruction: systemPrompt,
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.5,
            },
          });

          const imagePart = {
            inlineData: {
              data: imageBase64,
              mimeType,
            },
          };

          const res = await model.generateContent([userPrompt, imagePart]);
          const text = res.response.text();
          return parseAIResponseJSON(text);
        } catch (err: any) {
          lastError = err;
          console.warn(`[Gemini Vision] Model ${modelName} notice:`, err.message);
        }
      }
    }
  }

  throw new Error(formatAIError(lastError));
}

export async function testAIConnection(apiKey: string): Promise<{ success: boolean; message?: string; error?: string; provider: string }> {
  const cleanKey = (apiKey || "").trim();
  const provider = detectProvider(cleanKey);

  if (provider === "gemini") {
    let lastErrorMsg = "";
    for (const m of GEMINI_MODELS) {
      try {
        const genAI = new GoogleGenerativeAI(cleanKey);
        const model = genAI.getGenerativeModel({ model: m });
        const result = await model.generateContent("Diga apenas OK");
        const responseText = result.response.text();
        return {
          success: true,
          provider: `Google Gemini (${m})`,
          message: `Conexão com a API do Google Gemini estabelecida com sucesso (${m})!`,
        };
      } catch (e: any) {
        lastErrorMsg = e?.message || "";
        console.warn(`Gemini test on ${m} notice:`, e.message);
      }
    }
    return {
      success: false,
      provider: "Google Gemini",
      error: formatAIError({ message: lastErrorMsg }),
    };
  } else {
    try {
      const openai = new OpenAI({ apiKey });
      const models = await openai.models.list();
      return {
        success: true,
        provider: "OpenAI",
        message: `Conexão com OpenAI estabelecida com sucesso! (${models.data.length} modelos disponíveis)`,
      };
    } catch (e: any) {
      return {
        success: false,
        provider: "OpenAI",
        error: e?.message || "Chave da OpenAI inválida.",
      };
    }
  }
}
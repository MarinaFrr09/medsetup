"use client";

import React, { useMemo, useRef, useState, useEffect, useCallback } from "react";
import {
  FileText,
  BookOpen,
  MessageSquareText,
  Microscope,
  Bone,
  Stethoscope,
  FlaskConical,
  Link2,
  Users,
  GitBranch,
  Sparkles,
  Check,
  Copy,
  FileDown,
  ChevronDown,
  ChevronRight,
  Loader2,
  Bookmark,
  Share2,
  Printer,
  Compass,
  ArrowUpRight,
  ListTree,
  Filter,
  CheckCircle2,
  Layers,
  LayoutList,
  Search,
  Eye,
  Download,
  X,
  HelpCircle,
  Undo,
  RotateCcw,
  Trash2,
  Edit3,
  Pencil,
  Save,
  Plus,
  Upload,
  Image as ImageIcon,
  ZoomIn,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { useAppStore, AtelieAnalysis, Deck, Flashcard } from "@/stores/useAppStore";
import { atelieToMarkdown, atelieStats, areaLabel, AtelieStructure, AtelieTopic, AtelieResult, structureMd } from "@/lib/atelie";
import { copyRichText } from "@/lib/notion-export";
import { exportDocumentToProfessionalPdf } from "@/lib/pdf-export";
import { markdownToHtml, htmlToMarkdown, formatDenseProseParagraphsIntoBullets } from "@/lib/rich-text-utils";
import { cleanLatexAndBadges } from "@/lib/text-sanitize";
import { replaceInMarkdown } from "@/lib/selection-replace";
import { cleanQuestionTitle, extractCleanSubject, shortenCardAnswer, cleanClinicalCaseTitle, cleanClinicalCaseText } from "@/lib/questionUtils";
import { RichTextEditor } from "@/components/shared/RichTextEditor";
import { NotionOutline } from "@/components/shared/NotionOutline";
import { parseInlineSpans, cleanCssVal } from "@/components/tutoria/TutoriaViewer";
import dynamic from "next/dynamic";
import type { TranscriptionViewerHandle } from "@/components/transcription/TranscriptionDocumentViewer";

const TranscriptionDocumentViewer = dynamic(
  () => import("@/components/transcription/TranscriptionDocumentViewer"),
  { ssr: false }
);

const EmbeddedMindMapView = dynamic(
  () => import("@/components/image-reader/EmbeddedMindMapView"),
  { ssr: false }
);

export function cleanLegacyThemeAndRelevanceQuotes(md: string): string {
  if (!md) return "";
  return md
    // Clean any broken UTF-8 emoji artifacts like Ü| or orphan surrogates
    .replace(/(?:Ü\||\u00DC\||\u00DC\u00A6)\s*/g, "")
    .replace(/[\uD800-\uDFFF]/g, "")
    // Convert old blockquote or emoji theme lines into clean text topics
    .replace(/^>\s*(?:\*\*)?Tema(?:\s+da\s+[Pp]ergunta)?(?:\*\*)?\s*:?\s*/gim, "* **Tema:** ")
    .replace(/^>\s*(?:\*\*)?(?:Relev[aâ]ncia\s+Cl[íi]nica|Rela[çc][aã]o\s+Cl[íi]nica)(?:\*\*)?\s*:?\s*/gim, "* **Relação Clínica:** ")
    .replace(/^>\s*(?:\*\*)?S[íi]ntese\s+Central(?:\*\*)?\s*:?\s*/gim, "* **Síntese Central:** ")
    .replace(/^>\s*[💡⚠️]\s*(?:\*\*)?Tema(?:\s+da\s+[Pp]ergunta)?(?:\*\*)?\s*:?\s*/gim, "* **Tema:** ")
    .replace(/^>\s*[💡⚠️]\s*(?:\*\*)?(?:Relev[aâ]ncia\s+Cl[íi]nica|Rela[çc][aã]o\s+Cl[íi]nica)(?:\*\*)?\s*:?\s*/gim, "* **Relação Clínica:** ")
    .replace(/^>\s*[💡⚠️]\s*/gm, "* ")
    .replace(/^[💡⚠️]\s*(?:\*\*)?Tema(?:\s+da\s+[Pp]ergunta)?(?:\*\*)?\s*:?\s*/gim, "* **Tema:** ")
    .replace(/^[💡⚠️]\s*/gm, "* ")
    .replace(/[💡⚠️]/g, "")
    // Strip "Hipóteses Diagnósticas e Avaliação Clínica" section completely
    .replace(/#####\s*Hip[oó]teses\s+Diagn[oó]sticas\s+e\s+(?:Avalia[çc][aã]o|Justificativa)\s+Cl[íi]nica\s*\n(?:[ \t]*\*[^\n]*\n*)*/gi, "");
}

export function buildMorphologyAttachmentsMarkdown(res: AtelieResult): string {
  const attachedHistology = (res.histology || []).filter((h) => !!h.imageUrl);
  const attachedAnatomy = (res.anatomy || []).filter((a) => !!a.imageUrl);

  if (attachedHistology.length === 0 && attachedAnatomy.length === 0) {
    return "";
  }

  const parts: string[] = [];
  parts.push(`### Anexos e Lâminas de Morfologia\n`);

  if (attachedHistology.length > 0) {
    attachedHistology.forEach((h, idx) => {
      const title = h.structure || `Lâmina Histológica ${idx + 1}`;
      parts.push(`#### ${title}\n`);
      parts.push(`![${h.imageCaption || title}](${h.imageUrl})\n`);
      if (h.staining && h.staining.trim()) {
        parts.push(`* **Coloração / Técnica**: ${h.staining.trim()}`);
      }
      if (h.description && h.description.trim()) {
        parts.push(`* **Descrição Histológica**: ${h.description.trim()}`);
      }
      if (h.imageCaption && h.imageCaption.trim() && h.imageCaption.trim() !== title.trim()) {
        parts.push(`* **Legenda da Prancha**: ${h.imageCaption.trim()}`);
      }
      if (h.clinicalRelevance && h.clinicalRelevance.trim()) {
        parts.push(`* **Relação Clínica**: ${h.clinicalRelevance.trim()}`);
      }
      parts.push("");
    });
  }

  if (attachedAnatomy.length > 0) {
    attachedAnatomy.forEach((a, idx) => {
      const title = a.structure || `Estrutura Anatômica ${idx + 1}`;
      parts.push(`#### ${title}\n`);
      parts.push(`![${a.imageCaption || title}](${a.imageUrl})\n`);
      if (a.description && a.description.trim()) {
        parts.push(`* **Descrição Anatômica**: ${a.description.trim()}`);
      }
      if (a.imageCaption && a.imageCaption.trim() && a.imageCaption.trim() !== title.trim()) {
        parts.push(`* **Legenda da Peça/Imagem**: ${a.imageCaption.trim()}`);
      }
      if (a.clinicalRelevance && a.clinicalRelevance.trim()) {
        parts.push(`* **Relação Clínica**: ${a.clinicalRelevance.trim()}`);
      }
      parts.push("");
    });
  }

  return parts.join("\n");
}

export function syncMorphologyAttachmentsIntoMarkdown(md: string, res: AtelieResult): string {
  if (!md) return "";
  // Strip any previous attachments section
  let cleaned = md.replace(/\n*### Anexos e Lâminas de Morfologia[\s\S]*?(?=\n### |\n## |$)/i, "");

  const attachmentsBlock = buildMorphologyAttachmentsMarkdown(res);
  if (!attachmentsBlock.trim()) {
    return cleaned.trim();
  }

  // Insert before Perguntas e Atividades do Roteiro, Destaques do Roteiro, Destaques para Revisão, or Glossário
  const destRegex = /\n(?=## Perguntas e Atividades do Roteiro|## Destaques do Roteiro|### Destaques do Roteiro|### Destaques para Revisão Rápida|### Glossário)/i;
  const match = cleaned.match(destRegex);
  if (match && match.index !== undefined) {
    return (
      cleaned.slice(0, match.index) +
      "\n\n" +
      attachmentsBlock +
      "\n\n" +
      cleaned.slice(match.index + 1)
    ).trim();
  }

  return (cleaned.trim() + "\n\n" + attachmentsBlock).trim();
}

export function reorderAtelieMarkdown(md: string): string {
  if (!md) return "";
  const perguntasIdx = md.indexOf("## Perguntas e Atividades do Roteiro");
  const objetivosIdx = md.indexOf("## Objetivos do Roteiro");

  const needsReorder = perguntasIdx !== -1 && objetivosIdx !== -1 && perguntasIdx < objetivosIdx;
  const destMatch = md.match(/\n(?=###? Destaques do Roteiro)/i);
  const destNeedsMove = destMatch && destMatch.index !== undefined && perguntasIdx !== -1 && destMatch.index < perguntasIdx;

  if (!needsReorder && !destNeedsMove) {
    return md;
  }

  const sections = md.split(/\n(?=## )/);
  let titleBlock = "";
  let objetivosSection = "";
  let resumoSection = "";
  let perguntasSection = "";
  let destaquesSection = "";
  const otherSections: string[] = [];

  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i];
    if (i === 0 && !sec.startsWith("## ")) {
      titleBlock = sec;
    } else if (sec.startsWith("## Objetivos do Roteiro")) {
      objetivosSection = sec;
    } else if (sec.startsWith("## Resumo Completo")) {
      const dMatch = sec.match(/\n(?=###? Destaques do Roteiro)/i);
      if (dMatch && dMatch.index !== undefined) {
        resumoSection = sec.slice(0, dMatch.index).trim();
        destaquesSection = sec.slice(dMatch.index).trim();
        if (destaquesSection.startsWith("### Destaques do Roteiro")) {
          destaquesSection = "## " + destaquesSection.slice(4);
        }
      } else {
        resumoSection = sec;
      }
    } else if (sec.startsWith("## Perguntas e Atividades do Roteiro")) {
      perguntasSection = sec;
    } else if (sec.startsWith("## Destaques do Roteiro") || sec.startsWith("### Destaques do Roteiro")) {
      destaquesSection = sec;
      if (destaquesSection.startsWith("### Destaques do Roteiro")) {
        destaquesSection = "## " + destaquesSection.slice(4);
      }
    } else {
      otherSections.push(sec);
    }
  }

  const orderedParts: string[] = [];
  if (titleBlock) orderedParts.push(titleBlock.trim());
  if (objetivosSection) orderedParts.push(objetivosSection.trim());
  if (resumoSection) orderedParts.push(resumoSection.trim());
  if (otherSections.length > 0) orderedParts.push(...otherSections.map((s) => s.trim()));
  if (perguntasSection) orderedParts.push(perguntasSection.trim());
  if (destaquesSection) orderedParts.push(destaquesSection.trim());

  return orderedParts.join("\n\n").trim();
}

export function buildSummaryMarkdown(res: AtelieResult): string {
  const parts: string[] = [];
  const title = res.title || "Resumo da Situação-Problema";
  parts.push(`# ${title}\n`);

  if (res.theme && res.theme.trim() && res.theme.trim() !== title.trim()) {
    parts.push(`* **Tema:** ${res.theme.trim()}\n`);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. PRIMEIRA SEÇÃO: Objetivos do Roteiro (com menção objetiva de lâminas/tecidos)
  // ─────────────────────────────────────────────────────────────────────────────
  parts.push(`## Objetivos do Roteiro\n`);

  if (res.objectives && res.objectives.length > 0) {
    res.objectives.forEach((obj, idx) => {
      const objTitle = obj.title?.trim() || "";
      const objDetail = obj.detail?.trim() ? `: ${obj.detail.trim()}` : "";
      parts.push(`${idx + 1}. **${objTitle}**${objDetail}`);
    });
    parts.push("");
  }

  // Menção objetiva sobre lâminas e tecidos histológicos pedidos no roteiro
  if (res.histology && res.histology.length > 0) {
    parts.push(`### Lâminas e Tecidos Histológicos Solicitados no Roteiro\n`);
    res.histology.forEach((h) => {
      const struct = h.structure || "Tecido Histológico";
      const req = h.request ? ` — Pedido no roteiro: ${h.request}.` : "";
      const desc = h.description ? ` Características: ${h.description}.` : "";
      const stain = h.staining ? ` Coloração: ${h.staining}.` : "";
      parts.push(`* **${struct}**${req}${desc}${stain}`);
    });
    parts.push("");
  }

  // Menção objetiva sobre estruturas anatômicas se houver
  if (res.anatomy && res.anatomy.length > 0) {
    parts.push(`### Estruturas Anatômicas Solicitadas no Roteiro\n`);
    res.anatomy.forEach((a) => {
      const struct = a.structure || "Estrutura Anatômica";
      const req = a.request ? ` — Pedido no roteiro: ${a.request}.` : "";
      const desc = a.description ? ` Características: ${a.description}.` : "";
      parts.push(`* **${struct}**${req}${desc}`);
    });
    parts.push("");
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. SEGUNDA SEÇÃO: Resumo Completo
  // (Utilizando texto, subtópicos, etapas e detalhamento aprofundado de características)
  // ─────────────────────────────────────────────────────────────────────────────
  parts.push(`## Resumo Completo\n`);

  if (res.summary && res.summary.trim() && res.summary.trim() !== res.theme?.trim()) {
    parts.push(`${res.summary.trim()}\n`);
  }

  if (res.detailedSummary && res.detailedSummary.length > 0) {
    res.detailedSummary.forEach((topic) => {
      if (topic.topic && topic.topic.trim()) {
        parts.push(`### ${topic.topic.trim()}\n`);
      }
      if (topic.subtopics && topic.subtopics.length > 0) {
        topic.subtopics.forEach((st) => {
          if (st.title && st.title.trim()) {
            parts.push(`#### ${st.title.trim()}\n`);
          }
          if (st.content && st.content.trim()) {
            parts.push(`${st.content.trim()}\n`);
          }
        });
      }
    });
  }

  // Correlação Morfofuncional e Clínica
  if (res.correlations && res.correlations.length > 0) {
    parts.push(`### Correlação Morfofuncional e Clínica\n`);
    res.correlations.forEach((corr) => {
      if (corr.title) parts.push(`#### ${corr.title}\n`);
      if (corr.text) parts.push(`${corr.text}\n`);
    });
  }

  // Exames e Biomarcadores
  if (res.exams && res.exams.length > 0) {
    parts.push(`### Exames e Biomarcadores Relevantes\n`);
    res.exams.forEach((ex) => {
      parts.push(`#### ${ex.name || "Exame"}\n`);
      if (ex.summary) parts.push(`${ex.summary}\n`);
      if (ex.markers && ex.markers.length > 0) {
        ex.markers.forEach((m) => {
          const body = [m.explanation, m.significance].filter(Boolean).join(" — ");
          parts.push(`* **${m.name}**: ${body}`);
        });
        parts.push("");
      }
      if (ex.interpretation) parts.push(`* **Interpretação**: ${ex.interpretation}`);
      if (ex.correlation) parts.push(`* **Correlação Clínica**: ${ex.correlation}`);
    });
  }

  // Anexos de Morfologia e Lâminas (Apenas se houver anexos/imagens adicionadas)
  // Aparece no final do Resumo Completo
  const attachmentsBlock = buildMorphologyAttachmentsMarkdown(res);
  if (attachmentsBlock) {
    parts.push(attachmentsBlock);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. TERCEIRA SEÇÃO: Perguntas e Atividades do Roteiro (Ao Final)
  // (NÃO retirar nada! Manter perguntas, atividades práticas de anatomia, histologia e casos)
  // ─────────────────────────────────────────────────────────────────────────────
  parts.push(`## Perguntas e Atividades do Roteiro\n`);

  const hasQuestions = res.questions && res.questions.length > 0;
  const hasAnatomyActivities = res.anatomy && res.anatomy.length > 0;
  const hasHistologyActivities = res.histology && res.histology.length > 0;
  const hasCases = res.clinicalCases && res.clinicalCases.length > 0;

  // Perguntas e Questões do Roteiro (sem prefixar artificialmente com "Pergunta 1, 2, 3")
  if (hasQuestions) {
    parts.push(`### Perguntas e Questões do Roteiro\n`);
    res.questions.forEach((q) => {
      const qText = q.question?.trim();
      if (qText) {
        const cleanQ = qText.replace(/^Pergunta\s*\d+\s*[:\-]\s*/i, "").trim();
        parts.push(`#### ${cleanQ}\n`);
      }
      if (q.theme && q.theme.trim()) {
        parts.push(`* **Tema:** ${q.theme.trim()}\n`);
      }
      if (q.answer && q.answer.trim()) {
        parts.push(`${q.answer.trim()}\n`);
      }
    });
  }

  // Atividades Práticas e Identificação Morfológica do Roteiro
  // (Ex.: Identificar detalhadamente útero, tubas e ovários, descrevendo formato e eixos uterinos...)
  if (hasAnatomyActivities || hasHistologyActivities) {
    parts.push(`### Atividades Práticas e Identificação Morfológica do Roteiro\n`);

    if (hasAnatomyActivities) {
      res.anatomy.forEach((a) => {
        const titleText = (a.request || `Identificar ${a.structure}`).replace(/^[Aa]tividade\s*\d+\s*[:\-]\s*/, "").trim();
        parts.push(`#### ${titleText}\n`);
        if (a.description && a.description.trim()) {
          parts.push(`${a.description.trim()}\n`);
        }
        if (a.features && a.features.length > 0) {
          parts.push(`##### Características e Detalhamento:\n`);
          a.features.forEach((feat) => {
            parts.push(`* **${feat}**`);
          });
          parts.push("");
        }
        if (a.clinicalRelevance && a.clinicalRelevance.trim()) {
          parts.push(`* **Relação Clínica:** ${a.clinicalRelevance.trim()}\n`);
        }
      });
    }

    if (hasHistologyActivities) {
      res.histology.forEach((h) => {
        const titleText = (h.request || `Identificar e Descrever: ${h.structure}`).replace(/^[Aa]tividade\s*\d+\s*[:\-]\s*/, "").trim();
        parts.push(`#### ${titleText}\n`);
        if (h.description && h.description.trim()) {
          parts.push(`${h.description.trim()}\n`);
        }
        if (h.features && h.features.length > 0) {
          parts.push(`##### Características Histológicas e Critérios de Identificação:\n`);
          h.features.forEach((feat) => {
            parts.push(`* **${feat}**`);
          });
          parts.push("");
        }
        if (h.staining && h.staining.trim()) {
          parts.push(`* **Coloração / Técnica**: ${h.staining.trim()}`);
        }
        if (h.clinicalRelevance && h.clinicalRelevance.trim()) {
          parts.push(`* **Relação Clínica:** ${h.clinicalRelevance.trim()}\n`);
        }
      });
    }
  }

  // Atividades Práticas e Casos Clínicos do Roteiro (Organizados com Negrito e Pergunta Central)
  if (hasCases) {
    parts.push(`### Casos Clínicos e Resoluções Práticas do Roteiro\n`);
    res.clinicalCases.forEach((c, idx) => {
      const cleanTitle = cleanClinicalCaseTitle(c.title);
      const isGeneric = !cleanTitle || /^caso\s*cl[ií]nico(\s+do\s+roteiro)?(\s*\d+)?$/i.test(cleanTitle);
      parts.push(`#### Caso ${idx + 1}${isGeneric ? "" : ` — ${cleanTitle}`}\n`);

      if (c.theme && c.theme.trim()) {
        parts.push(`* **Tema:** ${c.theme.trim()}\n`);
      }

      // Apresentação e Dados Clínicos do Caso (Estritamente texto clínico, sem cabeçalhos de coordenador/relator)
      const rawCaseDesc = c.caseTranscription?.trim() || c.summary?.trim();
      const caseDesc = cleanClinicalCaseText(rawCaseDesc);
      if (caseDesc) {
        parts.push(`##### Apresentação e Dados Clínicos do Caso\n`);
        const descLines = caseDesc.split(/\n+/).map((l) => l.trim()).filter(Boolean);
        descLines.forEach((line) => {
          parts.push(`${line}\n`);
        });
      }

      // Tabela Resolvida do Roteiro (se houver)
      if (c.resolvedTable && c.resolvedTable.trim()) {
        parts.push(`##### Tabela Resolvida da Atividade\n\n${c.resolvedTable.trim()}\n`);
      }

      // Perguntas do Caso Clínico e Pergunta Central com Resposta e Explicação Detalhada
      if (c.answers && c.answers.length > 0) {
        c.answers.forEach((ans, aIdx) => {
          const rawQ = ans.question?.trim() || "";
          const isCentral = aIdx === 0 || /pergunta\s*central/i.test(rawQ);
          const qHeading = rawQ
            ? (rawQ.toLowerCase().startsWith("pergunta") ? rawQ : isCentral ? `Pergunta Central do Caso: ${rawQ}` : `Pergunta: ${rawQ}`)
            : "Pergunta Central do Caso";

          parts.push(`##### ${qHeading}\n`);
          if (ans.theme && ans.theme.trim()) {
            parts.push(`* **Tema:** ${ans.theme.trim()}\n`);
          }
          if (ans.answer && ans.answer.trim()) {
            parts.push(`**Resposta e Explicação Detalhada**:\n\n${ans.answer.trim()}\n`);
          }
        });
      } else if (c.diagnosticReasoning && c.diagnosticReasoning.trim()) {
        parts.push(`##### Pergunta Central do Caso: Qual o diagnóstico e conduta para o caso apresentado?\n`);
        parts.push(`**Resposta e Raciocínio Clínico Fundamentado**:\n\n${c.diagnosticReasoning.trim()}\n`);
      }

      // Raciocínio Diagnóstico e Conduta
      if (c.diagnosticReasoning && c.diagnosticReasoning.trim()) {
        parts.push(`* **Raciocínio Diagnóstico**: ${c.diagnosticReasoning.trim()}`);
      }
      if (c.management && c.management.trim()) {
        parts.push(`* **Conduta Médica e Propedêutica**: ${c.management.trim()}`);
      }
      parts.push("");
    });
  }

  if (!hasQuestions && !hasCases && !hasAnatomyActivities && !hasHistologyActivities) {
    parts.push(`*Nenhuma pergunta ou caso clínico específico foi identificado no roteiro.*\n`);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. QUARTA SEÇÃO: Destaques do Roteiro (Final do Arquivo)
  // ─────────────────────────────────────────────────────────────────────────────
  if (res.keyPoints && res.keyPoints.length > 0) {
    parts.push(`## Destaques do Roteiro\n`);
    res.keyPoints.forEach((kp) => {
      parts.push(`* ${kp}`);
    });
    parts.push("");
  }

  return formatDenseProseParagraphsIntoBullets(cleanLatexAndBadges(parts.join("\n")));
}

function renderSummaryInline(raw: string): React.ReactNode {
  const spans = parseInlineSpans(raw);
  return spans.map((span, i) => {
    if (span.type === "bold") {
      return (
        <strong key={i} className="font-bold text-slate-950 dark:text-white">
          {renderSummaryInline(span.content)}
        </strong>
      );
    }
    if (span.type === "italic") {
      return (
        <em key={i} className="italic text-slate-800 dark:text-slate-300">
          {renderSummaryInline(span.content)}
        </em>
      );
    }
    if (span.type === "color") {
      const cleanCol = cleanCssVal(span.color);
      return (
        <span key={i} style={cleanCol ? { color: cleanCol } : undefined} className="font-semibold">
          {renderSummaryInline(span.content)}
        </span>
      );
    }
    if (span.type === "mark") {
      if (!span.content || !span.content.trim()) return null;
      const cleanBg = cleanCssVal(span.bgColor) || "#FEF08A";
      const cleanCol = cleanCssVal(span.color) || "#0F172A";
      return (
        <mark
          key={i}
          style={{ backgroundColor: cleanBg, color: cleanCol }}
          className="px-1 py-0.5 rounded font-medium"
        >
          {renderSummaryInline(span.content)}
        </mark>
      );
    }
    if (span.type === "underline") {
      if (!span.content || !span.content.trim()) return null;
      return <u key={i}>{renderSummaryInline(span.content)}</u>;
    }
    return <React.Fragment key={i}>{span.content}</React.Fragment>;
  });
}

function renderSummaryItemContent(text: string): React.ReactNode {
  let body = cleanLatexAndBadges(text);
  body = body
    .replace(/<mark(?:\s+[^>]*)?>\s*<\/mark>/gi, "")
    .replace(/<span(?:\s+[^>]*)?>\s*<\/span>/gi, "")
    .replace(/^\s*(?:—\s*)+\s*:\s*/, "")
    .replace(/^\s*:\s*/, "");
  body = body.replace(/^\s*\[[A-Za-zÀ-ÖØ-öø-ÿ\s]{3,25}\]\s*/, "");
  body = body.replace(
    /^\s*(?:\*\*)?(?:Contextualização\s+(?:Fisiopatológica[,\s]*Histológica\s+e\s+Epidemiológica\s+Abrangente|Fisiopatológica[^\n:*]*|Histológica[^\n:*]*|Epidemiológica[^\n:*]*|Abrangente|Objetiva|Clínica)|Contextualização)(?:\*\*)?\s*:\s*/i,
    ""
  );

  const curiosidadeMatch = body.match(/^\s*(?:\*\*)?Curiosidade(?:\s+Clínica)?(?:\*\*)?(\s*:\s*)(.*)$/i);
  if (curiosidadeMatch) {
    const expl = curiosidadeMatch[2].trim().replace(/^\*\*\s*/, "");
    return (
      <div className="my-3 p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/25 border border-amber-200/70 dark:border-amber-800/50 shadow-xs">
        <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold text-sm mb-1.5">
          <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>Curiosidade / Ponto Extra</span>
        </div>
        <div className="text-[14.5px] sm:text-[15.5px] leading-relaxed text-amber-950/90 dark:text-amber-100/90">
          {renderSummaryInline(expl)}
        </div>
      </div>
    );
  }

  const boldColonMatch = body.match(/^\s*\*\*([^*]+)\*\*(\s*(?:->|→|&rarr;|:)\s*)(.*)$/);
  const spanColonMatch = !boldColonMatch && body.match(/^\s*(<span\b[^>]*>[\s\S]*?<\/span>)\s*(:)\s*(.*)$/i);
  const plainColonMatch =
    !boldColonMatch && !spanColonMatch && !body.trim().startsWith("<") && !/<[a-zA-Z][^>]*:[^>]*>/.test(body.slice(0, 60))
      ? body.match(/^\s*([^<*:\->—\n]{2,60})(\s*(?:->|→|&rarr;|:)\s*)(.*)$/)
      : null;
  const colonOrArrowMatch = boldColonMatch || spanColonMatch || plainColonMatch;
  if (colonOrArrowMatch) {
    const term = colonOrArrowMatch[1].trim().replace(/\*\*/g, "");
    const isArrow = colonOrArrowMatch[2].includes("->") || colonOrArrowMatch[2].includes("→");
    const expl = colonOrArrowMatch[3].trim().replace(/^\*\*\s*/, "");

    return (
      <span className="text-[15px] sm:text-[16px] md:text-[16.5px] leading-relaxed text-slate-800 dark:text-slate-200 inline">
        <strong className="font-bold text-slate-950 dark:text-white mr-1.5">
          {renderSummaryInline(term)}
          {isArrow ? "" : ":"}
        </strong>
        {isArrow && (
          <span className="text-blue-500/80 dark:text-blue-400 font-semibold mx-1.5 select-none">-&gt;</span>
        )}
        <span>{renderSummaryInline(expl)}</span>
      </span>
    );
  }

  return (
    <span className="text-[15px] sm:text-[16px] md:text-[16.5px] leading-relaxed text-slate-800 dark:text-slate-200">
      {renderSummaryInline(body)}
    </span>
  );
}

function renderSummaryDocumentLines(
  markdown: string,
  onPreviewImage?: (url: string, caption?: string) => void
): React.ReactNode[] {
  const lines = markdown.split("\n");
  const elements: React.ReactNode[] = [];
  let currentParagraphLines: string[] = [];
  let headingCounter = 0;

  const flushParagraph = (key: string) => {
    if (currentParagraphLines.length === 0) return;
    const text = currentParagraphLines.join(" ").trim();
    currentParagraphLines = [];
    if (!text) return;
    elements.push(
      <p
        key={key}
        className="text-[15px] sm:text-[16px] md:text-[16.5px] leading-relaxed text-slate-800 dark:text-slate-200 my-2.5"
      >
        {renderSummaryItemContent(text)}
      </p>
    );
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      flushParagraph(`p-${i}`);
      continue;
    }

    if (trimmed.startsWith("# ")) {
      flushParagraph(`p-before-h1-${i}`);
      const headingId = `heading-sec-${headingCounter++}`;
      elements.push(
        <h1
          key={`h1-${i}`}
          id={headingId}
          className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight pb-3 border-b border-slate-200 dark:border-slate-800 mt-2 mb-6 scroll-mt-24"
        >
          {renderSummaryInline(trimmed.replace(/^#\s+/, ""))}
        </h1>
      );
      continue;
    }

    if (trimmed.startsWith("## ")) {
      flushParagraph(`p-before-h2-${i}`);
      const headingId = `heading-sec-${headingCounter++}`;
      elements.push(
        <h2
          key={`h2-${i}`}
          id={headingId}
          className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-8 mb-3 flex items-center gap-2.5 scroll-mt-24"
        >
          <span className="w-2 h-6 rounded-full bg-blue-600 dark:bg-blue-400 shrink-0" />
          <span>{renderSummaryInline(trimmed.replace(/^##\s+/, ""))}</span>
        </h2>
      );
      continue;
    }

    if (trimmed.startsWith("##### ")) {
      flushParagraph(`p-before-h5-${i}`);
      elements.push(
        <h5
          key={`h5-${i}`}
          className="text-xs sm:text-sm font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider mt-4 mb-1.5 flex items-center gap-1.5"
        >
          <span className="w-1.5 h-3.5 rounded-full bg-blue-500 shrink-0" />
          <span>{renderSummaryInline(trimmed.replace(/^#####\s+/, ""))}</span>
        </h5>
      );
      continue;
    }

    if (trimmed.startsWith("#### ")) {
      flushParagraph(`p-before-h4-${i}`);
      const headingId = `heading-sec-${headingCounter++}`;
      elements.push(
        <h4
          key={`h4-${i}`}
          id={headingId}
          className="text-[15.5px] sm:text-base font-bold text-slate-900 dark:text-white tracking-tight mt-5 mb-1.5 scroll-mt-24"
        >
          {renderSummaryInline(trimmed.replace(/^####\s+/, ""))}
        </h4>
      );
      continue;
    }

    if (trimmed.startsWith("### ")) {
      flushParagraph(`p-before-h3-${i}`);
      const headingId = `heading-sec-${headingCounter++}`;
      elements.push(
        <h3
          key={`h3-${i}`}
          id={headingId}
          className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight mt-6 mb-2 scroll-mt-24"
        >
          {renderSummaryInline(trimmed.replace(/^###\s+/, ""))}
        </h3>
      );
      continue;
    }

    // Embedded Images: ![caption](src)
    const imgMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imgMatch) {
      flushParagraph(`p-before-img-${i}`);
      const caption = imgMatch[1];
      const src = imgMatch[2];
      elements.push(
        <div key={`img-${i}`} className="my-6 space-y-2">
          <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950/5 dark:bg-slate-900/40 p-2 sm:p-3 text-center">
            <img
              src={src}
              alt={caption || "Lâmina ou Anexo"}
              className="max-h-[480px] w-auto max-w-full mx-auto rounded-xl object-contain shadow-xs cursor-zoom-in transition-transform duration-200 hover:scale-[1.01]"
              onClick={() => onPreviewImage && onPreviewImage(src, caption)}
            />
          </div>
          {caption && caption !== "Lâmina" && caption !== "Imagem" && caption !== "Lâmina Histológica" && (
            <p className="text-center text-xs text-slate-500 dark:text-slate-400 italic">
              {caption}
            </p>
          )}
        </div>
      );
      continue;
    }

    // Table parsing for Markdown tables
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      flushParagraph(`p-before-table-${i}`);
      const tableRows: string[][] = [];
      let j = i;
      while (j < lines.length && lines[j].trim().startsWith("|") && lines[j].trim().endsWith("|")) {
        const rowTrim = lines[j].trim();
        // Ignore separator row like | --- | --- |
        if (!/^\|(?:\s*:?-+:?\s*\|)+$/.test(rowTrim)) {
          const cells = rowTrim.slice(1, -1).split("|").map((c) => c.trim());
          tableRows.push(cells);
        }
        j++;
      }
      i = j - 1;

      if (tableRows.length > 0) {
        const header = tableRows[0];
        const bodyRows = tableRows.slice(1);
        elements.push(
          <div key={`table-${i}`} className="my-5 overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <table className="w-full text-xs sm:text-sm text-left border-collapse">
              <thead className="bg-blue-700 text-white dark:bg-blue-900/60">
                <tr>
                  {header.map((cell, cIdx) => (
                    <th key={cIdx} className="px-4 py-3 font-bold border-b border-blue-800 dark:border-blue-700">
                      {renderSummaryInline(cell)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {bodyRows.map((row, rIdx) => (
                  <tr key={rIdx} className={rIdx % 2 === 1 ? "bg-slate-50/70 dark:bg-slate-800/30" : "bg-white dark:bg-[#12151e]"}>
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className={`px-4 py-2.5 text-slate-800 dark:text-slate-200 ${cIdx === 0 ? "font-semibold" : ""}`}>
                        {renderSummaryInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }

    if (trimmed.startsWith("> ")) {
      flushParagraph(`p-before-quote-${i}`);
      const quoteBody = trimmed.replace(/^>\s+/, "").trim();
      const themeOrRel = quoteBody.match(/^(?:\*\*)?(Tema(?:\s+da\s+[Pp]ergunta)?|Relev[aâ]ncia\s+Cl[íi]nica|Rela[çc][aã]o\s+Cl[íi]nica|S[íi]ntese\s+Central)(?:\*\*)?\s*:?\s*(.*)$/i);
      if (themeOrRel) {
        const rawLabel = themeOrRel[1];
        const labelText = /Relev|Rela/i.test(rawLabel) ? "Relação Clínica" : /S[íi]ntese/i.test(rawLabel) ? "Síntese Central" : "Tema";
        const textContent = themeOrRel[2].trim();
        elements.push(
          <div
            key={`quote-theme-${i}`}
            className="my-2 text-[15px] sm:text-[16px] md:text-[16.5px] leading-relaxed text-slate-800 dark:text-slate-200"
          >
            <strong className="font-bold text-slate-950 dark:text-white mr-1.5">{labelText}:</strong>
            <span>{renderSummaryInline(textContent)}</span>
          </div>
        );
        continue;
      }

      elements.push(
        <div
          key={`quote-${i}`}
          className="my-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border-l-4 border-blue-600 dark:border-blue-400 p-4 sm:p-5 text-slate-800 dark:text-slate-200 text-[14.5px] sm:text-[15.5px] leading-relaxed shadow-xs"
        >
          {renderSummaryItemContent(quoteBody)}
        </div>
      );
      continue;
    }

    if (/^(?:[💡⚠️]|(?:Ü\||\u00DC\||\u00DC\u00A6))/.test(trimmed)) {
      flushParagraph(`p-before-emoji-${i}`);
      const cleanBody = trimmed
        .replace(/^(?:[💡⚠️]|(?:Ü\||\u00DC\||\u00DC\u00A6))\s*/, "")
        .trim();
      const themeOrRel = cleanBody.match(/^(?:\*\*)?(Tema(?:\s+da\s+[Pp]ergunta)?|Relev[aâ]ncia\s+Cl[íi]nica|Rela[çc][aã]o\s+Cl[íi]nica|S[íi]ntese\s+Central)(?:\*\*)?\s*:?\s*(.*)$/i);
      if (themeOrRel) {
        const rawLabel = themeOrRel[1];
        const labelText = /Relev|Rela/i.test(rawLabel) ? "Relação Clínica" : /S[íi]ntese/i.test(rawLabel) ? "Síntese Central" : "Tema";
        const textContent = themeOrRel[2].trim();
        elements.push(
          <div
            key={`emoji-tip-${i}`}
            className="my-2 text-[15px] sm:text-[16px] md:text-[16.5px] leading-relaxed text-slate-800 dark:text-slate-200"
          >
            <strong className="font-bold text-slate-950 dark:text-white mr-1.5">{labelText}:</strong>
            <span>{renderSummaryInline(textContent)}</span>
          </div>
        );
        continue;
      }
      elements.push(
        <div
          key={`emoji-tip-${i}`}
          className="my-2 text-[15px] sm:text-[16px] md:text-[16.5px] leading-relaxed text-slate-800 dark:text-slate-200"
        >
          {renderSummaryItemContent(cleanBody)}
        </div>
      );
      continue;
    }

    if (/^[\*\-]\s+/.test(trimmed)) {
      flushParagraph(`p-before-bullet-${i}`);
      const bulletBody = trimmed.replace(/^[\*\-]\s+/, "");
      elements.push(
        <div key={`bullet-${i}`} className="flex items-start gap-3 my-2 ml-1">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 shrink-0 mt-2.5" />
          <div className="flex-1 text-[15px] sm:text-[16px] md:text-[16.5px] leading-relaxed text-slate-800 dark:text-slate-200">
            {renderSummaryItemContent(bulletBody)}
          </div>
        </div>
      );
      continue;
    }

    const numMatch = trimmed.match(/^(\d+(?:\.\d+)*)\.?\s+(.*)$/);
    if (numMatch) {
      flushParagraph(`p-before-num-${i}`);
      const numLabel = numMatch[1];
      const bodyText = numMatch[2];
      elements.push(
        <div key={`num-${i}`} className="flex items-start gap-2.5 my-2 ml-1">
          <span className="font-bold text-blue-700 dark:text-blue-400 select-none text-[15px] sm:text-[16px] md:text-[16.5px] shrink-0 leading-relaxed">
            {numLabel}.
          </span>
          <div className="flex-1 text-[15px] sm:text-[16px] md:text-[16.5px] leading-relaxed text-slate-800 dark:text-slate-200">
            {renderSummaryItemContent(bodyText)}
          </div>
        </div>
      );
      continue;
    }

    // Independent line starting with a bold label (e.g. **Tema:**, **Relação Clínica:**)
    const themeOrRelLineMatch = trimmed.match(/^\*\*(Tema(?:\s+da\s+[Pp]ergunta)?|Relev[aâ]ncia\s+Cl[íi]nica|Rela[çc][aã]o\s+Cl[íi]nica|S[íi]ntese\s+Central)\*\*\s*:?\s*(.*)$/i);
    if (themeOrRelLineMatch) {
      flushParagraph(`p-before-theme-${i}`);
      const rawLabel = themeOrRelLineMatch[1];
      const labelText = /Relev|Rela/i.test(rawLabel) ? "Relação Clínica" : /S[íi]ntese/i.test(rawLabel) ? "Síntese Central" : "Tema";
      const textContent = themeOrRelLineMatch[2].trim();
      elements.push(
        <div
          key={`theme-item-${i}`}
          className="my-2 text-[15px] sm:text-[16px] md:text-[16.5px] leading-relaxed text-slate-800 dark:text-slate-200"
        >
          <strong className="font-bold text-slate-950 dark:text-white mr-1.5">{labelText}:</strong>
          <span>{renderSummaryInline(textContent)}</span>
        </div>
      );
      continue;
    }

    if (/^\*\*[^*]+\*\*\s*:?\s*/.test(trimmed)) {
      flushParagraph(`p-before-bold-item-${i}`);
      elements.push(
        <div key={`bold-item-${i}`} className="my-2 text-[15px] sm:text-[16px] md:text-[16.5px] leading-relaxed text-slate-800 dark:text-slate-200">
          {renderSummaryItemContent(trimmed)}
        </div>
      );
      continue;
    }

    currentParagraphLines.push(trimmed);
  }

  flushParagraph("p-final");
  return elements;
}

/* ───────────────────────────── Typography & Helpers ───────────────────────────── */

function cleanAppendedAI(text: string): string {
  if (!text) return "";
  // Check if text has duplicate/appended heading like "# O Papel do Estrogênio" or multiple markdown titles appended
  const match = text.search(/\n\s*#{1,3}\s+(?:O Papel do Estrogênio|Fisiopatologia|Conclusão|Aprofundamento|Resumo)/i);
  if (match !== -1) {
    return text.substring(0, match).trim();
  }
  const parts = text.split(/\n\s*#{1,3}\s+/);
  if (parts.length > 1 && parts[0].trim().length > 30) {
    return parts[0].trim();
  }
  return text;
}

interface EditableAnswerBlockProps {
  value: string;
  onChange: (newValue: string) => void;
  badgeLabel?: string;
  className?: string;
}

function EditableAnswerBlock({
  value,
  onChange,
  badgeLabel = "Resposta Fundamentada",
  className,
}: EditableAnswerBlockProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const isEditingRef = useRef(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync value to contentRef only when user is NOT actively typing
  useEffect(() => {
    if (!contentRef.current) return;
    if (isEditingRef.current) return;

    const html = markdownToHtml(cleanLatexAndBadges(value || ""));
    if (contentRef.current.innerHTML !== html) {
      contentRef.current.innerHTML = html;
    }
  }, [value]);

  const handleInput = useCallback(() => {
    if (!contentRef.current) return;
    isEditingRef.current = true;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(() => {
      if (!contentRef.current) return;
      const md = htmlToMarkdown(contentRef.current.innerHTML);
      onChange(md);
      isEditingRef.current = false;
    }, 400);
  }, [onChange]);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const onDomUpdated = () => handleInput();
    el.addEventListener("medsetup:richtext-dom-updated", onDomUpdated);
    return () => el.removeEventListener("medsetup:richtext-dom-updated", onDomUpdated);
  }, [handleInput]);

  const handleBlur = () => {
    setIsFocused(false);
    if (!contentRef.current) return;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    const md = htmlToMarkdown(contentRef.current.innerHTML);
    onChange(md);
    isEditingRef.current = false;
  };

  const handleUndo = () => {
    if (!contentRef.current) return;
    contentRef.current.focus();
    document.execCommand("undo");
  };

  const handleRedo = () => {
    if (!contentRef.current) return;
    contentRef.current.focus();
    document.execCommand("redo");
  };

  // Detect unwanted appended AI content
  const hasExtraAI = useMemo(() => {
    if (!value) return false;
    return (
      /O Papel do Estrogênio/i.test(value) ||
      /\n\s*#{1,3}\s+(?:O Papel|Fisiopatologia|Conclusão|Aprofundamento|Resumo)/i.test(value) ||
      (value.split(/\n\s*#{1,3}\s+/).length > 1 && value.length > 500)
    );
  }, [value]);

  const handleCleanExtra = () => {
    const cleaned = cleanAppendedAI(value);
    if (contentRef.current) {
      contentRef.current.innerHTML = markdownToHtml(cleanLatexAndBadges(cleaned));
    }
    onChange(cleaned);
    toast.success("Texto extra da IA removido! Resposta concisa restaurada.", { icon: "🧹" });
  };

  return (
    <div
      className={cn(
        "group/editable relative rounded-xl bg-slate-50 p-4 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 transition-all",
        isFocused && "ring-2 ring-blue-400/50 border-blue-300 dark:border-blue-700 bg-white dark:bg-[#141722]",
        className
      )}
    >
      {/* Header bar with badge, inline editing status, undo/redo, clean extra */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-200/40 dark:border-slate-800/60">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
            {badgeLabel}
          </span>
          <span className="text-[10.5px] text-slate-400 dark:text-slate-500 font-medium flex items-center gap-1">
            <Edit3 className="w-2.5 h-2.5" />
            Clique para editar diretamente
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {hasExtraAI && (
            <button
              type="button"
              onClick={handleCleanExtra}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 transition-colors cursor-pointer"
              title="Remover texto extra adicionado pela IA e restaurar resposta original"
            >
              <Trash2 className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              <span>Remover texto extra da IA</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleUndo}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Desfazer (Ctrl+Z)"
          >
            <Undo className="w-3 h-3" />
            <span className="hidden sm:inline">Desfazer</span>
          </button>

          <button
            type="button"
            onClick={handleRedo}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Refazer (Ctrl+Y)"
          >
            <RotateCcw className="w-3.5 h-3.5 -scale-x-100" />
            <span className="hidden sm:inline">Refazer</span>
          </button>
        </div>
      </div>

      {/* Directly editable surface */}
      <div
        ref={contentRef}
        contentEditable={true}
        suppressContentEditableWarning={true}
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
        onInput={handleInput}
        className="prose dark:prose-invert max-w-none text-[13.5px] sm:text-[14px] leading-relaxed text-slate-700 dark:text-slate-300 focus:outline-hidden min-h-[40px] cursor-text selection:bg-blue-200 dark:selection:bg-blue-900/50"
      />
    </div>
  );
}

function MarkdownText({ text, className }: { text: string; className?: string }) {
  if (!text) return null;
  const paragraphs = text.split(/\r?\n+/).map((p) => p.trim()).filter(Boolean);

  return (
    <div className={cn("space-y-3", className)}>
      {paragraphs.map((p, i) => {
        const cleanP = p.replace(/^#{1,6}\s+/, "").replace(/^[-*•]\s+/, "");
        const parts = cleanP.split(/(\*\*[^*]+\*\*)/g);
        return (
          <p key={i} className="text-[13.5px] sm:text-[14px] leading-relaxed text-slate-700 dark:text-slate-300">
            {parts.map((part, j) =>
              part.startsWith("**") && part.endsWith("**") ? (
                <strong key={j} className="font-semibold text-slate-900 dark:text-white">
                  {part.slice(2, -2)}
                </strong>
              ) : (
                <React.Fragment key={j}>{part.replace(/\*\*/g, "")}</React.Fragment>
              )
            )}
          </p>
        );
      })}
    </div>
  );
}

async function compressImageFile(file: File, maxDim = 1600, quality = 0.88): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let w = img.naturalWidth || img.width;
        let h = img.naturalHeight || img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const compressed = canvas.toDataURL("image/jpeg", quality);
        resolve(compressed);
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function syncMarkdownWithResult(currentMarkdown: string | undefined, updatedResult: AtelieResult): string {
  const fresh = atelieToMarkdown(updatedResult);
  if (!currentMarkdown || currentMarkdown.trim() === atelieToMarkdown(updatedResult)) {
    return fresh;
  }

  let md = currentMarkdown;
  const histLines = structureMd(updatedResult.histology);
  const histSection = updatedResult.histology.length
    ? `## HISTOLOGIA\n\n${histLines.join("\n")}\n\n`
    : "";

  const anatLines = structureMd(updatedResult.anatomy);
  const anatSection = updatedResult.anatomy.length
    ? `## ANATOMIA\n\n${anatLines.join("\n")}\n\n`
    : "";

  if (md.includes("## HISTOLOGIA")) {
    md = md.replace(/## HISTOLOGIA[\s\S]*?(?=\n## [A-ZÁÉÍÓÚÂÊÔÃÕÇ\s]+|\s*$)/, histSection.trim() + "\n\n");
  } else if (histSection) {
    if (md.includes("## CASOS CLÍNICOS")) {
      md = md.replace("## CASOS CLÍNICOS", `${histSection.trim()}\n\n## CASOS CLÍNICOS`);
    } else {
      md += "\n\n" + histSection;
    }
  }

  if (md.includes("## ANATOMIA")) {
    md = md.replace(/## ANATOMIA[\s\S]*?(?=\n## [A-ZÁÉÍÓÚÂÊÔÃÕÇ\s]+|\s*$)/, anatSection.trim() + "\n\n");
  } else if (anatSection) {
    if (md.includes("## CASOS CLÍNICOS")) {
      md = md.replace("## CASOS CLÍNICOS", `${anatSection.trim()}\n\n## CASOS CLÍNICOS`);
    } else {
      md += "\n\n" + anatSection;
    }
  }

  return md;
}

interface MorphologyCardProps {
  item: AtelieStructure;
  index: number;
  type: "histology" | "anatomy";
  onUpdate: (updated: AtelieStructure) => void;
  onDelete: () => void;
  onPreviewImage: (url: string, caption?: string) => void;
}

function MorphologyCard({
  item,
  index,
  type,
  onUpdate,
  onDelete,
  onPreviewImage,
}: MorphologyCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagText, setNewTagText] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const toastId = toast.loading("Otimizando imagem...");
    try {
      const base64 = await compressImageFile(file, 1600, 0.88);
      onUpdate({
        ...item,
        imageUrl: base64,
        imageCaption: item.imageCaption || item.structure || (type === "histology" ? "Lâmina Histológica" : "Estrutura Anatômica"),
      });
      toast.success("Imagem adicionada e sincronizada com o Ateliê!", { id: toastId });
    } catch {
      toast.error("Erro ao processar imagem.", { id: toastId });
    } finally {
      if (e.target) e.target.value = "";
    }
  };

  const handleAddFeature = () => {
    if (!newTagText.trim()) return;
    const updatedFeatures = [...(item.features || []), newTagText.trim()];
    onUpdate({ ...item, features: updatedFeatures });
    setNewTagText("");
    setIsAddingTag(false);
  };

  const handleRemoveFeature = (fIdx: number) => {
    const updatedFeatures = (item.features || []).filter((_, i) => i !== fIdx);
    onUpdate({ ...item, features: updatedFeatures });
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#12151e] shadow-xs space-y-4 hover:border-blue-300 dark:hover:border-blue-800/60 transition-all flex flex-col justify-between">
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleImageFile}
        className="hidden"
      />

      <div className="space-y-3.5">
        {/* Header: Title, Staining, Actions */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-blue-100 text-[10px] font-bold text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                {index + 1}
              </span>

              {isEditingTitle ? (
                <input
                  type="text"
                  autoFocus
                  value={item.structure}
                  onChange={(e) => onUpdate({ ...item, structure: e.target.value })}
                  onBlur={() => setIsEditingTitle(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") setIsEditingTitle(false);
                  }}
                  className="w-full text-sm font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 rounded px-2 py-0.5 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                />
              ) : (
                <h4
                  onClick={() => setIsEditingTitle(true)}
                  className="text-sm font-bold text-slate-900 dark:text-white truncate cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1.5"
                  title="Clique para editar o nome"
                >
                  <span>{item.structure || "Sem nome"}</span>
                  <Edit3 className="w-3 h-3 text-slate-400 opacity-60" />
                </h4>
              )}
            </div>

            {type === "histology" && (
              <div className="flex items-center gap-1.5 pt-0.5">
                <span className="text-[10px] font-semibold text-slate-400">Coloração:</span>
                <input
                  type="text"
                  value={item.staining || ""}
                  onChange={(e) => onUpdate({ ...item, staining: e.target.value })}
                  placeholder="Ex: HE, PAS"
                  className="rounded-md bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border border-teal-200/50 dark:border-teal-800/40 focus:outline-hidden focus:ring-1 focus:ring-teal-500 max-w-[130px]"
                />
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onDelete}
            className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer shrink-0"
            title="Excluir este bloco"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Image Attachment Area */}
        {item.imageUrl ? (
          <div className="space-y-1.5">
            <div className="relative group/img rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950/5 dark:bg-slate-900/40">
              <img
                src={item.imageUrl}
                alt={item.structure}
                onClick={() => onPreviewImage(item.imageUrl!, item.imageCaption || item.structure)}
                className="w-full max-h-56 object-contain mx-auto cursor-zoom-in transition-transform duration-200 hover:scale-[1.01]"
              />
              <div className="absolute top-2 right-2 flex items-center gap-1 opacity-90 group-hover/img:opacity-100 transition-opacity bg-black/70 backdrop-blur-md rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => onPreviewImage(item.imageUrl!, item.imageCaption || item.structure)}
                  className="p-1 text-white hover:text-blue-300 transition-colors cursor-pointer"
                  title="Ampliar imagem"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-1 text-white hover:text-blue-300 transition-colors cursor-pointer"
                  title="Trocar foto"
                >
                  <Upload className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onUpdate({ ...item, imageUrl: undefined, imageCaption: undefined })}
                  className="p-1 text-white hover:text-rose-400 transition-colors cursor-pointer"
                  title="Remover imagem"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <input
              type="text"
              value={item.imageCaption || ""}
              onChange={(e) => onUpdate({ ...item, imageCaption: e.target.value })}
              placeholder="Legenda da lâmina (ex: Tecido ósseo trabecular, 400x)..."
              className="w-full text-[11px] text-slate-500 dark:text-slate-400 bg-transparent border-b border-dashed border-slate-200 dark:border-slate-800 px-1 py-0.5 focus:outline-hidden focus:border-blue-400"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 py-4 px-3 rounded-xl border border-dashed border-blue-200 dark:border-blue-900/60 bg-blue-50/30 dark:bg-blue-950/20 hover:bg-blue-100/50 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 transition-all text-xs font-semibold cursor-pointer group/upload shadow-2xs"
          >
            <ImageIcon className="w-4 h-4 text-blue-600 dark:text-blue-400 group-hover/upload:scale-110 transition-transform" />
            <span>Adicionar Foto da Lâmina / Tecido</span>
          </button>
        )}

        {/* Description directly editable */}
        <div className="space-y-1">
          <EditableAnswerBlock
            value={item.description}
            onChange={(newDesc) => onUpdate({ ...item, description: newDesc })}
            badgeLabel={type === "histology" ? "Descrição Histológica" : "Descrição Anatômica"}
          />
        </div>

        {/* Key Features / Características */}
        <div className="space-y-1.5 pt-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Características-Chave:
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {(item.features || []).map((f, j) => (
              <span
                key={j}
                className="group/tag inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs text-slate-700 dark:text-slate-300"
              >
                <span>{f}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveFeature(j)}
                  className="text-slate-400 hover:text-rose-500 opacity-60 group-hover/tag:opacity-100 transition-opacity cursor-pointer"
                  title="Remover característica"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}

            {isAddingTag ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  autoFocus
                  value={newTagText}
                  onChange={(e) => setNewTagText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddFeature();
                    if (e.key === "Escape") setIsAddingTag(false);
                  }}
                  onBlur={handleAddFeature}
                  placeholder="Nova característica..."
                  className="text-xs px-2 py-0.5 rounded-md border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden"
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsAddingTag(true)}
                className="inline-flex items-center gap-1 rounded-md border border-dashed border-slate-300 dark:border-slate-700 px-2 py-0.5 text-xs text-slate-500 dark:text-slate-400 hover:text-blue-600 hover:border-blue-400 transition-colors cursor-pointer"
              >
                <Plus className="w-2.5 h-2.5" />
                <span>Adicionar característica</span>
              </button>
            )}
          </div>
        </div>

        {/* Clinical Relevance */}
        {item.clinicalRelevance && (
          <div className="text-xs pt-1 border-t border-slate-100 dark:border-slate-800/80">
            <span className="font-semibold text-slate-500 dark:text-slate-400 mr-1">Relevância:</span>
            <span className="text-slate-700 dark:text-slate-300">{item.clinicalRelevance}</span>
          </div>
        )}
      </div>
    </div>
  );
}

const BADGE_COLORS: Record<string, string> = {
  morfologia: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200/60 dark:border-indigo-800/40",
  histologia: "bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border-teal-200/60 dark:border-teal-800/40",
  anatomia: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/40",
  fisiologia: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border-sky-200/60 dark:border-sky-800/40",
  patologia: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200/60 dark:border-rose-800/40",
  clinica: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/40",
  clínica: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/40",
  exames: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200/60 dark:border-blue-800/40",
};

function AreaBadge({ area }: { area: string }) {
  const style = BADGE_COLORS[area.toLowerCase()] || "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700";
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-semibold uppercase tracking-wider border", style)}>
      {areaLabel(area)}
    </span>
  );
}

/* ───────────────────────────── Section Container ───────────────────────────── */

function DossierSection({
  id,
  title,
  icon: Icon,
  badge,
  children,
}: {
  id: string;
  title: string;
  icon: React.ElementType;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 space-y-4 pt-2">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <Icon className="h-4 w-4" />
          </div>
          <h3 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
            {title}
          </h3>
        </div>
        {badge}
      </div>
      {children}
    </section>
  );
}

/* ───────────────────────────── Main Component ───────────────────────────── */

type ViewMode = "summary" | "questions" | "morphology" | "cases" | "mindmap";

interface AtelieResultViewProps {
  analysis: AtelieAnalysis;
  onBack?: () => void;
}

export default function AtelieResultView({ analysis, onBack }: AtelieResultViewProps) {
  const { updateAtelieAnalysis } = useAppStore();
  const printerRef = useRef<TranscriptionViewerHandle>(null);

  const { result } = analysis;
  const markdown = useMemo(() => atelieToMarkdown(result), [result]);
  const stats = useMemo(() => atelieStats(result), [result]);

  const [viewMode, setViewMode] = useState<ViewMode>("summary");
  const [copiedText, setCopiedText] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [isMapLoading, setIsMapLoading] = useState(false);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [isQuestionsLoading, setIsQuestionsLoading] = useState(false);
  const [isEditingSummary, setIsEditingSummary] = useState(true); // Edição direta instantânea ativa por padrão!
  const [saveStatusSummary, setSaveStatusSummary] = useState<"saved" | "saving">("saved");
  const autoSaveSummaryTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isExportingSummaryPdf, setIsExportingSummaryPdf] = useState(false);
  const [summaryDraft, setSummaryDraft] = useState("");
  const lastSavedSummaryRef = useRef<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [openQuestions, setOpenQuestions] = useState<Set<number>>(new Set([0, 1]));

  const activeSummaryMarkdown = useMemo(() => {
    if (
      analysis.customSummaryMarkdown &&
      analysis.customSummaryMarkdown === lastSavedSummaryRef.current
    ) {
      return analysis.customSummaryMarkdown;
    }
    const rawMd =
      analysis.customSummaryMarkdown && analysis.customSummaryMarkdown.includes("Perguntas e Atividades do Roteiro")
        ? cleanLegacyThemeAndRelevanceQuotes(analysis.customSummaryMarkdown)
        : buildSummaryMarkdown(result);
    const baseMd = reorderAtelieMarkdown(rawMd);
    const syncedMd = syncMorphologyAttachmentsIntoMarkdown(baseMd, result);
    return formatDenseProseParagraphsIntoBullets(syncedMd);
  }, [analysis.customSummaryMarkdown, result]);

  useEffect(() => {
    if (
      analysis.customSummaryMarkdown &&
      analysis.customSummaryMarkdown === lastSavedSummaryRef.current
    ) {
      return;
    }
    setSummaryDraft(activeSummaryMarkdown);
  }, [activeSummaryMarkdown, analysis.customSummaryMarkdown]);

  const handleSummaryEditorChange = useCallback((newText: string) => {
    setSummaryDraft(newText);
    setSaveStatusSummary("saving");

    if (autoSaveSummaryTimerRef.current) {
      clearTimeout(autoSaveSummaryTimerRef.current);
    }
    autoSaveSummaryTimerRef.current = setTimeout(() => {
      lastSavedSummaryRef.current = newText;
      updateAtelieAnalysis(analysis.id, {
        customSummaryMarkdown: newText,
      });
      setSaveStatusSummary("saved");
    }, 800);
  }, [analysis.id, updateAtelieAnalysis]);

  // Handle direct in-place AI selection apply (replace selection or insert below)
  useEffect(() => {
    const handleApplySelection = (e: Event) => {
      const customEvent = e as CustomEvent<{
        mode: "replace" | "insertBelow";
        selectedText: string;
        resultText: string;
        targetElement: HTMLElement | null;
      }>;
      const { mode, selectedText, resultText } = customEvent.detail || {};
      if (!selectedText || !resultText) return;

      const baseText = isEditingSummary ? summaryDraft : activeSummaryMarkdown;
      const updated = replaceInMarkdown(baseText, selectedText, resultText, mode);
      if (updated !== baseText) {
        customEvent.preventDefault();
        setSummaryDraft(updated);
        updateAtelieAnalysis(analysis.id, {
          customSummaryMarkdown: updated,
        });
      }
    };

    window.addEventListener("medsetup:apply-ai-selection", handleApplySelection);
    return () => window.removeEventListener("medsetup:apply-ai-selection", handleApplySelection);
  }, [summaryDraft, activeSummaryMarkdown, isEditingSummary, analysis.id, updateAtelieAnalysis]);

  // PDF Preview Modal
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewPdfName, setPreviewPdfName] = useState<string>("");

  // Image Preview Modal
  const [previewImage, setPreviewImage] = useState<{ url: string; caption?: string } | null>(null);

  /* ───── actions ───── */

  const handleCopyFormatted = async () => {
    const ok = await copyRichText(analysis.customMarkdown || markdown);
    if (ok) {
      setCopiedText(true);
      toast.success("Copiado com formatação perfeita para qualquer aplicativo!", { icon: "📋" });
      setTimeout(() => setCopiedText(false), 2500);
    } else {
      toast.error("Erro ao copiar.");
    }
  };

  const handleCopySummary = async () => {
    try {
      const textToCopy = isEditingSummary ? summaryDraft : activeSummaryMarkdown;
      await copyRichText(textToCopy);
      setCopiedSummary(true);
      toast.success("Resumo teórico copiado com formatação perfeita!");
      setTimeout(() => setCopiedSummary(false), 2000);
    } catch {
      toast.error("Erro ao copiar resumo.");
    }
  };

  const handleExportSummaryPdf = async () => {
    setIsExportingSummaryPdf(true);
    const toastId = toast.loading("Gerando PDF do resumo teórico...");
    try {
      const baseName = (analysis.fileName || result.title || analysis.title || "Resumo SP").replace(/\.[^/.]+$/, "").trim();
      const contentToExport = isEditingSummary ? summaryDraft : activeSummaryMarkdown;
      await exportDocumentToProfessionalPdf({
        title: `${result.title || "Resumo Teórico"} — Resumo Completo`,
        content: contentToExport,
        filename: `${baseName} - Resumo Completo.pdf`,
        expanded: false,
        theme: "azul",
      });
      toast.success("PDF do resumo exportado com sucesso!", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Erro ao exportar PDF do resumo.", { id: toastId });
    } finally {
      setIsExportingSummaryPdf(false);
    }
  };

  const handleSaveSummaryMarkdown = (newMd: string) => {
    updateAtelieAnalysis(analysis.id, {
      customSummaryMarkdown: newMd,
    });
    toast.success("Resumo teórico salvo com sucesso!");
  };

  const handleExportPdf = async () => {
    const toastId = toast.loading("Gerando PDF com formatação original vetorial...");
    try {
      const baseName = (analysis.fileName || result.title || analysis.title || "Roteiro SP").replace(/\.[^/.]+$/, "").trim();
      const filename = `${baseName} Atelie.pdf`;
      await exportDocumentToProfessionalPdf({
        title: result.title || analysis.title,
        content: analysis.customMarkdown || markdown,
        filename,
        expanded: false,
        theme: "azul",
      });
      toast.success("PDF profissional da SP gerado com sucesso!", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Erro ao exportar PDF.", { id: toastId });
    }
  };

  const handleGenerateSummary = async () => {
    setIsSummaryLoading(true);
    const toastId = toast.loading("Aprofundando síntese teórica em tópicos com IA...");
    try {
      const res = await fetch("/api/ai/generate-atelie-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: result.title,
          theme: result.theme,
          summary: result.summary,
          contextText: markdown,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Falha ao sintetizar o tema.");
      }

      const data = await res.json();
      const topics: AtelieTopic[] = data.topics || [];

      if (topics.length === 0) throw new Error("Nenhum tópico gerado.");

      const updatedResult = { ...result, detailedSummary: topics };
      updateAtelieAnalysis(analysis.id, {
        result: updatedResult,
        customSummaryMarkdown: buildSummaryMarkdown(updatedResult),
      });

      toast.success("Síntese teórica gerada com sucesso!", { id: toastId });
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar resumo.", { id: toastId });
    } finally {
      setIsSummaryLoading(false);
    }
  };

  const handleGenerateMindMap = async () => {
    setIsMapLoading(true);
    const toastId = toast.loading("Construindo mapa mental da SP...");
    try {
      const prompt = `Mapa mental conceitual médico da Situação-Problema "${result.title}". Síntese clínica: ${result.theme || ""}. Ramos fundamentais: Fisiopatologia, Histopatologia, Diagnóstico e Exames, Casos Clínicos, Condutas e Tratamento. Seja preciso, conciso (máximo 5 palavras por nó) e profissional.\n\nConteúdo:\n${markdown.slice(0, 14000)}`;

      const res = await fetch("/api/ai/generate-mindmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, colorTheme: "blue", layout: "free", expand: true }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Falha ao gerar mapa mental.");
      }

      const data = await res.json();
      updateAtelieAnalysis(analysis.id, {
        mindMap: { title: data.title || result.title, nodes: data.nodes || [], edges: data.edges || [] },
      });
      setViewMode("mindmap");
      toast.success("Mapa mental pronto!", { id: toastId });
    } catch (e: any) {
      toast.error(e.message || "Erro no mapa mental.", { id: toastId });
    } finally {
      setIsMapLoading(false);
    }
  };

  const handleGenerateFlashcardsFromAtelie = () => {
    const cleanSubject = extractCleanSubject(result.title, result.theme);
    const folder = useAppStore.getState().getOrCreateFolder(cleanSubject, "both");
    const timestamp = Date.now();

    // 1. Perguntas da SP (Conceitos & Fisiopatologia)
    const conceptCards: Flashcard[] = [];
    (result.questions || []).forEach((q, idx) => {
      if (q.question && q.answer) {
        conceptCards.push({
          id: `card_concept_${timestamp}_${idx}`,
          front: cleanQuestionTitle(q.question),
          back: shortenCardAnswer(q.answer, 150),
        });
      }
    });

    // 2. Anatomia & Morfologia Aplicada
    const anatomyCards: Flashcard[] = [];
    (result.anatomy || []).forEach((a, idx) => {
      if (a.structure) {
        const structName = a.structure.trim();
        if (a.description) {
          anatomyCards.push({
            id: `card_anat_desc_${timestamp}_${idx}`,
            front: `${structName}: Quais as características anatômicas principais e eixos?`,
            back: shortenCardAnswer(a.description, 140),
          });
        }
        if (a.clinicalRelevance) {
          anatomyCards.push({
            id: `card_anat_rel_${timestamp}_${idx}`,
            front: `${structName}: Qual a relevância clínica ou cirúrgica principal?`,
            back: shortenCardAnswer(a.clinicalRelevance, 140),
          });
        }
      }
    });

    // 3. Histologia & Lâminas
    const histologyCards: Flashcard[] = [];
    (result.histology || []).forEach((h, idx) => {
      if (h.structure) {
        const structName = h.structure.trim();
        if (h.description) {
          histologyCards.push({
            id: `card_histo_desc_${timestamp}_${idx}`,
            front: `${structName}: Quais os critérios histológicos cardinais de identificação?`,
            back: shortenCardAnswer(h.description, 140),
          });
        }
        const rel = [h.staining ? `Coloração: ${h.staining}` : null, h.clinicalRelevance].filter(Boolean).join(". ");
        if (rel) {
          histologyCards.push({
            id: `card_histo_rel_${timestamp}_${idx}`,
            front: `${structName}: Coloração utilizada e correlação patológica?`,
            back: shortenCardAnswer(rel, 140),
          });
        }
      }
    });

    // 4. Casos Clínicos & Condutas
    const clinicalCards: Flashcard[] = [];
    (result.clinicalCases || []).forEach((c, cIdx) => {
      const caseLabel = c.title ? c.title.replace(/^Caso\s*\d*\s*[:\-]\s*/i, "").trim() : `Caso ${cIdx + 1}`;
      (c.answers || []).forEach((ans, aIdx) => {
        if (ans.question && ans.answer) {
          clinicalCards.push({
            id: `card_clin_${timestamp}_${cIdx}_${aIdx}`,
            front: `${caseLabel ? `[${caseLabel}] ` : ""}${cleanQuestionTitle(ans.question)}`,
            back: shortenCardAnswer(ans.answer, 140),
          });
        }
      });
    });

    // 5. Propedêutica & Biomarcadores
    const examCards: Flashcard[] = [];
    (result.exams || []).forEach((ex, eIdx) => {
      (ex.markers || []).forEach((m, mIdx) => {
        if (m.name && m.explanation) {
          examCards.push({
            id: `card_exam_${timestamp}_${eIdx}_${mIdx}`,
            front: `Marcador ${m.name}: Qual seu papel e significado clínico (${ex.name})?`,
            back: shortenCardAnswer(`${m.explanation}${m.significance ? ` — ${m.significance}` : ""}`, 140),
          });
        }
      });
      if (!ex.markers || ex.markers.length === 0) {
        if (ex.summary || ex.interpretation) {
          examCards.push({
            id: `card_exam_sum_${timestamp}_${eIdx}`,
            front: `Exame ${ex.name}: Qual a indicação e resultado esperado?`,
            back: shortenCardAnswer(ex.summary || ex.interpretation || "", 140),
          });
        }
      }
    });

    const totalCards = conceptCards.length + anatomyCards.length + histologyCards.length + clinicalCards.length + examCards.length;

    if (totalCards === 0) {
      toast.error("Nenhum dado estruturado suficiente para gerar flashcards.");
      return;
    }

    const createdDecks: Deck[] = [];

    const pushDeck = (subName: string, desc: string, cards: Flashcard[]) => {
      if (cards.length === 0) return;
      const deck: Deck = {
        id: `deck_sp_${timestamp}_${createdDecks.length}`,
        name: `${cleanSubject} • ${subName}`,
        description: desc,
        subject: cleanSubject,
        folderId: folder.id,
        cardCount: cards.length,
        cards,
        difficulty: "Médio",
      };
      createdDecks.push(deck);
      useAppStore.getState().addDeck(deck);
    };

    pushDeck("Conceitos & Fisiopatologia", `Perguntas-chave e mecanismos de ${cleanSubject}.`, conceptCards);
    pushDeck("Anatomia & Morfologia", `Estruturas anatômicas, formato e eixos de ${cleanSubject}.`, anatomyCards);
    pushDeck("Histologia & Lâminas", `Critérios microscópicos e lâminas de ${cleanSubject}.`, histologyCards);
    pushDeck("Casos Clínicos & Conduta", `Resolução dos casos clínicos e condutas de ${cleanSubject}.`, clinicalCards);
    pushDeck("Propedêutica & Exames", `Exames complementares e biomarcadores de ${cleanSubject}.`, examCards);

    toast.success(`🎉 ${createdDecks.length} baralhos temáticos criados na pasta "${folder.name}" (${totalCards} flashcards objetivos)!`, {
      duration: 4500,
    });
  };

  const handleGenerateQuestionsFromAtelie = async () => {
    setIsQuestionsLoading(true);
    const cleanSubject = extractCleanSubject(result.title, result.theme);
    const folder = useAppStore.getState().getOrCreateFolder(cleanSubject, "both");
    const timestamp = Date.now();
    const toastId = toast.loading(`Elaborando questões clínicas detalhadas sobre "${cleanSubject}" com IA...`);

    try {
      const summaryContext = [
        `Tema: ${cleanSubject}`,
        result.summary ? `Resumo Geral: ${result.summary}` : null,
        result.questions?.length ? `Perguntas Centrais: ${result.questions.map((q) => q.question).join(" | ")}` : null,
        result.clinicalCases?.length
          ? `Casos Clínicos: ${result.clinicalCases.map((c) => `${c.title}: ${c.summary || ""}`).join(" | ")}`
          : null,
        result.anatomy?.length ? `Anatomia: ${result.anatomy.map((a) => a.structure).join(", ")}` : null,
        result.histology?.length ? `Histologia: ${result.histology.map((h) => h.structure).join(", ")}` : null,
      ]
        .filter(Boolean)
        .join("\n");

      const res = await fetch("/api/ai/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Gere 6 questões de nível MÉDIO baseadas no estudo e roteiro de "${cleanSubject}".
DIRETRIZES FUNDAMENTAIS:
1. Enunciados clínicos contextualizados, objetivos e bem elaborados (vinheta clínica ou caso prático conciso), evitando textos gigantescos desnecessários.
2. Dificuldade MÉDIA: raciocínio clínico, diagnóstico diferencial, morfologia aplicada e conduta.
3. 5 alternativas (A a E) bem elaboradas com distratores médicos plausíveis e pertinentes ao tema (NUNCA genéricas).
4. QUESTÕES RANDOMIZADAS E NÃO ÓBVIAS: Distratores inteligentes e plausíveis. Varie naturalmente a extensão das alternativas, sem padrão repetitivo e sem fazer a correta ser sempre a mais longa.
5. Gabarito comentado com fundamentação clara.
Contexto:\n${summaryContext.slice(0, 8000)}`,
          count: 6,
          difficulty: "medium",
          type: "multiple_choice",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const aiQuestions = Array.isArray(data.questions) ? data.questions : [];
        if (aiQuestions.length > 0) {
          const formattedQuestions = aiQuestions.map((q: any, idx: number) => ({
            id: `q_sp_ai_${timestamp}_${idx}`,
            text: cleanQuestionTitle(q.question),
            type: "multiple-choice",
            difficulty: "Médio",
            subject: cleanSubject,
            folderId: folder.id,
            options: (q.options || []).map((opt: any) => ({
              id: opt.id || "a",
              text: opt.text || "",
            })),
            answer: q.answer || "a",
            explanation: q.explanation || "",
            date: "Hoje",
            status: "unanswered",
            timesAnswered: 0,
            timesCorrect: 0,
            timesIncorrect: 0,
          }));

          useAppStore.getState().addQuestions(formattedQuestions);
          toast.success(`🎉 ${formattedQuestions.length} questões clínicas detalhadas adicionadas na pasta "${folder.name}"!`, {
            id: toastId,
            duration: 4000,
          });
          return;
        }
      }
    } catch (e) {
      console.warn("AI Question generation failed, falling back to structured clinical questions:", e);
    } finally {
      setIsQuestionsLoading(false);
    }

    // Fallback: Local intelligent generation from Atelie questions and clinical cases
    const questionsList: any[] = [];

    const plausibleDistractors = [
      "Indicação imediata de histerectomia total sem necessidade de propedêutica armada prévia.",
      "Diagnóstico de atrofia endometrial com conduta expectante e reavaliação anual sem biópsia.",
      "Quadro secundário a coagulopatia congênita com indicação de reposição isolada de fator de von Willebrand.",
      "Suspeita de leiomiomatose subserosa volumosa com indicação cirúrgica aberta prioritária.",
      "Achado fisiológico próprio do climatério sem correlação com patologia estrutural pélvica.",
      "Conduta com progestágeno isolado em dose baixa sem estudo histopatológico prévio.",
    ];

    const getPlausibleOptions = (correctText: string, seed: number) => {
      const distractors = [
        plausibleDistractors[(seed * 2) % plausibleDistractors.length],
        plausibleDistractors[(seed * 2 + 1) % plausibleDistractors.length],
        plausibleDistractors[(seed * 2 + 2) % plausibleDistractors.length],
      ];
      const allOpts = [correctText, ...distractors].sort(() => Math.random() - 0.5);
      const correctIdx = allOpts.indexOf(correctText);
      const letterMap = ["a", "b", "c", "d"];

      return {
        options: allOpts.map((opt, oIdx) => ({
          id: letterMap[oIdx] || `opt_${oIdx}`,
          text: opt,
        })),
        answer: letterMap[correctIdx] || "a",
      };
    };

    const formatOption = (ans: string) => {
      const cleaned = ans.replace(/\*\*/g, "").replace(/^[-*•]\s*/, "").trim();
      if (cleaned.length <= 160) return cleaned;
      const firstSentenceEnd = cleaned.indexOf(". ");
      if (firstSentenceEnd > 40 && firstSentenceEnd < 180) {
        return cleaned.slice(0, firstSentenceEnd + 1);
      }
      return cleaned.slice(0, 160).replace(/[,;\s]+$/, "") + "...";
    };

    // 1. Perguntas da SP
    (result.questions || []).forEach((q, idx) => {
      if (q.question && q.answer) {
        const correctAns = formatOption(q.answer);
        const { options, answer } = getPlausibleOptions(correctAns, idx);

        questionsList.push({
          id: `q_sp_${timestamp}_${questionsList.length}`,
          text: cleanQuestionTitle(q.question),
          type: "multiple-choice",
          difficulty: "Médio",
          subject: cleanSubject,
          folderId: folder.id,
          options,
          answer,
          explanation: q.answer,
          date: "Hoje",
          status: "unanswered",
          timesAnswered: 0,
          timesCorrect: 0,
          timesIncorrect: 0,
        });
      }
    });

    // 2. Casos clínicos
    (result.clinicalCases || []).forEach((c, cIdx) => {
      (c.answers || []).forEach((ans, aIdx) => {
        if (ans.question && ans.answer) {
          const correctAns = formatOption(ans.answer);
          const { options, answer } = getPlausibleOptions(correctAns, cIdx * 3 + aIdx);

          questionsList.push({
            id: `q_sp_${timestamp}_${questionsList.length}`,
            text: cleanQuestionTitle(ans.question),
            type: "multiple-choice",
            difficulty: "Médio",
            subject: cleanSubject,
            folderId: folder.id,
            options,
            answer,
            explanation: ans.answer,
            date: "Hoje",
            status: "unanswered",
            timesAnswered: 0,
            timesCorrect: 0,
            timesIncorrect: 0,
          });
        }
      });
    });

    if (questionsList.length === 0) {
      toast.error("Nenhuma questão estruturada encontrada para exportar.", { id: toastId });
      return;
    }

    useAppStore.getState().addQuestions(questionsList);
    toast.success(`🎉 ${questionsList.length} questões clínicas estruturadas adicionadas na pasta "${folder.name}"!`, {
      id: toastId,
      duration: 4000,
    });
  };

  const toggleQuestion = (idx: number) => {
    setOpenQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleUpdateQuestionAnswer = (idx: number, newAnswer: string) => {
    const updatedQuestions = [...(result.questions || [])];
    if (!updatedQuestions[idx]) return;
    if (updatedQuestions[idx].answer === newAnswer) return;
    updatedQuestions[idx] = { ...updatedQuestions[idx], answer: newAnswer };
    const updatedResult = { ...result, questions: updatedQuestions };
    const updatedMarkdown = atelieToMarkdown(updatedResult);
    updateAtelieAnalysis(analysis.id, {
      result: updatedResult,
      customMarkdown: updatedMarkdown,
    });
  };

  const handleUpdateClinicalCaseAnswer = (caseIdx: number, ansIdx: number, newAnswer: string) => {
    const updatedCases = [...(result.clinicalCases || [])];
    if (!updatedCases[caseIdx]) return;
    const targetCase = { ...updatedCases[caseIdx] };
    const updatedAnswers = [...(targetCase.answers || [])];
    if (!updatedAnswers[ansIdx]) return;
    if (updatedAnswers[ansIdx].answer === newAnswer) return;
    updatedAnswers[ansIdx] = { ...updatedAnswers[ansIdx], answer: newAnswer };
    targetCase.answers = updatedAnswers;
    updatedCases[caseIdx] = targetCase;
    const updatedResult = { ...result, clinicalCases: updatedCases };
    const updatedMarkdown = atelieToMarkdown(updatedResult);
    updateAtelieAnalysis(analysis.id, {
      result: updatedResult,
      customMarkdown: updatedMarkdown,
    });
  };

  const handleUpdateCaseTranscription = (caseIdx: number, newTranscription: string) => {
    const updatedCases = [...(result.clinicalCases || [])];
    if (!updatedCases[caseIdx]) return;
    if (updatedCases[caseIdx].caseTranscription === newTranscription) return;
    updatedCases[caseIdx] = { ...updatedCases[caseIdx], caseTranscription: newTranscription };
    const updatedResult = { ...result, clinicalCases: updatedCases };
    const updatedMarkdown = atelieToMarkdown(updatedResult);
    updateAtelieAnalysis(analysis.id, {
      result: updatedResult,
      customMarkdown: updatedMarkdown,
    });
  };

  const handleUpdateHistology = (index: number, updated: AtelieStructure) => {
    const list = [...(result.histology || [])];
    list[index] = updated;
    const updatedResult = { ...result, histology: list };
    const updatedMarkdown = syncMarkdownWithResult(analysis.customMarkdown, updatedResult);
    const updatedSummaryMarkdown = analysis.customSummaryMarkdown
      ? syncMorphologyAttachmentsIntoMarkdown(analysis.customSummaryMarkdown, updatedResult)
      : undefined;
    updateAtelieAnalysis(analysis.id, {
      result: updatedResult,
      customMarkdown: updatedMarkdown,
      ...(updatedSummaryMarkdown ? { customSummaryMarkdown: updatedSummaryMarkdown } : {}),
    });
  };

  const handleAddHistology = () => {
    const newItem: AtelieStructure = {
      structure: `Nova Lâmina ${result.histology.length + 1}`,
      staining: "HE",
      description: "Descreva as características citológicas, padrão tecidual e achados histológicos...",
      features: ["Padrão tecidual", "Células características"],
      request: "",
      clinicalRelevance: "",
    };
    const list = [...(result.histology || []), newItem];
    const updatedResult = { ...result, histology: list };
    const updatedMarkdown = syncMarkdownWithResult(analysis.customMarkdown, updatedResult);
    updateAtelieAnalysis(analysis.id, {
      result: updatedResult,
      customMarkdown: updatedMarkdown,
    });
    toast.success("Nova lâmina adicionada! Adicione a foto do tecido e os detalhes.", { icon: "🔬" });
  };

  const handleDeleteHistology = (index: number) => {
    const list = result.histology.filter((_, i) => i !== index);
    const updatedResult = { ...result, histology: list };
    const updatedMarkdown = syncMarkdownWithResult(analysis.customMarkdown, updatedResult);
    const updatedSummaryMarkdown = analysis.customSummaryMarkdown
      ? syncMorphologyAttachmentsIntoMarkdown(analysis.customSummaryMarkdown, updatedResult)
      : undefined;
    updateAtelieAnalysis(analysis.id, {
      result: updatedResult,
      customMarkdown: updatedMarkdown,
      ...(updatedSummaryMarkdown ? { customSummaryMarkdown: updatedSummaryMarkdown } : {}),
    });
    toast.success("Lâmina removida.");
  };

  const handleUpdateAnatomy = (index: number, updated: AtelieStructure) => {
    const list = [...(result.anatomy || [])];
    list[index] = updated;
    const updatedResult = { ...result, anatomy: list };
    const updatedMarkdown = syncMarkdownWithResult(analysis.customMarkdown, updatedResult);
    const updatedSummaryMarkdown = analysis.customSummaryMarkdown
      ? syncMorphologyAttachmentsIntoMarkdown(analysis.customSummaryMarkdown, updatedResult)
      : undefined;
    updateAtelieAnalysis(analysis.id, {
      result: updatedResult,
      customMarkdown: updatedMarkdown,
      ...(updatedSummaryMarkdown ? { customSummaryMarkdown: updatedSummaryMarkdown } : {}),
    });
  };

  const handleAddAnatomy = () => {
    const newItem: AtelieStructure = {
      structure: `Nova Estrutura Anatômica ${result.anatomy.length + 1}`,
      staining: "",
      description: "Descreva a morfologia, vascularização, inervação e relações anatômicas...",
      features: ["Relação anatômica 1", "Relação 2"],
      request: "",
      clinicalRelevance: "",
    };
    const list = [...(result.anatomy || []), newItem];
    const updatedResult = { ...result, anatomy: list };
    const updatedMarkdown = syncMarkdownWithResult(analysis.customMarkdown, updatedResult);
    updateAtelieAnalysis(analysis.id, {
      result: updatedResult,
      customMarkdown: updatedMarkdown,
    });
    toast.success("Nova estrutura anatômica adicionada!", { icon: "🦴" });
  };

  const handleDeleteAnatomy = (index: number) => {
    const list = result.anatomy.filter((_, i) => i !== index);
    const updatedResult = { ...result, anatomy: list };
    const updatedMarkdown = syncMarkdownWithResult(analysis.customMarkdown, updatedResult);
    const updatedSummaryMarkdown = analysis.customSummaryMarkdown
      ? syncMorphologyAttachmentsIntoMarkdown(analysis.customSummaryMarkdown, updatedResult)
      : undefined;
    updateAtelieAnalysis(analysis.id, {
      result: updatedResult,
      customMarkdown: updatedMarkdown,
      ...(updatedSummaryMarkdown ? { customSummaryMarkdown: updatedSummaryMarkdown } : {}),
    });
    toast.success("Estrutura anatômica removida.");
  };

  // Gerar o Resumo Completo de imediato se ainda não existir
  useEffect(() => {
    if ((!result.detailedSummary || result.detailedSummary.length === 0) && !isSummaryLoading) {
      handleGenerateSummary();
    }
  }, [analysis.id]);

  const handleUpdateTopicTitle = (tIdx: number, newTitle: string) => {
    const list = [...(result.detailedSummary || [])];
    if (!list[tIdx]) return;
    list[tIdx] = { ...list[tIdx], topic: newTitle };
    const updatedResult = { ...result, detailedSummary: list };
    const updatedMarkdown = atelieToMarkdown(updatedResult);
    updateAtelieAnalysis(analysis.id, {
      result: updatedResult,
      customMarkdown: updatedMarkdown,
    });
  };

  const handleUpdateSubtopic = (
    tIdx: number,
    sIdx: number,
    updated: { title?: string; content?: string; keyPoints?: string[] }
  ) => {
    const list = [...(result.detailedSummary || [])];
    if (!list[tIdx]) return;
    const subList = [...(list[tIdx].subtopics || [])];
    if (!subList[sIdx]) return;
    subList[sIdx] = { ...subList[sIdx], ...updated };
    list[tIdx] = { ...list[tIdx], subtopics: subList };
    const updatedResult = { ...result, detailedSummary: list };
    const updatedMarkdown = atelieToMarkdown(updatedResult);
    updateAtelieAnalysis(analysis.id, {
      result: updatedResult,
      customMarkdown: updatedMarkdown,
    });
  };

  const handleAddTopic = () => {
    const newTopic: AtelieTopic = {
      topic: `Novo Tópico ${(result.detailedSummary?.length || 0) + 1}`,
      subtopics: [
        {
          title: "Novo Subtópico",
          content: "Digite a fundamentação teórica deste subtópico...",
          keyPoints: ["Ponto importante"],
        },
      ],
    };
    const list = [...(result.detailedSummary || []), newTopic];
    const updatedResult = { ...result, detailedSummary: list };
    const updatedMarkdown = atelieToMarkdown(updatedResult);
    updateAtelieAnalysis(analysis.id, {
      result: updatedResult,
      customMarkdown: updatedMarkdown,
    });
    toast.success("Novo tópico adicionado ao resumo!", { icon: "✨" });
  };

  const handleDeleteTopic = (tIdx: number) => {
    const list = (result.detailedSummary || []).filter((_, i) => i !== tIdx);
    const updatedResult = { ...result, detailedSummary: list };
    const updatedMarkdown = atelieToMarkdown(updatedResult);
    updateAtelieAnalysis(analysis.id, {
      result: updatedResult,
      customMarkdown: updatedMarkdown,
    });
    toast.success("Tópico removido.");
  };

  const handleAddSubtopic = (tIdx: number) => {
    const list = [...(result.detailedSummary || [])];
    if (!list[tIdx]) return;
    const subList = [
      ...(list[tIdx].subtopics || []),
      {
        title: `Novo Subtópico ${(list[tIdx].subtopics?.length || 0) + 1}`,
        content: "Digite a fundamentação teórica...",
        keyPoints: [],
      },
    ];
    list[tIdx] = { ...list[tIdx], subtopics: subList };
    const updatedResult = { ...result, detailedSummary: list };
    const updatedMarkdown = atelieToMarkdown(updatedResult);
    updateAtelieAnalysis(analysis.id, {
      result: updatedResult,
      customMarkdown: updatedMarkdown,
    });
  };

  const handleDeleteSubtopic = (tIdx: number, sIdx: number) => {
    const list = [...(result.detailedSummary || [])];
    if (!list[tIdx]) return;
    const subList = list[tIdx].subtopics.filter((_, i) => i !== sIdx);
    list[tIdx] = { ...list[tIdx], subtopics: subList };
    const updatedResult = { ...result, detailedSummary: list };
    const updatedMarkdown = atelieToMarkdown(updatedResult);
    updateAtelieAnalysis(analysis.id, {
      result: updatedResult,
      customMarkdown: updatedMarkdown,
    });
  };

  const filteredQuestions = useMemo(() => {
    if (!searchQuery.trim()) return result.questions;
    const q = searchQuery.toLowerCase();
    return result.questions.filter(
      (item) =>
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q) ||
        item.area.toLowerCase().includes(q)
    );
  }, [result.questions, searchQuery]);

  return (
    <div className="space-y-6">
      {/* ──────────────────────── Top Dossier Header ──────────────────────── */}
      <header className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs dark:border-slate-800 dark:bg-[#12151e]">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2 max-w-5xl">
            {result.tutoria && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/40">
                  <Stethoscope className="h-3.5 w-3.5" />
                  Caso da Tutoria Integrado
                </span>
              </div>
            )}

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {result.title}
            </h1>

            {result.theme && (
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                {result.theme}
              </p>
            )}
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2 self-start">
            {(analysis.fileUrl || (analysis.files && analysis.files.length > 0)) && (
              <button
                type="button"
                onClick={() => {
                  const url = analysis.fileUrl || analysis.files?.[0]?.url;
                  if (url) {
                    setPreviewPdfUrl(url);
                    setPreviewPdfName(analysis.fileName || "Roteiro da SP");
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 transition-colors shadow-2xs cursor-pointer"
                title="Visualizar PDF original anexado"
              >
                <Eye className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Visualizar PDF</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleGenerateFlashcardsFromAtelie}
              className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 transition-colors shadow-2xs cursor-pointer"
              title="Gerar baralho de Flashcards a partir da SP"
            >
              <Layers className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Flashcards</span>
            </button>

            <button
              type="button"
              onClick={handleGenerateQuestionsFromAtelie}
              disabled={isQuestionsLoading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300 transition-colors shadow-2xs cursor-pointer disabled:opacity-60"
              title="Gerar Questões detalhadas a partir da SP"
            >
              {isQuestionsLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-600 dark:text-sky-400" />
              ) : (
                <HelpCircle className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
              )}
              <span>{isQuestionsLoading ? "Elaborando..." : "Questões"}</span>
            </button>

            <button
              type="button"
              onClick={analysis.mindMap ? () => setViewMode("mindmap") : handleGenerateMindMap}
              disabled={isMapLoading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 transition-colors cursor-pointer disabled:opacity-60"
            >
              {isMapLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <GitBranch className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />}
              <span>{analysis.mindMap ? "Ver Mapa Mental" : "Mapa Mental"}</span>
            </button>
          </div>
        </div>

        {/* Metric Badges */}
        <div className="mt-5 flex flex-wrap items-center gap-2 pt-4 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-400">
          <span className="font-semibold text-slate-900 dark:text-white mr-1">Conteúdo:</span>
          {stats.objectives > 0 && (
            <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5">
              <strong>{stats.objectives}</strong> objetivos
            </span>
          )}
          {stats.questions > 0 && (
            <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5">
              <strong>{stats.questions}</strong> perguntas
            </span>
          )}
          {stats.histology > 0 && (
            <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5">
              <strong>{stats.histology}</strong> lâminas/tecidos
            </span>
          )}
          {stats.cases > 0 && (
            <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5">
              <strong>{stats.cases}</strong> casos clínicos
            </span>
          )}
          {stats.exams > 0 && (
            <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5">
              <strong>{stats.exams}</strong> exames & biomarcadores
            </span>
          )}
        </div>
      </header>

      {/* Card do Arquivo / Roteiro Anexado (Visualização do PDF) */}
      {analysis.fileUrl && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-white dark:bg-[#12151e] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 border border-red-100 dark:border-red-900/40">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-300">
                  {analysis.fileName?.toLowerCase().endsWith(".pdf") ? "PDF Anexado" : "Roteiro da SP"}
                </span>
              </div>
              <p className="text-sm font-bold text-slate-900 dark:text-white truncate mt-0.5" title={analysis.fileName}>
                {analysis.fileName || "Roteiro Original da SP"}
              </p>
              {analysis.fileSize && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {(analysis.fileSize / (1024 * 1024)).toFixed(1)} MB
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              type="button"
              onClick={() => {
                const url = analysis.fileUrl || analysis.files?.[0]?.url;
                if (url) {
                  setPreviewPdfUrl(url);
                  setPreviewPdfName(analysis.fileName || "Roteiro da SP");
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Visualizar PDF</span>
            </button>

            <a
              href={analysis.fileUrl}
              download={analysis.fileName || "roteiro_sp.pdf"}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              title="Baixar roteiro original"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar Original</span>
            </a>
          </div>
        </div>
      )}

      {/* ──────────────────────── View Mode Selector ──────────────────────── */}
      <nav className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1">
        <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
          {[
            { id: "summary", label: "Resumo Completo", icon: Sparkles },
            { id: "questions", label: `Perguntas (${result.questions.length})`, icon: MessageSquareText },
            { id: "morphology", label: "Morfologia & Lâminas", icon: Microscope },
            { id: "cases", label: `Caso Clínico (${result.clinicalCases?.length || 1})`, icon: Stethoscope },
            { id: "mindmap", label: "Mapa Mental", icon: GitBranch },
          ].map((tab) => {
            const active = viewMode === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setViewMode(tab.id as ViewMode)}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-all cursor-pointer whitespace-nowrap",
                  active
                    ? "bg-blue-600 text-white shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/60"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ──────────────────────── MODE 1: RESUMO COMPLETO ──────────────────────── */}
      {viewMode === "summary" && (
        <div className="space-y-6">
          {/* Header Action Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-[#12151e]">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                Resumo Teórico Completo
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Texto acadêmico contínuo e aprofundado, formatado para leitura fluida e exportação
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Indicador de Edição Direta e Salvamento Automático */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 shadow-2xs">
                {saveStatusSummary === "saving" ? (
                  <>
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                    <span className="text-amber-700 dark:text-amber-300">Salvando alterações...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Edição direta ativa • Salvo automaticamente</span>
                  </>
                )}
              </div>

              {/* Copiar */}
              <button
                type="button"
                onClick={handleCopySummary}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-sm",
                  copiedSummary
                    ? "bg-blue-600 text-white"
                    : "bg-blue-50 text-blue-800 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800/60"
                )}
                title="Copiar texto formatado"
              >
                {copiedSummary ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSummary ? "Copiado!" : "Copiar"}</span>
              </button>

              {/* Exportar PDF */}
              <button
                type="button"
                onClick={handleExportSummaryPdf}
                disabled={isExportingSummaryPdf}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors cursor-pointer shadow-sm shadow-blue-500/20"
                title="Exportar Resumo como PDF"
              >
                {isExportingSummaryPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
                <span>Exportar PDF</span>
              </button>

              {/* Aprofundar com IA */}
              <button
                type="button"
                onClick={handleGenerateSummary}
                disabled={isSummaryLoading}
                className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/80 px-3.5 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300 transition-colors cursor-pointer disabled:opacity-60"
                title="Aprofundar e enriquecer este resumo com IA"
              >
                {isSummaryLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>Aprofundar com IA</span>
              </button>
            </div>
          </div>

          {/* Loading indicator when generating summary */}
          {isSummaryLoading && (
            <div className="rounded-2xl border border-blue-200 dark:border-blue-800/60 bg-blue-50/40 dark:bg-blue-950/20 p-12 text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400 mx-auto" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Gerando Resumo Teórico Completo...
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                A IA está aprofundando os conceitos centrais, histopatologia, diagnóstico e condutas em texto contínuo.
              </p>
            </div>
          )}

          {/* Document Sheet with Direct In-Place Editing */}
          <div className="relative w-full md:max-w-[calc(100%-108px)] lg:max-w-[880px] mx-auto">
            {/* Sumário Balão Flutuante do Lado Direito (sempre disponível) */}
            <NotionOutline
              content={summaryDraft || activeSummaryMarkdown}
              accentColor="blue"
            />

            <RichTextEditor
              value={summaryDraft}
              onChange={handleSummaryEditorChange}
              theme="azul"
              placeholder="Edite o resumo de ateliê diretamente com formatação rica..."
              minHeight="540px"
            />
          </div>
        </div>
      )}

      {/* ──────────────────────── MODE 3: PERGUNTAS & GABARITO ──────────────────────── */}
      {viewMode === "questions" && (
        <div className="w-full max-w-[880px] mx-auto space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar em perguntas e respostas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-hidden dark:border-slate-800 dark:bg-[#12151e] dark:text-white"
              />
            </div>
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => setOpenQuestions(new Set(result.questions.map((_, i) => i)))}
                className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer"
              >
                Expandir todas
              </button>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <button
                type="button"
                onClick={() => setOpenQuestions(new Set())}
                className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer"
              >
                Recolher todas
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {filteredQuestions.map((q, idx) => {
              const isOpen = openQuestions.has(idx);
              return (
                <div key={idx} className="rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-[#12151e] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleQuestion(idx)}
                    className="w-full flex items-start gap-3 p-4 sm:p-5 text-left hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-blue-100 text-xs font-bold text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 mt-0.5">
                      {q.number}
                    </span>
                    <div className="flex-1 space-y-1.5 min-w-0">
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">
                        {q.question}
                      </h4>
                    </div>
                    <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform shrink-0 mt-1", isOpen && "rotate-180")} />
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-5 sm:px-5 sm:pb-5 space-y-3 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <EditableAnswerBlock
                        value={q.answer}
                        onChange={(newVal) => handleUpdateQuestionAnswer(idx, newVal)}
                        badgeLabel="Resposta Fundamentada"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ──────────────────────── MODE 4: MORFOLOGIA & LÂMINAS ──────────────────────── */}
      {viewMode === "morphology" && (
        <div className="w-full max-w-[880px] mx-auto space-y-8">
          {/* Histologia & Lâminas Section */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Microscope className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span>Tecidos Histológicos & Lâminas Solicitadas</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300">
                    {result.histology?.length || 0}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Adicione fotos dos tecidos e lâminas vistas ao microscópio — sincronizadas automaticamente com o Ateliê e incluídas no PDF exportado
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddHistology}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-xs transition-colors cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar Lâmina Manualmente</span>
              </button>
            </div>

            {(!result.histology || result.histology.length === 0) ? (
              <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-8 text-center bg-slate-50/50 dark:bg-[#12151e]">
                <Microscope className="w-8 h-8 text-teal-500 mx-auto mb-2 opacity-60" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Nenhuma lâmina histológica cadastrada ainda.
                </p>
                <button
                  type="button"
                  onClick={handleAddHistology}
                  className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-teal-600 text-white hover:bg-teal-700 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar Primeira Lâmina</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.histology.map((hist, i) => (
                  <MorphologyCard
                    key={`hist-${i}`}
                    item={hist}
                    index={i}
                    type="histology"
                    onUpdate={(updated) => handleUpdateHistology(i, updated)}
                    onDelete={() => handleDeleteHistology(i)}
                    onPreviewImage={(url, caption) => setPreviewImage({ url, caption })}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Anatomia Section */}
          <div className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Bone className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Estruturas Anatômicas Solicitadas</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                    {result.anatomy?.length || 0}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Estruturas anatômicas, relações e fotos/esquemas para fixação
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddAnatomy}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-colors cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar Estrutura Manualmente</span>
              </button>
            </div>

            {(!result.anatomy || result.anatomy.length === 0) ? (
              <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-8 text-center bg-slate-50/50 dark:bg-[#12151e]">
                <Bone className="w-8 h-8 text-amber-500 mx-auto mb-2 opacity-60" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Nenhuma estrutura anatômica cadastrada.
                </p>
                <button
                  type="button"
                  onClick={handleAddAnatomy}
                  className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-600 text-white hover:bg-amber-700 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar Primeira Estrutura</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.anatomy.map((anat, i) => (
                  <MorphologyCard
                    key={`anat-${i}`}
                    item={anat}
                    index={i}
                    type="anatomy"
                    onUpdate={(updated) => handleUpdateAnatomy(i, updated)}
                    onDelete={() => handleDeleteAnatomy(i)}
                    onPreviewImage={(url, caption) => setPreviewImage({ url, caption })}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ──────────────────────── MODE 4: CASO CLÍNICO ──────────────────────── */}
      {viewMode === "cases" && (
        <div className="w-full max-w-[880px] mx-auto space-y-6">
          {(!result.clinicalCases || result.clinicalCases.length === 0) ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-[#12151e]">
              <Stethoscope className="mx-auto h-10 w-10 text-blue-500 mb-2" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Nenhum caso clínico adicional identificado nesta SP.
              </p>
            </div>
          ) : (
            result.clinicalCases.map((c, i) => (
              <div key={i} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-[#12151e] space-y-5">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-xs font-bold text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {cleanClinicalCaseTitle(c.title)}
                    </h3>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Transcrição fidedigna do roteiro e resolução detalhada
                    </span>
                  </div>
                </div>

                {/* Transcrição Fidedigna do Caso Clínico (sem metadados administrativos) */}
                {(c.caseTranscription || c.summary) && (
                  <div className="space-y-2">
                    <EditableAnswerBlock
                      value={cleanClinicalCaseText(c.caseTranscription || c.summary)}
                      onChange={(newVal) => handleUpdateCaseTranscription(i, newVal)}
                      badgeLabel="Enunciado / Cenário Clínico do Caso"
                    />
                  </div>
                )}

                {/* Tabela ou Correlações Resolvidas */}
                {c.resolvedTable && (
                  <div className="space-y-2 pt-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                      Tabela de Correlações / Resolução da Atividade
                    </span>
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/60 dark:bg-[#0F1117] overflow-x-auto">
                      <MarkdownText text={c.resolvedTable} />
                    </div>
                  </div>
                )}

                {/* Perguntas e Respostas do Caso */}
                {c.answers && c.answers.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                      Questões do Caso Clínico (Roteiro)
                    </span>
                    <div className="space-y-3">
                      {c.answers.map((ans, j) => (
                        <div key={j} className="rounded-xl border border-slate-100 p-4 dark:border-slate-800/80 bg-white dark:bg-[#151822] space-y-2">
                          {ans.question && (
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-start gap-2">
                              <span className="text-blue-600 dark:text-blue-400 font-black shrink-0">{j + 1}.</span>
                              <span>{cleanQuestionTitle(ans.question)}</span>
                            </h4>
                          )}
                          <div className="pl-4 border-l-2 border-blue-200 dark:border-blue-800">
                            <EditableAnswerBlock
                              value={ans.answer}
                              onChange={(newVal) => handleUpdateClinicalCaseAnswer(i, j, newVal)}
                              badgeLabel="Resolução do Caso"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Raciocínio Diagnóstico & Conduta */}
                {(c.diagnosticReasoning || c.management) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                    {c.diagnosticReasoning && (
                      <div className="rounded-xl bg-blue-50/50 p-4 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 text-xs space-y-1.5">
                        <span className="font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 block">
                          Raciocínio Diagnóstico
                        </span>
                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                          {c.diagnosticReasoning}
                        </p>
                      </div>
                    )}
                    {c.management && (
                      <div className="rounded-xl bg-emerald-50/50 p-4 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 text-xs space-y-1.5">
                        <span className="font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 block">
                          Conduta & Manejo
                        </span>
                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                          {c.management}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ──────────────────────── MODE 5: MAPA MENTAL ──────────────────────── */}
      {viewMode === "mindmap" && (
        <div className="space-y-4">
          {analysis.mindMap && analysis.mindMap.nodes.length > 0 ? (
            <EmbeddedMindMapView
              data={{
                title: analysis.mindMap.title,
                summary: result.theme,
                nodes: analysis.mindMap.nodes,
                edges: analysis.mindMap.edges,
              }}
            />
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-[#12151e] space-y-4">
              <GitBranch className="mx-auto h-10 w-10 text-indigo-500" />
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Mapa Mental Conceitual
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Transforme os objetivos, tecidos, hipóteses e correlações desta SP em nós visuais interativos.
                </p>
              </div>
              <button
                type="button"
                onClick={handleGenerateMindMap}
                disabled={isMapLoading}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-5 py-2.5 text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-60"
              >
                {isMapLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                <span>Gerar Mapa Mental</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Hidden high-fidelity A4 print sheet */}
      <TranscriptionDocumentViewer ref={printerRef} printOnly content={analysis.customMarkdown || markdown} title={result.title} theme="azul" />

      {/* Modal de Pré-visualização do PDF / Documento Anexado da SP */}
      {previewPdfUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 sm:p-6 animate-fadeIn">
          <div className="flex flex-col w-full max-w-5xl h-[88vh] bg-white dark:bg-[#1A1D27] rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-800">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-[#12141c]">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-md sm:max-w-xl">
                  {previewPdfName || "Documento PDF da SP"}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewPdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                  title="Abrir em nova aba"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Nova Aba</span>
                </a>
                <a
                  href={previewPdfUrl}
                  download={previewPdfName || "roteiro_sp.pdf"}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                  title="Baixar arquivo"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Baixar</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewPdfUrl(null)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors ml-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* PDF iframe viewer or image */}
            <div className="flex-1 w-full h-full bg-gray-100 dark:bg-[#0F1117] relative flex items-center justify-center overflow-auto p-2">
              {previewPdfUrl && (previewPdfUrl.startsWith("data:image/") || /\.(png|jpe?g|webp|gif|svg)$/i.test(previewPdfName || previewPdfUrl)) ? (
                <img
                  src={previewPdfUrl}
                  alt={previewPdfName || "Imagem da SP"}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-md"
                />
              ) : (
                <iframe
                  src={previewPdfUrl}
                  title={previewPdfName || "Documento da SP"}
                  className="w-full h-full border-none rounded-lg"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-slate-900 rounded-2xl overflow-hidden shadow-2xl p-2.5 border border-slate-700 flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 hover:bg-black/90 text-white transition-colors cursor-pointer z-10"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewImage.url}
              alt={previewImage.caption || "Imagem da lâmina"}
              className="max-h-[80vh] w-auto max-w-full object-contain rounded-xl shadow-lg"
            />
            {previewImage.caption && (
              <p className="text-center text-xs text-slate-300 font-medium py-2 px-4 max-w-xl">
                {previewImage.caption}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

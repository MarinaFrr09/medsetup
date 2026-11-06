/**
 * Ateliê — modelo de dados das análises de SP (Situação-Problema).
 * A IA devolve um JSON; `normalizeAtelieResult` blinda a UI contra campos
 * ausentes/formatos inesperados e `atelieToMarkdown` gera a síntese completa
 * usada em "Copiar para Notion", "Copiar texto", PDF e Mapa Mental.
 */

export interface AtelieObjective {
  title: string;
  detail: string;
}

export interface AtelieQuestion {
  number: number;
  area: string;
  question: string;
  answer: string;
  keyTerms: string[];
  theme?: string;
}

export interface AtelieStructure {
  structure: string;
  request: string;
  description: string;
  features: string[];
  staining: string;
  clinicalRelevance: string;
  imageUrl?: string;
  imageCaption?: string;
}

export interface AtelieCaseAnswer {
  question: string;
  answer: string;
  theme?: string;
}

export interface AtelieCaseDiagnosticHypothesis {
  hypothesis: string;
  status?: string;
  justification: string;
}

export interface AtelieClinicalCase {
  title: string;
  summary: string;
  caseTranscription?: string;
  resolvedTable?: string;
  answers: AtelieCaseAnswer[];
  diagnosticReasoning: string;
  differentials: string[];
  diagnosticHypotheses?: AtelieCaseDiagnosticHypothesis[];
  management: string;
  theme?: string;
}

export interface AtelieMarker {
  name: string;
  explanation: string;
  significance: string;
}

export interface AtelieExam {
  name: string;
  summary: string;
  markers: AtelieMarker[];
  interpretation: string;
  correlation: string;
}

export interface AtelieCorrelation {
  title: string;
  text: string;
}

export interface AtelieGlossaryItem {
  term: string;
  definition: string;
}

export interface AtelieTutoriaLink {
  atelie: string;
  tutoria: string;
  explanation: string;
}

export interface AtelieTutoria {
  caseSummary: string;
  resolution: string;
  links: AtelieTutoriaLink[];
}

export interface AtelieSubtopic {
  title: string;
  content: string;
  keyPoints?: string[];
}

export interface AtelieTopic {
  topic: string;
  subtopics: AtelieSubtopic[];
}

export interface AtelieResult {
  title: string;
  theme: string;
  summary: string;
  detailedSummary?: AtelieTopic[];
  objectives: AtelieObjective[];
  questions: AtelieQuestion[];
  histology: AtelieStructure[];
  anatomy: AtelieStructure[];
  clinicalCases: AtelieClinicalCase[];
  exams: AtelieExam[];
  correlations: AtelieCorrelation[];
  keyPoints: string[];
  glossary: AtelieGlossaryItem[];
  tutoria: AtelieTutoria | null;
}

export interface AtelieMindMapData {
  title: string;
  nodes: any[];
  edges: any[];
}

/* ────────────────────────────── helpers ────────────────────────────── */

const str = (v: unknown): string => {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return v.map(str).filter(Boolean).join("\n");
  if (typeof v === "object") {
    return Object.values(v as Record<string, unknown>).map(str).filter(Boolean).join(" ");
  }
  return "";
};

const arr = (v: unknown): any[] => {
  if (Array.isArray(v)) return v;
  if (v === null || v === undefined || v === "") return [];
  if (typeof v === "object") return Object.values(v as Record<string, unknown>);
  return [v];
};

const strList = (v: unknown): string[] =>
  arr(v)
    .map(str)
    .map((s) => s.trim())
    .filter(Boolean);

const pick = (o: any, ...keys: string[]): unknown => {
  for (const k of keys) {
    if (o && o[k] !== undefined && o[k] !== null && o[k] !== "") return o[k];
  }
  return "";
};

const normStructure = (raw: any): AtelieStructure => ({
  structure: str(pick(raw, "structure", "estrutura", "tissue", "tecido", "name", "nome", "title")),
  request: str(pick(raw, "request", "pedido", "roteiro", "asked")),
  description: str(pick(raw, "description", "descricao", "descrição", "details")),
  features: strList(pick(raw, "features", "caracteristicas", "características", "keyFeatures")),
  staining: str(pick(raw, "staining", "coloracao", "coloração", "stain")),
  clinicalRelevance: str(
    pick(raw, "clinicalRelevance", "relevanciaClinica", "relevância clínica", "correlation", "correlacao")
  ),
  imageUrl: str(pick(raw, "imageUrl", "image", "imagem", "foto", "photoUrl")),
  imageCaption: str(pick(raw, "imageCaption", "legenda", "caption")),
});

/**
 * Remove frases passivas/centradas no aluno como "o aluno deve", "o aluno precisa", "o estudante deve"
 * e garante que o texto comece diretamente de forma objetiva com verbo no infinitivo em maiúsculo.
 */
export function sanitizeObjectiveText(raw: string): string {
  if (!raw) return "";
  let text = raw.trim();
  // Strip student-centric prefixes
  text = text.replace(
    /^(?:o\s+aluno\s+(?:deve|precisa|tem\s+que|irá|ira|deverá|devera)\s+|o\s+estudante\s+(?:deve|precisa|tem\s+que|irá|ira|deverá|devera)\s+|o\s+participante\s+(?:deve|precisa)\s+|deve-se\s+|espera-se\s+que\s+o\s+aluno\s+(?:possa|consiga|saiba)?\s*|cabe\s+ao\s+aluno\s+)/i,
    ""
  );
  text = text.trim();
  if (text.length > 0) {
    text = text.charAt(0).toUpperCase() + text.slice(1);
  }
  return text;
}

/* ───────────────────────────── normalizer ───────────────────────────── */

export function normalizeAtelieResult(raw: any, fallbackTitle = "Análise de SP"): AtelieResult {
  const r = raw && typeof raw === "object" ? raw : {};

  const objectives: AtelieObjective[] = arr(pick(r, "objectives", "objetivos")).map((o: any) => {
    const rawTitle = typeof o === "string" ? o : str(pick(o, "title", "titulo", "título", "objective", "objetivo"));
    const rawDetail = typeof o === "string" ? "" : str(pick(o, "detail", "detalhe", "description", "descricao", "descrição", "explanation"));
    return {
      title: sanitizeObjectiveText(rawTitle),
      detail: sanitizeObjectiveText(rawDetail),
    };
  });

  const questions: AtelieQuestion[] = arr(pick(r, "questions", "perguntas", "questoes", "questões")).map(
    (q: any, i: number) => ({
      number: Number(pick(q, "number", "numero", "número")) || i + 1,
      area: str(pick(q, "area", "área", "category", "categoria")) || "geral",
      question: str(pick(q, "question", "pergunta", "enunciado", "text")),
      answer: str(pick(q, "answer", "resposta", "resolucao", "resolução")),
      keyTerms: strList(pick(q, "keyTerms", "termosChave", "termos")),
      theme: str(pick(q, "theme", "tema", "topicExplanation")),
    })
  );

  const clinicalCases: AtelieClinicalCase[] = arr(pick(r, "clinicalCases", "casosClinicos", "casos_clinicos")).map(
    (c: any, i: number) => ({
      title: str(pick(c, "title", "titulo", "título")) || `Caso clínico ${i + 1}`,
      summary: str(pick(c, "summary", "resumo", "caso", "description")),
      caseTranscription: str(pick(c, "caseTranscription", "casoTranscricao", "casoIntegral", "textoCaso")),
      resolvedTable: str(pick(c, "resolvedTable", "tabelaResolvida", "tabela", "table")),
      theme: str(pick(c, "theme", "tema")),
      answers: arr(pick(c, "answers", "respostas", "perguntas")).map((a: any) =>
        typeof a === "string"
          ? { question: "", answer: a }
          : {
              question: str(pick(a, "question", "pergunta")),
              answer: str(pick(a, "answer", "resposta")),
              theme: str(pick(a, "theme", "tema")),
            }
      ),
      diagnosticReasoning: str(pick(c, "diagnosticReasoning", "raciocinio", "raciocínio", "raciocinioDiagnostico")),
      differentials: strList(pick(c, "differentials", "diferenciais", "diagnosticosDiferenciais")),
      management: str(pick(c, "management", "conduta", "tratamento")),
    })
  );

  const exams: AtelieExam[] = arr(pick(r, "exams", "exames")).map((e: any) => ({
    name: str(pick(e, "name", "nome", "title", "exame")),
    summary: str(pick(e, "summary", "resumo", "explicacao", "explicação", "description")),
    markers: arr(pick(e, "markers", "biomarcadores", "marcadores")).map((m: any) =>
      typeof m === "string"
        ? { name: m, explanation: "", significance: "" }
        : {
            name: str(pick(m, "name", "nome", "marker", "marcador")),
            explanation: str(pick(m, "explanation", "explicacao", "explicação", "description")),
            significance: str(pick(m, "significance", "significado", "relevancia", "relevância")),
          }
    ),
    interpretation: str(pick(e, "interpretation", "interpretacao", "interpretação")),
    correlation: str(pick(e, "correlation", "correlacao", "correlação")),
  }));

  const correlations: AtelieCorrelation[] = arr(pick(r, "correlations", "correlacoes", "correlações")).map(
    (c: any, i: number) =>
      typeof c === "string"
        ? { title: `Correlação ${i + 1}`, text: c }
        : { title: str(pick(c, "title", "titulo", "título")) || `Correlação ${i + 1}`, text: str(pick(c, "text", "texto", "description")) }
  );

  const glossary: AtelieGlossaryItem[] = arr(pick(r, "glossary", "glossario", "glossário")).map((g: any) => ({
    term: str(pick(g, "term", "termo")),
    definition: str(pick(g, "definition", "definicao", "definição")),
  }));

  const rawTut: any = pick(r, "tutoria", "tutoriaCase", "casoTutoria");
  let tutoria: AtelieTutoria | null = null;
  if (rawTut && typeof rawTut === "object") {
    const t: AtelieTutoria = {
      caseSummary: str(pick(rawTut, "caseSummary", "resumoCaso", "resumo", "summary")),
      resolution: str(pick(rawTut, "resolution", "resolucao", "resolução")),
      links: arr(pick(rawTut, "links", "correlacoes", "correlações", "integration")).map((l: any) => ({
        atelie: str(pick(l, "atelie", "ateliê", "atelier")),
        tutoria: str(pick(l, "tutoria")),
        explanation: str(pick(l, "explanation", "explicacao", "explicação", "text")),
      })),
    };
    if (t.caseSummary || t.resolution || t.links.length > 0) tutoria = t;
  }

  const rawTopics = arr(pick(r, "detailedSummary", "resumoDetalhado", "resumoEstruturado", "sintese", "topics", "topicos"));
  const detailedSummary: AtelieTopic[] = rawTopics
    .map((t: any) => ({
      topic: str(pick(t, "topic", "topico", "tópico", "title", "titulo", "título")),
      subtopics: arr(pick(t, "subtopics", "subtopicos", "subtópicos", "items", "itens")).map((st: any) => ({
        title: str(pick(st, "title", "titulo", "título", "name", "nome")),
        content: str(pick(st, "content", "conteudo", "conteúdo", "text", "texto", "description")),
        keyPoints: strList(pick(st, "keyPoints", "pontosChave", "pontos_chave", "highlights")),
      })).filter((st: any) => st.title || st.content),
    }))
    .filter((t: AtelieTopic) => t.topic && t.subtopics.length > 0);

  return {
    title: str(pick(r, "title", "titulo", "título")) || fallbackTitle,
    theme: str(pick(r, "theme", "tema")),
    summary: str(pick(r, "summary", "resumo", "visaoGeral")),
    detailedSummary: detailedSummary.length > 0 ? detailedSummary : undefined,
    objectives: objectives.filter((o) => o.title || o.detail),
    questions: questions.filter((q) => q.question || q.answer),
    histology: arr(pick(r, "histology", "histologia")).map(normStructure).filter((s) => s.structure || s.description),
    anatomy: arr(pick(r, "anatomy", "anatomia")).map(normStructure).filter((s) => s.structure || s.description),
    clinicalCases: clinicalCases.filter((c) => c.summary || c.answers.length > 0),
    exams: exams.filter((e) => e.name || e.summary),
    correlations: correlations.filter((c) => c.text),
    keyPoints: strList(pick(r, "keyPoints", "pontosChave", "pontos_chave")),
    glossary: glossary.filter((g) => g.term && g.definition),
    tutoria,
  };
}

/* ───────────────────────────── markdown ───────────────────────────── */

/** Mantém o markdown compatível com o renderer do documento (sem #, - ou * no início de linhas soltas). */
const clean = (text: string): string[] =>
  text
    .split(/\r?\n/)
    .map((l) => l.trim().replace(/^#{1,6}\s+/, "").replace(/^[-*•]\s+/, ""))
    .filter(Boolean);

const para = (text: string): string[] => clean(text).flatMap((l) => [l, ""]);

const AREA_LABEL: Record<string, string> = {
  morfologia: "Morfologia",
  histologia: "Histologia",
  anatomia: "Anatomia",
  fisiologia: "Fisiologia",
  patologia: "Patologia",
  clinica: "Clínica",
  clínica: "Clínica",
  exames: "Exames",
};
export const areaLabel = (a: string) => AREA_LABEL[a.toLowerCase()] || (a ? a.charAt(0).toUpperCase() + a.slice(1) : "Geral");

export function structureMd(items: AtelieStructure[]): string[] {
  const out: string[] = [];
  for (const s of items) {
    out.push(`### ${s.structure || "Estrutura"}`);
    if (s.imageUrl) {
      out.push(`![${s.structure || "Lâmina Histológica"}](${s.imageUrl})`);
      if (s.imageCaption) {
        out.push(`*Legenda: ${clean(s.imageCaption).join(" ")}*`);
      }
      out.push("");
    }
    if (s.request) out.push(`* **O que o roteiro pede**: ${clean(s.request).join(" ")}`);
    if (s.description) out.push(`* **Descrição**: ${clean(s.description).join(" ")}`);
    if (s.features.length) {
      out.push("* **Características-chave**");
      s.features.forEach((f) => out.push(`  * ${clean(f).join(" ")}`));
    }
    if (s.staining) out.push(`* **Coloração / técnica**: ${clean(s.staining).join(" ")}`);
    if (s.clinicalRelevance) out.push(`* **Relevância clínica**: ${clean(s.clinicalRelevance).join(" ")}`);
    out.push("");
  }
  return out;
}

export function atelieToMarkdown(result: AtelieResult): string {
  const L: string[] = [];
  L.push(`# ${result.title}`);
  L.push("");
  if (result.theme) L.push(...para(result.theme));

  // 1. PRIMEIRA SEÇÃO: Objetivos do Roteiro
  L.push("## Objetivos do Roteiro", "");
  if (result.objectives.length) {
    result.objectives.forEach((o, i) =>
      L.push(`${i + 1}. **${clean(o.title).join(" ")}**${o.detail ? `: ${clean(o.detail).join(" ")}` : ""}`)
    );
    L.push("");
  }

  if (result.histology.length) {
    L.push("### Lâminas e Tecidos Histológicos Solicitados no Roteiro", "");
    result.histology.forEach((h) => {
      const struct = h.structure || "Tecido Histológico";
      const req = h.request ? ` — Pedido no roteiro: ${h.request}.` : "";
      const desc = h.description ? ` Características: ${h.description}.` : "";
      const stain = h.staining ? ` Coloração: ${h.staining}.` : "";
      L.push(`* **${struct}**${req}${desc}${stain}`);
    });
    L.push("");
  }

  if (result.anatomy.length) {
    L.push("### Estruturas Anatômicas Solicitadas no Roteiro", "");
    result.anatomy.forEach((a) => {
      const struct = a.structure || "Estrutura Anatômica";
      const req = a.request ? ` — Pedido no roteiro: ${a.request}.` : "";
      const desc = a.description ? ` Descrição: ${a.description}.` : "";
      L.push(`* **${struct}**${req}${desc}`);
    });
    L.push("");
  }

  // 2. SEGUNDA SEÇÃO: Resumo Completo
  L.push("## Resumo Completo", "");
  if (result.summary) L.push(...para(result.summary));

  if (result.detailedSummary?.length) {
    result.detailedSummary.forEach((t) => {
      L.push(`### ${clean(t.topic).join(" ")}`);
      t.subtopics.forEach((st) => {
        L.push(`#### ${clean(st.title).join(" ")}`);
        L.push(...para(st.content));
        if (st.keyPoints?.length) {
          st.keyPoints.forEach((kp) => L.push(`* **Ponto-chave**: ${clean(kp).join(" ")}`));
          L.push("");
        }
      });
    });
  }

  if (result.correlations.length) {
    L.push("### Integração Morfofuncional e Clínica", "");
    result.correlations.forEach((c) => {
      L.push(`#### ${c.title}`);
      L.push(...para(c.text));
    });
  }

  if (result.exams.length) {
    L.push("### Exames e Biomarcadores Relevantes", "");
    result.exams.forEach((e) => {
      L.push(`#### ${e.name || "Exame"}`);
      if (e.summary) L.push(...para(e.summary));
      if (e.markers.length) {
        L.push("* **Biomarcadores e achados**");
        e.markers.forEach((m) => {
          const body = [m.explanation, m.significance].filter(Boolean).map((t) => clean(t).join(" ")).join(" — ");
          L.push(`  * **${m.name}**: ${body}`);
        });
      }
      if (e.interpretation) L.push(`* **Interpretação**: ${clean(e.interpretation).join(" ")}`, "");
      if (e.correlation) L.push(`* **Correlação com o caso**: ${clean(e.correlation).join(" ")}`, "");
      L.push("");
    });
  }

  if (result.tutoria) {
    L.push("### Correlação com o Caso da Tutoria", "");
    if (result.tutoria.caseSummary) {
      L.push("#### Caso da Tutoria", ...para(result.tutoria.caseSummary));
    }
    if (result.tutoria.resolution) {
      L.push("#### Resolução Integrada", ...para(result.tutoria.resolution));
    }
    result.tutoria.links.forEach((l) => {
      L.push(`* **${clean(l.atelie).join(" ")}** ↔ ${clean(l.tutoria).join(" ")}`);
      if (l.explanation) L.push(`  * ${clean(l.explanation).join(" ")}`);
    });
    L.push("");
  }

  const attachedHistology = (result.histology || []).filter((h) => !!h.imageUrl);
  const attachedAnatomy = (result.anatomy || []).filter((a) => !!a.imageUrl);
  if (attachedHistology.length > 0 || attachedAnatomy.length > 0) {
    L.push("### Anexos e Lâminas de Morfologia", "");
    attachedHistology.forEach((h, idx) => {
      L.push(`#### ${h.structure || `Lâmina Histológica ${idx + 1}`}`);
      L.push(`![${h.imageCaption || h.structure || "Lâmina"}](${h.imageUrl})`, "");
      if (h.staining) L.push(`* **Coloração / técnica**: ${clean(h.staining).join(" ")}`);
      if (h.description) L.push(`* **Descrição**: ${clean(h.description).join(" ")}`);
      if (h.imageCaption && h.imageCaption !== h.structure) L.push(`* **Legenda**: ${clean(h.imageCaption).join(" ")}`);
      if (h.clinicalRelevance) L.push(`* **Relação Clínica**: ${clean(h.clinicalRelevance).join(" ")}`);
      L.push("");
    });
    attachedAnatomy.forEach((a, idx) => {
      L.push(`#### ${a.structure || `Estrutura Anatômica ${idx + 1}`}`);
      L.push(`![${a.imageCaption || a.structure || "Estrutura"}](${a.imageUrl})`, "");
      if (a.description) L.push(`* **Descrição**: ${clean(a.description).join(" ")}`);
      if (a.imageCaption && a.imageCaption !== a.structure) L.push(`* **Legenda**: ${clean(a.imageCaption).join(" ")}`);
      if (a.clinicalRelevance) L.push(`* **Relação Clínica**: ${clean(a.clinicalRelevance).join(" ")}`);
      L.push("");
    });
  }

  // 3. TERCEIRA SEÇÃO: Perguntas e Atividades do Roteiro (Ao Final)
  L.push("## Perguntas e Atividades do Roteiro", "");

  if (result.questions.length) {
    L.push("### Perguntas do Roteiro", "");
    result.questions.forEach((q) => {
      L.push(`#### Pergunta ${q.number}: ${clean(q.question).join(" ")}`);
      L.push(...para(q.answer));
      if (q.keyTerms.length) L.push(`* **Termos-chave**: ${q.keyTerms.join(", ")}`, "");
    });
  }

  if (result.clinicalCases.length) {
    L.push("### Atividades e Casos Clínicos do Roteiro", "");
    result.clinicalCases.forEach((c) => {
      L.push(`#### ${c.title}`);
      if (c.caseTranscription) {
        L.push(...para(c.caseTranscription));
      } else if (c.summary) {
        L.push(...para(c.summary));
      }
      if (c.resolvedTable) {
        L.push("#### Tabela Resolvida do Roteiro", "");
        L.push(c.resolvedTable, "");
      }
      c.answers.forEach((a, aIdx) => {
        if (a.question) L.push(`* **Questão da Atividade ${aIdx + 1}**: ${clean(a.question).join(" ")}`);
        L.push(...para(a.answer));
      });
      if (c.diagnosticReasoning) L.push(`* **Raciocínio diagnóstico**: ${clean(c.diagnosticReasoning).join(" ")}`, "");
      if (c.differentials.length) {
        L.push("* **Diagnósticos diferenciais**");
        c.differentials.forEach((d) => L.push(`  * ${clean(d).join(" ")}`));
        L.push("");
      }
      if (c.management) L.push(`* **Conduta**: ${clean(c.management).join(" ")}`, "");
    });
  }

  // 4. QUARTA SEÇÃO: Destaques do Roteiro (Final do Arquivo)
  if (result.keyPoints.length) {
    L.push("## Destaques do Roteiro", "");
    result.keyPoints.forEach((k) => L.push(`* ${clean(k).join(" ")}`));
    L.push("");
  }

  if (result.glossary.length) {
    L.push("### Glossário de Termos", "");
    result.glossary.forEach((g) => L.push(`* **${g.term}**: ${clean(g.definition).join(" ")}`));
    L.push("");
  }

  return L.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function atelieStats(r: AtelieResult) {
  return {
    objectives: r.objectives.length,
    questions: r.questions.length,
    histology: r.histology.length,
    anatomy: r.anatomy.length,
    cases: r.clinicalCases.length,
    exams: r.exams.length,
  };
}

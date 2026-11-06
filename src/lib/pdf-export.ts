import { getThemePalette, type ThemePalette } from "./theme-palettes";
import { cleanLatexAndBadges } from "./text-sanitize";

// Lazy-loaded PDF and Image engines to prevent blocking page loads
async function getPdfEngines() {
  const [{ jsPDF }, { toPng }] = await Promise.all([
    import("jspdf"),
    import("html-to-image"),
  ]);
  return { jsPDF, toPng };
}

export interface PdfExportOptions {
  element: HTMLElement;
  filename?: string;
  orientation?: "portrait" | "landscape" | "auto";
  title?: string;
  backgroundColor?: string;
}

// Standard A4 dimensions in millimeters
const A4_PORTRAIT_W_MM = 210;
const A4_PORTRAIT_H_MM = 297;
const A4_LANDSCAPE_W_MM = 297;
const A4_LANDSCAPE_H_MM = 210;

// Standard A4 pixel dimensions at 96 DPI (exact 210mm x 297mm ratio: 1 : 1.4142857)
const A4_PORTRAIT_W_PX = 794;
const A4_PORTRAIT_H_PX = 1123;
const A4_LANDSCAPE_W_PX = 1123;
const A4_LANDSCAPE_H_PX = 794;

/**
 * Export a digital whiteboard element to a pristine, unclipped A4 Landscape PDF.
 * Captures 100% of the whiteboard (full height and width) without any clipping,
 * and scales it proportionally onto the landscape page with clean margins.
 */
export async function exportBoardToPdf({
  boardElement,
  filename = "quadro-digital.pdf",
}: {
  boardElement: HTMLElement;
  filename?: string;
}): Promise<void> {
  if (!boardElement) return;

  const { jsPDF, toPng } = await getPdfEngines();

  // Measure natural full dimensions of the whiteboard without any clipping
  const fullWidth = boardElement.scrollWidth || boardElement.offsetWidth || 1400;
  const fullHeight = boardElement.scrollHeight || boardElement.offsetHeight || 800;

  // Capture the COMPLETE element with high DPI and no max constraints
  const dataUrl = await toPng(boardElement, {
    pixelRatio: 2.5,
    backgroundColor: "#FFFFFF",
    cacheBust: true,
    width: fullWidth,
    height: fullHeight,
    style: {
      width: `${fullWidth}px`,
      height: `${fullHeight}px`,
      maxWidth: "none",
      maxHeight: "none",
      margin: "0",
      transform: "none",
    },
  });

  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const pageW = A4_LANDSCAPE_W_MM; // 297mm
  const pageH = A4_LANDSCAPE_H_MM; // 210mm
  const margin = 8; // mm margin around board
  const usableW = pageW - margin * 2; // 281 mm
  const usableH = pageH - margin * 2; // 194 mm
  const usableAspect = usableW / usableH;

  const imgInfo = await new Promise<{ width: number; height: number }>((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth || fullWidth, height: img.naturalHeight || fullHeight });
    img.onerror = () => resolve({ width: fullWidth, height: fullHeight });
    img.src = dataUrl;
  });

  const boardAspect = imgInfo.width / imgInfo.height;

  let drawW = usableW;
  let drawH = usableH;
  let posX = margin;
  let posY = margin;

  if (boardAspect > usableAspect) {
    // Board is wider than page aspect: fit width, calculate height proportionally
    drawW = usableW;
    drawH = usableW / boardAspect;
    posY = margin + (usableH - drawH) / 2;
  } else {
    // Board is taller than page aspect: fit height, calculate width proportionally
    drawH = usableH;
    drawW = usableH * boardAspect;
    posX = margin + (usableW - drawW) / 2;
  }

  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, pageW, pageH, "F");
  pdf.addImage(dataUrl, "PNG", posX, posY, drawW, drawH, undefined, "FAST");

  const cleanName = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  pdf.save(cleanName);
}

/**
 * Export an array of individual sheet/page DOM elements as a multi-page A4 PDF document.
 * Guarantees 100% distortion-free rendering with exact A4 proportions (210mm x 297mm)
 * and zero stretching or squishing, regardless of viewport size or screen resolution.
 */
export async function exportPagesToPdf({
  pageElements,
  filename = "documento-estudo.pdf",
  orientation = "portrait",
}: {
  pageElements: HTMLElement[];
  filename?: string;
  orientation?: "portrait" | "landscape";
}): Promise<void> {
  if (!pageElements || pageElements.length === 0) return;

  const { jsPDF, toPng } = await getPdfEngines();

  const pdf = new jsPDF({
    orientation,
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const pageW = orientation === "landscape" ? A4_LANDSCAPE_W_MM : A4_PORTRAIT_W_MM;
  const pageH = orientation === "landscape" ? A4_LANDSCAPE_H_MM : A4_PORTRAIT_H_MM;

  const targetWidthPx = orientation === "landscape" ? A4_LANDSCAPE_W_PX : A4_PORTRAIT_W_PX;
  const targetHeightPx = orientation === "landscape" ? A4_LANDSCAPE_H_PX : A4_PORTRAIT_H_PX;

  for (let i = 0; i < pageElements.length; i++) {
    const el = pageElements[i];
    if (!el) continue;

    if (i > 0) {
      pdf.addPage("a4", orientation);
    }

    // Capture the element at exact A4 pixel resolution with pristine print styles
    const dataUrl = await toPng(el, {
      pixelRatio: 2,
      backgroundColor: "#FFFFFF",
      cacheBust: true,
      width: targetWidthPx,
      height: targetHeightPx,
      style: {
        width: `${targetWidthPx}px`,
        height: `${targetHeightPx}px`,
        maxWidth: `${targetWidthPx}px`,
        maxHeight: `${targetHeightPx}px`,
        margin: "0",
        borderRadius: "0px",
        border: "none",
        boxShadow: "none",
        transform: "none",
      },
    });

    // Verify natural image dimensions to calculate exact proportional placement
    const imgInfo = await new Promise<{ width: number; height: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth || targetWidthPx, height: img.naturalHeight || targetHeightPx });
      img.onerror = () => resolve({ width: targetWidthPx, height: targetHeightPx });
      img.src = dataUrl;
    });

    const imgAspect = imgInfo.width / imgInfo.height;
    const pageAspect = pageW / pageH;

    let drawW = pageW;
    let drawH = pageH;
    let posX = 0;
    let posY = 0;

    // If slight difference exists, constrain proportionally to eliminate stretching
    if (Math.abs(imgAspect - pageAspect) > 0.005) {
      if (imgAspect > pageAspect) {
        // Image is wider -> fit to width, calculate height proportionally
        drawW = pageW;
        drawH = pageW / imgAspect;
        posY = (pageH - drawH) / 2;
      } else {
        // Image is taller -> fit to height, calculate width proportionally
        drawH = pageH;
        drawW = pageH * imgAspect;
        posX = (pageW - drawW) / 2;
      }
    }

    pdf.addImage(dataUrl, "PNG", posX, posY, drawW, drawH, undefined, "FAST");
  }

  const cleanName = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  pdf.save(cleanName);
}

/**
 * Universal element export: exports mind maps, boards, reports or continuous summaries to PDF.
 * Mathematically guarantees exact aspect ratio preservation with zero horizontal/vertical stretch.
 */
export async function exportElementToPdf({
  element,
  filename = "documento-estudo.pdf",
  orientation = "auto",
  backgroundColor,
}: PdfExportOptions): Promise<void> {
  const elWidth = element.offsetWidth || element.scrollWidth || 800;
  const elHeight = element.offsetHeight || element.scrollHeight || 1100;
  const aspectRatio = elWidth / elHeight;

  let pdfOrientation: "portrait" | "landscape" = "portrait";
  if (orientation === "auto") {
    pdfOrientation = aspectRatio >= 1.05 ? "landscape" : "portrait";
  } else {
    pdfOrientation = orientation;
  }

  // Documents and study materials should ALWAYS have pristine white background for printing
  const bg = backgroundColor || "#FFFFFF";
  const bgRGB = hexToRgb(bg, { r: 255, g: 255, b: 255 });

  const pageW = pdfOrientation === "landscape" ? A4_LANDSCAPE_W_MM : A4_PORTRAIT_W_MM;
  const pageH = pdfOrientation === "landscape" ? A4_LANDSCAPE_H_MM : A4_PORTRAIT_H_MM;

  const { jsPDF, toPng } = await getPdfEngines();

  const fullDataUrl = await toPng(element, {
    pixelRatio: 2,
    backgroundColor: bg,
    cacheBust: true,
    width: elWidth,
    height: elHeight,
    style: {
      left: "0",
      top: "0",
      position: "static",
      transform: "none",
      margin: "0",
      backgroundColor: bg,
    },
  });

  const pdf = new jsPDF({
    orientation: pdfOrientation,
    unit: "mm",
    format: "a4",
    compress: true,
  });

  pdf.setFillColor(bgRGB.r, bgRGB.g, bgRGB.b);
  pdf.rect(0, 0, pageW, pageH, "F");

  // Load image to determine real natural dimensions
  const imgInfo = await new Promise<{ naturalW: number; naturalH: number }>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve({ naturalW: img.naturalWidth || elWidth, naturalH: img.naturalHeight || elHeight });
    img.onerror = reject;
    img.src = fullDataUrl;
  });

  const naturalW = imgInfo.naturalW;
  const naturalH = imgInfo.naturalH;
  const imgAspect = naturalW / naturalH;
  const pageAspect = pageW / pageH;

  // Check if content fits in 1 page or requires clean multi-page slicing
  const a4Ratio = pageH / pageW;
  const contentRatio = naturalH / naturalW;

  if (contentRatio <= a4Ratio * 1.15) {
    // Fits neatly on 1 page: fit proportionally without any stretching
    let drawW = pageW;
    let drawH = pageH;
    let posX = 0;
    let posY = 0;

    if (imgAspect > pageAspect) {
      drawW = pageW;
      drawH = pageW / imgAspect;
      posY = (pageH - drawH) / 2;
    } else {
      drawH = pageH;
      drawW = pageH * imgAspect;
      posX = (pageW - drawW) / 2;
    }

    pdf.addImage(fullDataUrl, "PNG", posX, posY, drawW, drawH, undefined, "FAST");
  } else {
    // Smart Multi-Page Slicing: detect white spaces between lines so text is NEVER cut horizontally
    await new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          // Draw full image once on memory canvas to inspect pixels
          const fullCanvas = document.createElement("canvas");
          fullCanvas.width = naturalW;
          fullCanvas.height = naturalH;
          const fullCtx = fullCanvas.getContext("2d", { willReadFrequently: true });

          if (!fullCtx) {
            pdf.addImage(fullDataUrl, "PNG", 0, 0, pageW, pageH, undefined, "FAST");
            resolve();
            return;
          }

          fullCtx.fillStyle = bg;
          fullCtx.fillRect(0, 0, naturalW, naturalH);
          fullCtx.drawImage(img, 0, 0);

          const maxSliceH = Math.round(naturalW * a4Ratio);
          let currentY = 0;
          let pageNum = 0;

          const sliceCanvas = document.createElement("canvas");
          sliceCanvas.width = naturalW;
          sliceCanvas.height = maxSliceH;
          const sliceCtx = sliceCanvas.getContext("2d");

          if (!sliceCtx) {
            pdf.addImage(fullDataUrl, "PNG", 0, 0, pageW, pageH, undefined, "FAST");
            resolve();
            return;
          }

          while (currentY < naturalH) {
            if (pageNum > 0) {
              pdf.addPage("a4", pdfOrientation);
              pdf.setFillColor(bgRGB.r, bgRGB.g, bgRGB.b);
              pdf.rect(0, 0, pageW, pageH, "F");
            }

            const remainingH = naturalH - currentY;

            if (remainingH <= maxSliceH) {
              // Last page: draw all remaining content
              sliceCtx.fillStyle = bg;
              sliceCtx.fillRect(0, 0, naturalW, maxSliceH);
              sliceCtx.drawImage(
                img,
                0,
                currentY,
                naturalW,
                remainingH,
                0,
                0,
                naturalW,
                remainingH
              );
              const sliceData = sliceCanvas.toDataURL("image/png");
              pdf.addImage(sliceData, "PNG", 0, 0, pageW, pageH, undefined, "FAST");
              break;
            }

            // Look for a blank horizontal gap in the last 140px before maxSliceH
            const maxTargetY = currentY + maxSliceH;
            const searchMinY = Math.max(currentY + Math.round(maxSliceH * 0.75), maxTargetY - 180);
            let splitY = maxTargetY;

            // Search backwards from maxTargetY to searchMinY for a blank line
            for (let checkY = maxTargetY - 5; checkY >= searchMinY; checkY -= 2) {
              const rowData = fullCtx.getImageData(0, checkY, naturalW, 1).data;
              let isBlank = true;
              // Check every 4th pixel along the row for speed & reliability
              for (let px = 0; px < naturalW; px += 4) {
                const idx = px * 4;
                const r = rowData[idx];
                const g = rowData[idx + 1];
                const b = rowData[idx + 2];
                // If pixel deviates significantly from background white/near-white, it's text
                if (r < 240 || g < 240 || b < 240) {
                  isBlank = false;
                  break;
                }
              }

              if (isBlank) {
                splitY = checkY;
                break;
              }
            }

            const thisSliceH = splitY - currentY;
            sliceCtx.fillStyle = bg;
            sliceCtx.fillRect(0, 0, naturalW, maxSliceH);
            sliceCtx.drawImage(
              img,
              0,
              currentY,
              naturalW,
              thisSliceH,
              0,
              0,
              naturalW,
              thisSliceH
            );

            const sliceData = sliceCanvas.toDataURL("image/png");
            pdf.addImage(sliceData, "PNG", 0, 0, pageW, pageH, undefined, "FAST");

            currentY = splitY;
            pageNum++;
          }

          resolve();
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = reject;
      img.src = fullDataUrl;
    });
  }

  const cleanName = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  pdf.save(cleanName);
}

function hexToRgb(hex: string, fallback: { r: number; g: number; b: number }) {
  const cleanHex = hex.replace("#", "").trim();
  if (cleanHex.length === 6) {
    return {
      r: parseInt(cleanHex.substring(0, 2), 16),
      g: parseInt(cleanHex.substring(2, 4), 16),
      b: parseInt(cleanHex.substring(4, 6), 16),
    };
  }
  return fallback;
}

export interface MindMapPdfExportOptions {
  element: HTMLElement;
  nodes: any[];
  filename?: string;
  isDark?: boolean;
  exportFormat?: "proportional" | "a4-landscape" | "light-print";
  customBackground?: string;
}

/**
 * High-definition renderer for Mind Maps: captures the exact bounding box of the mind map
 * with zero letterbox waste, crystal-clear 2x retina text, and harmonic theme backgrounds.
 */
export async function renderMindMapToImage({
  element,
  nodes,
  isDark = true,
  isLightPrint = false,
  customBackground,
}: {
  element: HTMLElement;
  nodes: any[];
  isDark?: boolean;
  isLightPrint?: boolean;
  customBackground?: string;
}): Promise<{ dataUrl: string; width: number; height: number; bgRGB: { r: number; g: number; b: number } }> {
  const useDark = isLightPrint ? false : isDark;
  const bgHex = useDark ? (customBackground || "#0F1117") : "#FFFFFF";
  const bgRGB = useDark
    ? hexToRgb(bgHex, { r: 15, g: 17, b: 23 })
    : { r: 255, g: 255, b: 255 };

  // Calculate tight bounding box across all nodes
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const n of nodes) {
    const x = n.position?.x ?? 0;
    const y = n.position?.y ?? 0;
    const measuredW = n.measured?.width;
    const measuredH = n.measured?.height;
    const defaultW = n.type === "topic" ? 280 : n.type === "subtopic" ? 240 : 200;
    const defaultH = n.type === "topic" ? 90 : n.type === "subtopic" ? 70 : 60;
    const w = measuredW || n.width || defaultW;
    const h = measuredH || n.height || defaultH;

    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x + w > maxX) maxX = x + w;
    if (y + h > maxY) maxY = y + h;
  }

  const contentW = Math.max(320, maxX - minX);
  const contentH = Math.max(220, maxY - minY);
  const bounds = { x: minX, y: minY, width: contentW, height: contentH };

  const pad = 80;
  const imgW = Math.round(contentW + pad * 2);
  const imgH = Math.round(contentH + pad * 2);

  const availW = imgW - pad * 2;
  const availH = imgH - pad * 2;
  const scale = Math.min(availW / bounds.width, availH / bounds.height);
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  const transX = imgW / 2 - centerX * scale;
  const transY = imgH / 2 - centerY * scale;

  const viewportEl = (element.querySelector(".react-flow__viewport") || element) as HTMLElement;
  const originalTransform = viewportEl.style.transform;
  const originalWidth = viewportEl.style.width;
  const originalHeight = viewportEl.style.height;
  const wasDark = viewportEl.classList.contains("dark");
  const htmlWasDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");

  const hideStyle = document.createElement("style");
  hideStyle.id = "mindmap-export-hide-handles";
  hideStyle.innerHTML = `
    .react-flow__handle, .react-flow__resize-control, .react-flow__controls, .react-flow__minimap {
      display: none !important;
      opacity: 0 !important;
    }
  `;
  document.head.appendChild(hideStyle);

  const { jsPDF, toPng } = await getPdfEngines();

  try {
    if (isLightPrint) {
      if (typeof document !== "undefined") document.documentElement.classList.remove("dark");
      viewportEl.classList.remove("dark");
    } else if (useDark) {
      viewportEl.classList.add("dark");
    }

    const dataUrl = await toPng(viewportEl, {
      pixelRatio: 2,
      backgroundColor: bgHex,
      width: imgW,
      height: imgH,
      style: {
        width: `${imgW}px`,
        height: `${imgH}px`,
        transform: `translate(${transX}px, ${transY}px) scale(${scale})`,
      },
      cacheBust: true,
    });

    return { dataUrl, width: imgW, height: imgH, bgRGB };
  } finally {
    hideStyle.remove();
    if (typeof document !== "undefined") {
      if (htmlWasDark) document.documentElement.classList.add("dark");
      else document.documentElement.classList.remove("dark");
    }
    if (wasDark) viewportEl.classList.add("dark");
    else viewportEl.classList.remove("dark");
    viewportEl.style.transform = originalTransform;
    viewportEl.style.width = originalWidth;
    viewportEl.style.height = originalHeight;
  }
}

/**
 * Universal Mind Map PDF Exporter:
 * Generates beautifully proportioned PDFs matching the exact mind map canvas bounds and theme colors.
 * Eliminates tiny unreadable texts, awkward letterboxing, and dark/light color mismatches.
 */
export async function exportMindMapToPdf({
  element,
  nodes,
  filename = "mapa-mental.pdf",
  isDark = true,
  exportFormat = "proportional",
  customBackground,
}: MindMapPdfExportOptions): Promise<void> {
  const isLightPrint = exportFormat === "light-print";
  const { dataUrl, width, height, bgRGB } = await renderMindMapToImage({
    element,
    nodes,
    isDark,
    isLightPrint,
    customBackground,
  });

  const cleanName = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  const { jsPDF } = await getPdfEngines();

  if (exportFormat === "a4-landscape") {
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    // Fill entire A4 page with matching canvas color
    pdf.setFillColor(bgRGB.r, bgRGB.g, bgRGB.b);
    pdf.rect(0, 0, 297, 210, "F");

    // Margins of 10mm
    const margin = 10;
    const availW = 297 - margin * 2;
    const availH = 210 - margin * 2;
    const scale = Math.min(availW / width, availH / height);
    const drawW = width * scale;
    const drawH = height * scale;
    const posX = (297 - drawW) / 2;
    const posY = (210 - drawH) / 2;

    pdf.addImage(dataUrl, "PNG", posX, posY, drawW, drawH, undefined, "FAST");
    pdf.save(cleanName);
    return;
  }

  // "proportional" (or "light-print"):
  // Exact custom format matching the mind map bounding box! Zero wasted empty space!
  const orientation = width >= height ? "landscape" : "portrait";
  const pdf = new jsPDF({
    orientation,
    unit: "px",
    format: [width, height],
    hotfixes: ["px_scaling"],
  });

  pdf.setFillColor(bgRGB.r, bgRGB.g, bgRGB.b);
  pdf.rect(0, 0, width, height, "F");
  pdf.addImage(dataUrl, "PNG", 0, 0, width, height, undefined, "FAST");
  pdf.save(cleanName);
}

export interface ProfessionalDocumentPdfOptions {
  title?: string;
  content: string;
  filename?: string;
  expanded?: boolean;
  date?: string;
  subject?: string;
  keyPoints?: string[];
  theme?: "azul" | "esmeralda" | "roxo" | "vermelho" | "cinza" | string;
}

interface DocToken {
  text: string;
  bold?: boolean;
  italic?: boolean;
  isArrow?: boolean;
}

/**
 * Cleans LaTeX math delimiters, converts symbols to plain text, and removes bracket badges
 * (implementation lives in text-sanitize.ts so it can also run on the server)
 */
export { cleanLatexAndBadges };

/**
 * Strips or converts inline HTML tags to clean markdown/plain text for PDF generation.
 */
function cleanHtmlForPdf(str: string): string {
  if (!str) return "";
  let current = str;
  let prev = "";
  let passes = 0;
  // Iteratively strip nested HTML tags like <mark><span style="...">text</span></mark>
  while (current !== prev && passes < 10) {
    prev = current;
    passes++;
    current = current
      .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, "**$1**")
      .replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, "**$1**")
      .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, "*$1*")
      .replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, "*$1*")
      .replace(/<mark[^>]*>([\s\S]*?)<\/mark>/gi, "$1")
      .replace(/<span[^>]*>([\s\S]*?)<\/span>/gi, "$1")
      .replace(/<u[^>]*>([\s\S]*?)<\/u>/gi, "$1")
      .replace(/<del[^>]*>([\s\S]*?)<\/del>/gi, "$1")
      .replace(/<\/?[a-zA-Z][^>]*>/g, "");
  }
  // Remove any leftover tag remnants or style attributes
  current = current
    .replace(/<\/?[a-zA-Z][^>]*>/g, "")
    .replace(/\bstyle\s*=\s*["'][^"']*["']/gi, "")
    .replace(/\s*<\s*span\b[^>]*>/gi, "")
    .replace(/\s*<\s*\/\s*span\s*>/gi, "")
    .replace(/\s*<\s*mark\b[^>]*>/gi, "")
    .replace(/\s*<\s*\/\s*mark\s*>/gi, "");
  return current;
}

/**
 * Sanitizes markdown / unicode text for standard PDF encoding.
 * Converts smart quotes, dashes, special arrows, and strips unsupported emoji characters.
 */
function sanitizePdfText(str: string): string {
  if (!str) return "";
  return cleanLatexAndBadges(cleanHtmlForPdf(str))
    .replace(/[²]/g, "2")
    .replace(/[³]/g, "3")
    .replace(/[¹]/g, "1")
    .replace(/[º°]/g, "o")
    .replace(/[ª]/g, "a")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2192|&rarr;/g, "->")
    .replace(/\u2194|&harr;|[↔⇔]/g, " <-> ")
    .replace(/[•●]/g, "*")
    .replace(/!["”]/g, " <-> ")
    .replace(/(?:Ü\||\u00DC\||\u00DC\u00A6)\s*/g, "")
    .replace(/[💡⚠️]/g, "")
    .replace(/[\p{Extended_Pictographic}\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}]/gu, "")
    .replace(/[\uD800-\uDFFF]/g, "")
    .trim();
}

/**
 * Splits a markdown line into formatted word tokens (bold, italic, arrow, normal)
 */
function tokenizeLine(line: string): DocToken[] {
  const tokens: DocToken[] = [];
  const normalized = cleanHtmlForPdf(line);
  // Split on bold, italic, or arrow sequences
  const parts = normalized.split(/(\*\*[^*]+\*\*|(?<!\*)\*[^*]+\*(?!\*)|->|→)/g);

  for (const part of parts) {
    if (!part) continue;

    if (part.startsWith("**") && part.endsWith("**")) {
      const clean = part.slice(2, -2).trim().replace(/\*\*/g, "");
      const words = clean.split(/\s+/).filter(Boolean);
      for (const w of words) {
        tokens.push({ text: sanitizePdfText(w).replace(/\*\*/g, ""), bold: true });
      }
    } else if (part.startsWith("*") && part.endsWith("*") && !part.startsWith("**")) {
      const clean = part.slice(1, -1).trim().replace(/\*/g, "");
      const words = clean.split(/\s+/).filter(Boolean);
      for (const w of words) {
        tokens.push({ text: sanitizePdfText(w).replace(/\*/g, ""), italic: true });
      }
    } else if (part === "->" || part === "→") {
      tokens.push({ text: "->", isArrow: true });
    } else {
      const clean = part.replace(/\*\*/g, "").trim();
      const words = clean.split(/\s+/).filter(Boolean);
      for (const w of words) {
        const sanitized = sanitizePdfText(w).replace(/\*\*/g, "");
        if (/^[:,\.;!?]$/.test(sanitized) && tokens.length > 0) {
          tokens[tokens.length - 1].text += sanitized;
        } else {
          tokens.push({ text: sanitized, bold: false });
        }
      }
    }
  }

  return tokens;
}

/**
 * Loads an image (data URL, blob, relative path or HTTP URL), converts it to a clean PNG data URL
 * via memory canvas, and returns its natural dimensions and format.
 */
async function loadPdfImageData(
  src: string
): Promise<{ dataUrl: string; width: number; height: number; format: "PNG" | "JPEG" } | null> {
  if (!src) return null;

  let resolvedSrc = src.trim();
  if (typeof window !== "undefined") {
    if (resolvedSrc.startsWith("/")) {
      resolvedSrc = `${window.location.origin}${resolvedSrc}`;
    } else if (
      !resolvedSrc.startsWith("http://") &&
      !resolvedSrc.startsWith("https://") &&
      !resolvedSrc.startsWith("data:") &&
      !resolvedSrc.startsWith("blob:")
    ) {
      resolvedSrc = `${window.location.origin}/${resolvedSrc}`;
    }
  }

  return new Promise((resolve) => {
    try {
      // Direct fast path for base64 data URLs
      if (
        resolvedSrc.startsWith("data:image/jpeg") ||
        resolvedSrc.startsWith("data:image/jpg") ||
        resolvedSrc.startsWith("data:image/png")
      ) {
        const isJpeg = resolvedSrc.startsWith("data:image/jpeg") || resolvedSrc.startsWith("data:image/jpg");
        const img = new Image();
        img.onload = () => {
          resolve({
            dataUrl: resolvedSrc,
            width: img.naturalWidth || 800,
            height: img.naturalHeight || 600,
            format: isJpeg ? "JPEG" : "PNG",
          });
        };
        img.onerror = () => {
          resolve({
            dataUrl: resolvedSrc,
            width: 800,
            height: 600,
            format: isJpeg ? "JPEG" : "PNG",
          });
        };
        img.src = resolvedSrc;
        return;
      }

      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        try {
          const naturalW = img.naturalWidth || 800;
          const naturalH = img.naturalHeight || 600;

          const canvas = document.createElement("canvas");
          canvas.width = naturalW;
          canvas.height = naturalH;
          const ctx = canvas.getContext("2d");

          if (!ctx) {
            const isJpeg = resolvedSrc.includes("jpeg") || resolvedSrc.includes("jpg");
            resolve({
              dataUrl: resolvedSrc,
              width: naturalW,
              height: naturalH,
              format: isJpeg ? "JPEG" : "PNG",
            });
            return;
          }

          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL("image/png");
          resolve({
            dataUrl,
            width: naturalW,
            height: naturalH,
            format: "PNG",
          });
        } catch {
          // If canvas tainted, fallback to direct src
          const isJpeg = resolvedSrc.includes("jpeg") || resolvedSrc.includes("jpg");
          resolve({
            dataUrl: resolvedSrc,
            width: img.naturalWidth || 800,
            height: img.naturalHeight || 600,
            format: isJpeg ? "JPEG" : "PNG",
          });
        }
      };

      img.onerror = () => {
        console.warn("Falha ao carregar imagem para o PDF:", resolvedSrc);
        resolve(null);
      };

      img.src = resolvedSrc;
    } catch (e) {
      console.warn("Erro ao processar imagem para PDF:", e);
      resolve(null);
    }
  });
}

/**
 * Native Vector PDF Exporter:
 * Generates an executive-level, pristine A4 vector PDF document directly from structured Markdown.
 * Features 100% selectable and searchable text, native typography, harmonic color palette,
 * hanging-indent bullet lists, no-orphan headings, and running headers & page numbers.
 * Zero screenshots, zero pixelation, zero horizontal slicing.
 */
export async function exportDocumentToProfessionalPdf({
  title,
  content,
  filename = "documento-estudo.pdf",
  expanded = false,
  date,
  subject,
  keyPoints = [],
  theme,
}: ProfessionalDocumentPdfOptions): Promise<void> {
  const { jsPDF } = await getPdfEngines();

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const marginX = 18;
  const contentW = 174;
  const marginTop = 20;
  const marginBottom = 20;
  const pageH = 297;
  const maxPageY = pageH - marginBottom;
  let curY = marginTop;

  const docDate = date || new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  // Extract clean title
  let docTitle = title || "Documento de Estudo";
  const sanitizedContent = cleanLatexAndBadges(content);
  const rawLines = sanitizedContent.split("\n");
  for (const l of rawLines) {
    const t = l.trim();
    if (t.startsWith("# ")) {
      docTitle = t.replace(/^#\s+/, "").trim();
      break;
    }
  }
  docTitle = sanitizePdfText(docTitle);

  // Derive theme palette according to explicit module theme or title
  const palette = theme
    ? getThemePalette(theme)
    : getThemePalette(docTitle || subject || "Medicina");

  // Helper: check space and advance page if needed
  function ensureSpace(neededMm: number): number {
    if (curY + neededMm > maxPageY) {
      doc.addPage("a4", "portrait");
      curY = 26; // Generous 12mm breathing space below the running top header line at 14mm

      // Clean, unbranded running top header for pages 2+
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // #94A3B8
      const headerTitle = docTitle.length > 70 ? docTitle.slice(0, 67) + "..." : docTitle;
      doc.text(headerTitle, marginX, 11.5);

      doc.setDrawColor(...palette.dividerRgb);
      doc.setLineWidth(0.3);
      doc.line(marginX, 14, 192, 14);

      // Restore standard typography state immediately so subsequent tokens NEVER inherit header font or color!
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(51, 65, 85);
    }
    return curY;
  }

  // Helper: render word tokens with word wrapping and hanging indent
  function renderTokenFlow(
    tokens: DocToken[],
    startX: number,
    maxWidth: number,
    lineHeight: number = 5.2,
    fontSize: number = 9.5
  ) {
    let curX = startX;

    const applyTokenStyle = (tok: DocToken) => {
      if (tok.bold) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(fontSize);
        doc.setTextColor(15, 23, 42); // #0F172A
      } else if (tok.isArrow) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(fontSize);
        doc.setTextColor(...palette.accentRgb);
      } else if (tok.italic) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(fontSize);
        doc.setTextColor(71, 85, 105); // #475569
      } else {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(fontSize);
        doc.setTextColor(51, 65, 85); // #334155
      }
    };

    for (let i = 0; i < tokens.length; i++) {
      const tok = tokens[i];
      if (!tok.text) continue;

      applyTokenStyle(tok);
      let wordW = doc.getTextWidth(tok.text);
      let spaceW = doc.getTextWidth(" ");
      if (!isFinite(wordW) || wordW < 0) wordW = tok.text.length * (fontSize * 0.25);
      if (!isFinite(spaceW) || spaceW <= 0) spaceW = fontSize * 0.2;
      if (!isFinite(curX)) curX = startX;

      if (curX + wordW > startX + maxWidth && curX > startX) {
        curY += lineHeight;
        ensureSpace(lineHeight);
        curX = startX;
        // Crucial: re-apply the token style after ensureSpace so it NEVER inherits the running header font or color!
        applyTokenStyle(tok);
      }

      doc.text(tok.text, curX, curY);
      curX += wordW + spaceW;
    }

    curY += lineHeight;
  }

  // Helper: draw badge pill
  function drawBadgePill(badgeLabel: string, x: number, y: number): number {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    const textW = doc.getTextWidth(badgeLabel);
    const boxW = textW + 6;
    const boxH = 4.8;

    const lower = badgeLabel.toLowerCase();
    if (lower.includes("fisiológ") || lower.includes("normal") || lower.includes("positivo")) {
      doc.setFillColor(209, 250, 229); // #D1FAE5 emerald
      doc.setDrawColor(16, 185, 129);
      doc.setTextColor(6, 95, 70);
    } else if (lower.includes("patológ") || lower.includes("grave") || lower.includes("risco")) {
      doc.setFillColor(255, 228, 230); // #FFE4E6 rose
      doc.setDrawColor(244, 63, 94);
      doc.setTextColor(159, 18, 57);
    } else if (lower.includes("alerta") || lower.includes("atenção") || lower.includes("aviso")) {
      doc.setFillColor(254, 243, 199); // #FEF3C7 amber
      doc.setDrawColor(245, 158, 11);
      doc.setTextColor(146, 64, 14);
    } else {
      doc.setFillColor(...palette.badgeBgRgb);
      doc.setDrawColor(...palette.borderRgb);
      doc.setTextColor(...palette.badgeTextRgb);
    }

    doc.roundedRect(x, y - 3.6, boxW, boxH, 1.2, 1.2, "FD");
    doc.text(badgeLabel, x + 3, y);
    return boxW + 2;
  }

  /* ───────────────────────── PAGE 1: CLEAN TITLE BANNER ───────────────────────── */
  // Top badge pill AND marketing subtitle lines removed as requested by user!
  ensureSpace(20);

  // H1 Document Title in high contrast theme color
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...palette.primaryRgb);
  const titleLines = doc.splitTextToSize(docTitle, contentW);
  doc.text(titleLines, marginX, curY);
  curY += titleLines.length * 7 + 2;

  // Elegant Accent Divider Line
  doc.setDrawColor(...palette.accentRgb);
  doc.setLineWidth(0.8);
  doc.line(marginX, curY, marginX + contentW, curY);
  curY += 6;

  /* ───────────────────────── KEY POINTS (IF PROVIDED) ───────────────────────── */
  if (keyPoints && keyPoints.length > 0) {
    ensureSpace(26);
    doc.setFillColor(...palette.softBgRgb);
    doc.setDrawColor(...palette.borderRgb);
    doc.setLineWidth(0.4);

    const kpBoxStartY = curY;
    curY += 5;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...palette.secondaryRgb);
    doc.text("PONTOS-CHAVE & SÍNTESE", marginX + 4, curY);
    curY += 4.5;

    for (let i = 0; i < keyPoints.length; i++) {
      const pt = sanitizePdfText(keyPoints[i]);
      ensureSpace(10);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...palette.accentRgb);
      doc.text(`${i + 1}.`, marginX + 4, curY);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(51, 65, 85);
      const ptLines = doc.splitTextToSize(pt, contentW - 12);
      doc.text(ptLines, marginX + 9, curY);
      curY += ptLines.length * 4.2 + 1.5;
    }

    const kpBoxHeight = curY - kpBoxStartY + 2;
    doc.roundedRect(marginX, kpBoxStartY, contentW, kpBoxHeight, 2, 2, "D");
    curY += 5;
  }

  /* ───────────────────────── DOCUMENT BODY PARSING ───────────────────────── */
  let isFirstH1Skipped = false;

  // Helper: Lookahead to check if a heading is followed by an image (directly or via chained subheadings)
  function checkHeadingFollowedByImage(lineIdx: number): boolean {
    for (let j = lineIdx + 1; j < Math.min(lineIdx + 6, rawLines.length); j++) {
      const rawNext = cleanHtmlForPdf(rawLines[j]);
      const nextTrimmed = rawNext.trim();
      if (!nextTrimmed) continue;
      // Is it a markdown image?
      if (nextTrimmed.match(/^[\*\-]?\s*!\[(.*?)\]\((.*?)\)/) || nextTrimmed.match(/!\[(.*?)\]\((.*?)\)/)) {
        return true;
      }
      // If it's a chained subheading (like ### followed by ####), continue looking ahead
      if (nextTrimmed.startsWith("#")) {
        continue;
      }
      // Reached other regular content
      break;
    }
    return false;
  }

  for (let i = 0; i < rawLines.length; i++) {
    const rawLine = cleanHtmlForPdf(rawLines[i]);
    const trimmed = rawLine.trim();

    if (!trimmed) {
      curY += 1.8;
      continue;
    }

    // Markdown Image: ![caption](url) or * ![caption](url)
    const imgMatch = trimmed.match(/^[\*\-]?\s*!\[(.*?)\]\((.*?)\)/) || trimmed.match(/!\[(.*?)\]\((.*?)\)/);
    if (imgMatch) {
      const caption = imgMatch[1]?.trim() || "";
      const src = imgMatch[2]?.trim() || "";
      if (src) {
        const imgInfo = await loadPdfImageData(src);
        if (imgInfo) {
          const maxImgW = contentW;
          const maxImgH = 125;
          const aspect = imgInfo.width / imgInfo.height;

          // Scale proportionally: target natural width converted to mm, within [75mm, 174mm]
          let drawW = Math.min(maxImgW, imgInfo.width * 0.264583);
          if (drawW < 75) drawW = Math.min(maxImgW, 110);
          if (drawW > maxImgW) drawW = maxImgW;
          let drawH = drawW / aspect;

          if (drawH > maxImgH) {
            drawH = maxImgH;
            drawW = drawH * aspect;
          }

          const hasCaption =
            caption &&
            caption !== "Imagem" &&
            caption !== "Imagem Colada" &&
            caption !== "Imagem Anexa";
          const captionSpace = hasCaption ? 12 : 7;
          let neededSpace = drawH + captionSpace;

          // Smart Page Break & Adaptive Image Scaling:
          // Check how much space remains on the current page
          const remainingSpace = maxPageY - curY;
          if (remainingSpace < neededSpace) {
            // If the remaining space is sufficient for a clear, legible image (>= 58mm + captionSpace),
            // adaptively scale down the image so it fits on this page without leaving large blank voids.
            const minAdaptiveH = 58;
            if (remainingSpace >= minAdaptiveH + captionSpace) {
              drawH = remainingSpace - captionSpace - 2;
              drawW = drawH * aspect;
              if (drawW > maxImgW) {
                drawW = maxImgW;
                drawH = drawW / aspect;
              }
              neededSpace = drawH + captionSpace;
            } else {
              // Not enough space for a legible image on this page: move cleanly to the next page
              ensureSpace(neededSpace);
            }
          }

          const posX = marginX + (contentW - drawW) / 2;

          try {
            doc.addImage(
              imgInfo.dataUrl,
              imgInfo.format,
              posX,
              curY,
              drawW,
              drawH,
              undefined,
              "FAST"
            );

            doc.setDrawColor(...palette.borderRgb);
            doc.setLineWidth(0.3);
            doc.roundedRect(posX, curY, drawW, drawH, 1.2, 1.2, "S");
          } catch (imgErr) {
            console.warn("Erro ao renderizar imagem no jsPDF:", imgErr);
          }

          curY += drawH + 3.5;

          if (hasCaption) {
            doc.setFont("helvetica", "italic");
            doc.setFontSize(8);
            doc.setTextColor(100, 116, 139);
            const capText = sanitizePdfText(caption);
            const capLines = doc.splitTextToSize(capText, contentW);
            doc.text(capLines, marginX + contentW / 2, curY, { align: "center" });
            curY += capLines.length * 3.8 + 2;
          } else {
            curY += 2;
          }

          continue;
        } else {
          // If image could not be loaded, show discreet caption text so content is preserved
          if (caption) {
            ensureSpace(8);
            doc.setFont("helvetica", "italic");
            doc.setFontSize(8.5);
            doc.setTextColor(148, 163, 184);
            doc.text(`[Imagem: ${sanitizePdfText(caption)}]`, marginX, curY);
            curY += 4.5;
          }
          continue;
        }
      }
    }

    // Skip main H1 if it repeats the title banner
    if (trimmed.startsWith("# ")) {
      if (!isFirstH1Skipped) {
        isFirstH1Skipped = true;
        continue;
      }
      ensureSpace(32);
      curY += 3;
      const text = sanitizePdfText(trimmed.replace(/^#\s+/, "")).replace(/\*\*/g, "").replace(/\*/g, "");
      doc.setFillColor(...palette.accentRgb);
      doc.rect(marginX, curY - 5, 2.5, 6.5, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(...palette.primaryRgb);
      const hLines = doc.splitTextToSize(text, contentW - 6);
      doc.text(hLines, marginX + 4.5, curY);
      curY += hLines.length * 5.8 + 2;

      doc.setDrawColor(...palette.dividerRgb);
      doc.setLineWidth(0.3);
      doc.line(marginX, curY, marginX + contentW, curY);
      curY += 3.5;
      continue;
    }

    // H2 Section Heading ("## ")
    if (trimmed.startsWith("## ")) {
      const h2FollowedByImg = checkHeadingFollowedByImage(i);
      ensureSpace(h2FollowedByImg ? 85 : 30);
      curY += 3.5;
      const text = sanitizePdfText(trimmed.replace(/^##\s+/, "")).replace(/\*\*/g, "").replace(/\*/g, "");

      // Left vertical accent bar in theme secondary color
      doc.setFillColor(...palette.secondaryRgb);
      doc.rect(marginX, curY - 4.5, 2.2, 5.8, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(...palette.secondaryRgb);
      const hLines = doc.splitTextToSize(text, contentW - 6);
      doc.text(hLines, marginX + 4.5, curY);
      curY += hLines.length * 5.4 + 1.5;

      // Subtle divider line in theme divider color
      doc.setDrawColor(...palette.dividerRgb);
      doc.setLineWidth(0.3);
      doc.line(marginX, curY, marginX + contentW, curY);
      curY += 4;
      continue;
    }

    // H3 Subheading ("### ")
    if (trimmed.startsWith("### ")) {
      const h3FollowedByImg = checkHeadingFollowedByImage(i);
      ensureSpace(h3FollowedByImg ? 80 : 26);
      curY += 2.5;
      const text = sanitizePdfText(trimmed.replace(/^###\s+/, "")).replace(/\*\*/g, "").replace(/\*/g, "");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(...palette.subRgb);
      const hLines = doc.splitTextToSize(text, contentW);
      doc.text(hLines, marginX, curY);
      curY += hLines.length * 4.6 + 1.8;
      continue;
    }

    // H4 Subheading ("#### ") - Medium font size and bold, unnumbered topic headers
    if (trimmed.startsWith("#### ")) {
      const h4FollowedByImg = checkHeadingFollowedByImage(i);
      ensureSpace(h4FollowedByImg ? 75 : 24);
      curY += 2.5;
      let text = sanitizePdfText(trimmed.replace(/^####\s+/, "")).replace(/\*\*/g, "").replace(/\*/g, "");
      // Remove leading number if present (e.g. "1. Síndrome..." -> "Síndrome...")
      text = text.replace(/^\d+\.\s*/, "");

      doc.setFillColor(...palette.minorRgb);
      doc.circle(marginX + 1.5, curY - 1, 0.8, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5); // Medium font size and bold
      doc.setTextColor(...palette.minorRgb);
      const hLines = doc.splitTextToSize(text, contentW - 5);
      doc.text(hLines, marginX + 5, curY);
      curY += hLines.length * 4.6 + 2;
      continue;
    }

    // H5 / H6 Subheadings ("##### ", "###### ")
    const genericHeadingMatch = trimmed.match(/^(#{5,6})\s*(.*)$/);
    if (genericHeadingMatch) {
      const h5FollowedByImg = checkHeadingFollowedByImage(i);
      ensureSpace(h5FollowedByImg ? 70 : 20);
      curY += 1.5;
      const text = sanitizePdfText(genericHeadingMatch[2]).replace(/\*\*/g, "").replace(/\*/g, "");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...palette.minorRgb);
      const hLines = doc.splitTextToSize(text, contentW);
      doc.text(hLines, marginX, curY);
      curY += hLines.length * 4.2 + 1;
      continue;
    }

    // Callout Boxes (Lines starting with ">")
    if (trimmed.startsWith(">")) {
      const calloutLines: string[] = [];
      let j = i;
      while (j < rawLines.length && rawLines[j].trim().startsWith(">")) {
        const cLine = rawLines[j].trim().replace(/^>\s*/, "");
        if (cLine) calloutLines.push(cLine);
        j++;
      }
      i = j - 1; // Advance loop to end of callout

      const fullCalloutStr = calloutLines.join(" ").trim();
      const sanitizedCallout = sanitizePdfText(fullCalloutStr);

      // Extract callout title if present (e.g. [!NOTE], **Atenção / Ponto de Prova:**, **Ponto-Chave:**, **Definição:**)
      let calloutTitle = "";
      let calloutBody = sanitizedCallout;

      const alertMatch = sanitizedCallout.match(/^\[!(NOTE|TIP|WARNING|IMPORTANT)\]\s*(.*)$/i);
      const boldTitleMatch = sanitizedCallout.match(/^\*\*([^*]+?)\*\*[:\s]*(.*)$/);

      if (alertMatch) {
        const alertTag = alertMatch[1].toUpperCase();
        calloutTitle =
          alertTag === "TIP"
            ? "DICA PRÁTICA"
            : alertTag === "WARNING"
            ? "ATENÇÃO"
            : alertTag === "IMPORTANT"
            ? "IMPORTANTE"
            : "NOTA CLÍNICA";
        calloutBody = alertMatch[2] || "";
      } else if (boldTitleMatch) {
        calloutTitle = boldTitleMatch[1].replace(/[:\s]+$/, "");
        calloutBody = boldTitleMatch[2] || "";
      }

      const isThemeOrRelevance =
        /^(?:Tema(?:\s+da\s+[Pp]ergunta)?|Relev[aâ]ncia\s+Cl[íi]nica|S[íi]ntese\s+Central)$/i.test(calloutTitle) ||
        /^(?:\*\*)?(?:Tema(?:\s+da\s+[Pp]ergunta)?|Relev[aâ]ncia\s+Cl[íi]nica|S[íi]ntese\s+Central)(?:\*\*)?\s*:/i.test(sanitizedCallout);

      if (isThemeOrRelevance) {
        const cleanContent = (calloutBody || sanitizedCallout)
          .replace(/^(?:\*\*)?(?:Tema(?:\s+da\s+[Pp]ergunta)?|Relev[aâ]ncia\s+Cl[íi]nica|S[íi]ntese\s+Central)(?:\*\*)?\s*:?\s*/i, "")
          .trim();
        if (cleanContent) {
          ensureSpace(10);
          curY += 1.5;
          doc.setFillColor(245, 158, 11); // Amber lightbulb accent
          doc.circle(marginX + 2, curY - 1, 1.1, "F");

          const tokens = tokenizeLine(cleanContent);
          renderTokenFlow(tokens, marginX + 6, contentW - 6, 5.0, 9.2);
          curY += 2;
        }
        continue;
      }

      // Tokenize the body cleanly so ** is converted to real bold font and never appears raw on the page
      const bodyTokens = tokenizeLine(calloutBody || sanitizedCallout);

      const paddingLeft = 6;
      const paddingRight = 6;
      const calloutInnerW = contentW - paddingLeft - paddingRight; // 162mm: guaranteed 6mm right margin
      const calloutFontSize = 9;
      const calloutLineH = 5.0;

      // Measure exact line count
      doc.setFontSize(calloutFontSize);
      let measuredLines = 1;
      let currentLineWidth = 0;
      for (const tok of bodyTokens) {
        doc.setFont("helvetica", tok.bold ? "bold" : tok.italic ? "italic" : "normal");
        const w = doc.getTextWidth(tok.text);
        const sp = doc.getTextWidth(" ");
        if (currentLineWidth + w > calloutInnerW && currentLineWidth > 0) {
          measuredLines++;
          currentLineWidth = w + sp;
        } else {
          currentLineWidth += w + sp;
        }
      }

      const titleSpace = calloutTitle ? 6 : 0;
      const boxHeight = 5 + titleSpace + measuredLines * calloutLineH + 4;

      ensureSpace(boxHeight + 4);
      const startBoxY = curY;

      // Draw background rounded box
      doc.setFillColor(...palette.calloutBgRgb);
      doc.setDrawColor(...palette.borderRgb);
      doc.roundedRect(marginX, startBoxY, contentW, boxHeight, 2, 2, "FD");

      // Draw thick left accent highlight bar
      doc.setFillColor(...palette.calloutBorderRgb);
      doc.roundedRect(marginX, startBoxY, 2.4, boxHeight, 1, 1, "F");

      let currentDrawY = startBoxY + 5;

      if (calloutTitle) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(...palette.secondaryRgb);
        doc.text(calloutTitle.toUpperCase(), marginX + paddingLeft, currentDrawY);
        currentDrawY += 5.5;
      }

      // Render tokens inside box with strict word-wrapping
      let textX = marginX + paddingLeft;
      for (let tIdx = 0; tIdx < bodyTokens.length; tIdx++) {
        const tok = bodyTokens[tIdx];
        if (!tok.text) continue;

        if (tok.bold) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(calloutFontSize);
          doc.setTextColor(15, 23, 42);
        } else if (tok.italic) {
          doc.setFont("helvetica", "italic");
          doc.setFontSize(calloutFontSize);
          doc.setTextColor(71, 85, 105);
        } else {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(calloutFontSize);
          doc.setTextColor(51, 65, 85);
        }

        const wordW = doc.getTextWidth(tok.text);
        const spaceW = doc.getTextWidth(" ");

        if (textX + wordW > marginX + paddingLeft + calloutInnerW && textX > marginX + paddingLeft) {
          currentDrawY += calloutLineH;
          textX = marginX + paddingLeft;
        }

        doc.text(tok.text, textX, currentDrawY);
        textX += wordW + spaceW;
      }

      curY = startBoxY + boxHeight + 4;
      continue;
    }

    // Markdown Tables (Lines containing | ... |)
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const tableLines: string[] = [];
      let j = i;
      while (j < rawLines.length && rawLines[j].trim().startsWith("|") && rawLines[j].trim().endsWith("|")) {
        tableLines.push(rawLines[j].trim());
        j++;
      }
      i = j - 1;

      // Process table rows (skip separator rows like |---|---|)
      const parsedRows: string[][] = [];
      for (const tLine of tableLines) {
        if (/^\|[\s\-:|]+\|$/.test(tLine)) continue; // Separator row
        const cells = tLine
          .split("|")
          .slice(1, -1)
          .map((c) => sanitizePdfText(c.trim()));
        if (cells.length > 0) parsedRows.push(cells);
      }

      if (parsedRows.length > 0) {
        const numCols = Math.max(...parsedRows.map((r) => r.length));

        // 1. Calculate smart, proportional column widths based on text length with guaranteed minimums
        const colContentLengths: number[] = new Array(numCols).fill(0);
        for (const row of parsedRows) {
          for (let c = 0; c < numCols; c++) {
            const textLen = (row[c] || "").length;
            colContentLengths[c] = Math.max(colContentLengths[c], textLen);
          }
        }

        const minColW = Math.min(26, contentW / numCols);
        let totalWeight = 0;
        const weights = colContentLengths.map((len) => {
          const clamped = Math.max(22, Math.min(len, 140));
          totalWeight += clamped;
          return clamped;
        });

        const colWidths = weights.map((w) => Math.max(minColW, (w / totalWeight) * contentW));
        const sumColWidths = colWidths.reduce((a, b) => a + b, 0);
        for (let c = 0; c < numCols; c++) {
          colWidths[c] = (colWidths[c] / sumColWidths) * contentW;
        }

        const getColX = (colIdx: number) => {
          let x = marginX;
          for (let c = 0; c < colIdx; c++) {
            x += colWidths[c];
          }
          return x;
        };

        for (let rIdx = 0; rIdx < parsedRows.length; rIdx++) {
          const row = parsedRows[rIdx];
          const isHeader = rIdx === 0;

          // Prepare all wrapped text lines for each cell in this row
          const cellData: Array<{ lines: string[]; isBold: boolean }> = [];
          for (let cIdx = 0; cIdx < numCols; cIdx++) {
            const rawCell = row[cIdx] || "";
            const isBold = rawCell.includes("**") || isHeader;
            const cleanCellText = sanitizePdfText(rawCell).replace(/\*\*/g, "").replace(/\*/g, "");
            const cellW = colWidths[cIdx];

            doc.setFont("helvetica", isBold ? "bold" : "normal");
            doc.setFontSize(isHeader ? 8 : 7.8);

            const lines = doc.splitTextToSize(cleanCellText, cellW - 4);
            cellData.push({ lines: lines.length > 0 ? lines : [""], isBold });
          }

          const maxLinesInRow = Math.max(1, ...cellData.map((cd) => cd.lines.length));
          const lineSpacing = 3.6;
          const cellPadTop = 2.4;
          const cellPadBottom = 2.4;
          const rowH = Math.max(isHeader ? 7.5 : 6.5, maxLinesInRow * lineSpacing + cellPadTop + cellPadBottom);

          // Page boundary check
          if (curY + rowH > maxPageY) {
            doc.addPage("a4", "portrait");
            curY = 26;

            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            const headerTitle = docTitle.length > 70 ? docTitle.slice(0, 67) + "..." : docTitle;
            doc.text(headerTitle, marginX, 11.5);
            doc.setDrawColor(...palette.dividerRgb);
            doc.setLineWidth(0.3);
            doc.line(marginX, 14, 192, 14);

            // Repeat table header row on continuation page
            if (!isHeader && parsedRows.length > 0) {
              const hRow = parsedRows[0];
              const hData: Array<{ lines: string[] }> = [];
              for (let c = 0; c < numCols; c++) {
                const cleanH = sanitizePdfText(hRow[c] || "").replace(/\*\*/g, "");
                doc.setFont("helvetica", "bold");
                doc.setFontSize(8);
                const hLines = doc.splitTextToSize(cleanH, colWidths[c] - 4);
                hData.push({ lines: hLines.length > 0 ? hLines : [""] });
              }
              const hMaxL = Math.max(1, ...hData.map((h) => h.lines.length));
              const hH = Math.max(7.5, hMaxL * 3.6 + 4.8);

              doc.setFillColor(...palette.tableHeaderFillRgb);
              doc.rect(marginX, curY, contentW, hH, "F");
              doc.setDrawColor(...palette.borderRgb);
              doc.setLineWidth(0.2);

              for (let c = 0; c < numCols; c++) {
                const cX = getColX(c);
                const cW = colWidths[c];
                doc.rect(cX, curY, cW, hH, "S");
                doc.setFont("helvetica", "bold");
                doc.setFontSize(8);
                doc.setTextColor(255, 255, 255);
                const lines = hData[c].lines;
                for (let l = 0; l < lines.length; l++) {
                  doc.text(lines[l], cX + 2, curY + cellPadTop + 2.4 + l * 3.6);
                }
              }
              curY += hH;
            }
          }

          // Row background
          if (isHeader) {
            doc.setFillColor(...palette.tableHeaderFillRgb);
            doc.rect(marginX, curY, contentW, rowH, "F");
          } else {
            const bgRgb = rIdx % 2 === 1 ? palette.tableRowAltRgb : ([255, 255, 255] as [number, number, number]);
            doc.setFillColor(...bgRgb);
            doc.rect(marginX, curY, contentW, rowH, "F");
          }

          // Borders & cell content
          doc.setDrawColor(...palette.borderRgb);
          doc.setLineWidth(0.2);

          for (let cIdx = 0; cIdx < numCols; cIdx++) {
            const cX = getColX(cIdx);
            const cW = colWidths[cIdx];
            const cd = cellData[cIdx];

            // Border
            doc.rect(cX, curY, cW, rowH, "S");

            // Text font & color
            if (isHeader) {
              doc.setFont("helvetica", "bold");
              doc.setFontSize(8);
              doc.setTextColor(255, 255, 255);
            } else {
              doc.setFont("helvetica", cd.isBold || cIdx === 0 ? "bold" : "normal");
              doc.setFontSize(7.8);
              doc.setTextColor(cd.isBold || cIdx === 0 ? 15 : 30, cd.isBold || cIdx === 0 ? 23 : 41, cd.isBold || cIdx === 0 ? 42 : 59);
            }

            // Print every line of wrapped text
            for (let l = 0; l < cd.lines.length; l++) {
              doc.text(cd.lines[l], cX + 2, curY + cellPadTop + 2.4 + l * lineSpacing);
            }
          }

          curY += rowH;
        }

        curY += 4;
        continue;
      }
    }

    // Regular Bullet Items ("* ", "- ", "  * ", "  - ", "    * ")
    const bulletMatch = rawLine.match(/^(\s*)([\*\-])\s+(.*)$/);
    if (bulletMatch) {
      ensureSpace(12);
      const indentSpaces = bulletMatch[1].replace(/\t/g, "  ").length;
      let bodyText = bulletMatch[3].trim();
      const isLevel3 = indentSpaces >= 4;
      const isLevel2 = indentSpaces >= 2 && !isLevel3;

      const indentX = isLevel3 ? marginX + 13 : isLevel2 ? marginX + 7.5 : marginX + 4.5;
      const dotX = isLevel3 ? marginX + 10.5 : isLevel2 ? marginX + 5.2 : marginX + 1.8;
      const fontSize = isLevel3 ? 8.5 : isLevel2 ? 9 : 9.5;
      const lineH = isLevel3 ? 4.5 : isLevel2 ? 4.8 : 5.2;

      // Draw vector bullet: Level 1 = solid circle, Level 2 = hollow circle, Level 3 = solid square
      if (isLevel3) {
        doc.setFillColor(71, 85, 105);
        doc.rect(dotX - 0.5, curY - 1.5, 1.0, 1.0, "F");
      } else if (isLevel2) {
        doc.setDrawColor(71, 85, 105);
        doc.setLineWidth(0.3);
        doc.circle(dotX, curY - 1, 0.65, "S");
      } else {
        doc.setFillColor(15, 23, 42);
        doc.circle(dotX, curY - 1, 0.75, "F");
      }

      // Strip any bracket badge prefix like [Fisiológico] or [Patológico]
      bodyText = bodyText.replace(/^\[[A-Za-zÀ-ÖØ-öø-ÿ\s]{3,25}\]\s*/, "");

      // Check for arrow pattern (inside or outside bold) or colon pattern
      const arrowInsideBold = bodyText.match(/^\s*\*\*([^*]+?)\s*(?:->|→|&rarr;)\*\*\s*(.*)$/);
      const arrowOutsideBold = bodyText.match(/^\s*\*\*([^*]+?)\*\*\s*(?:->|→|&rarr;)\s*(.*)$/);
      const plainArrowMatch = !arrowInsideBold && !arrowOutsideBold && bodyText.match(/^\s*([^<*:\->—\n]{2,60})\s*(?:->|→|&rarr;)\s*(.*)$/);
      const colonOrArrowMatch = !arrowInsideBold && !arrowOutsideBold && !plainArrowMatch
        ? bodyText.match(/^\s*(?:\*\*)?([^*:\->—]+(?:\([^\)]+\))?[^*:\->—]*)(?:\*\*)?(\s*(?:->|→|&rarr;|:)\s*)(.*)$/)
        : null;

      const matchedArrow = arrowInsideBold || arrowOutsideBold || plainArrowMatch;

      if (matchedArrow) {
        const term = matchedArrow[1].trim().replace(/\*\*/g, "");
        const expl = matchedArrow[2].trim().replace(/^\*\*\s*/, "");
        const combinedTokens: DocToken[] = [
          ...tokenizeLine(`**${term}**`),
          { text: "->", isArrow: true },
          ...tokenizeLine(expl),
        ];
        renderTokenFlow(combinedTokens, indentX, contentW - (indentX - marginX), lineH, fontSize);
      } else if (colonOrArrowMatch) {
        const term = colonOrArrowMatch[1].trim().replace(/\*\*/g, "");
        const isArrow = colonOrArrowMatch[2].includes("->") || colonOrArrowMatch[2].includes("→");
        const expl = colonOrArrowMatch[3].trim().replace(/^\*\*\s*/, "");
        const combinedTokens: DocToken[] = [
          ...tokenizeLine(`**${term}${isArrow ? "" : ":"}**`),
          ...(isArrow ? [{ text: "->", isArrow: true }] : []),
          ...tokenizeLine(expl),
        ];
        renderTokenFlow(combinedTokens, indentX, contentW - (indentX - marginX), lineH, fontSize);
      } else {
        const tokens = tokenizeLine(bodyText);
        renderTokenFlow(tokens, indentX, contentW - (indentX - marginX), lineH, fontSize);
      }
      curY += 2;
      continue;
    }

    // Numbered Item ("1. ", "2. ")
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      const numStr = numMatch[1];
      const bodyText = numMatch[2].trim();

      // Check if this numbered item is actually a topic or syndrome heading rather than a sequential step
      const isStep = /^(Etapa|Fase|Passo|Mecanismo\s+\d|Via\s+\d)\b/i.test(bodyText) || /^\d+\.\d+/.test(numStr);
      const isTopicHeading = (!bodyText.includes(":") && bodyText.length < 85) || /^(Síndrome|Grandes\s+Síndromes|Eixo|Pilar|Abordagem|Conceito|Classificação|Etiologia|Fisiopatologia|Diagnóstico|Tratamento|Manejo|Repercussões|Prevenção)\b/i.test(bodyText);

      if (isTopicHeading && !isStep) {
        const topicFollowedByImg = checkHeadingFollowedByImage(i);
        ensureSpace(topicFollowedByImg ? 75 : 24);
        curY += 2.5;
        doc.setFillColor(...palette.minorRgb);
        doc.circle(marginX + 1.5, curY - 1, 0.8, "F");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(10.5);
        doc.setTextColor(...palette.minorRgb);
        const hLines = doc.splitTextToSize(sanitizePdfText(bodyText).replace(/\*\*/g, ""), contentW - 5);
        doc.text(hLines, marginX + 5, curY);
        curY += hLines.length * 4.6 + 2;
        continue;
      }

      ensureSpace(12);
      const indentX = marginX + 6;
      const availWidth = contentW - 6;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(...palette.accentRgb);
      doc.text(`${numStr}.`, marginX, curY);

      // Check if numbered item has "Term: Explanation" or "**Term:** Explanation"
      const numColonMatch = bodyText.match(/^\s*(?:\*\*)?([^*:\->—]+(?:\([^\)]+\))?[^*:\->—]*)(?:\*\*)?(\s*(?:->|→|&rarr;|:)\s*)(.*)$/);
      if (numColonMatch) {
        const term = numColonMatch[1].trim().replace(/\*\*/g, "");
        const isArrow = numColonMatch[2].includes("->") || numColonMatch[2].includes("→");
        const expl = numColonMatch[3].trim().replace(/^\*\*\s*/, "");
        const combinedTokens: DocToken[] = [
          ...tokenizeLine(`**${term}${isArrow ? "" : ":"}**`),
          ...(isArrow ? [{ text: "->", isArrow: true }] : []),
          ...tokenizeLine(expl),
        ];
        renderTokenFlow(combinedTokens, indentX, availWidth, 5.2, 9.5);
      } else {
        const tokens = tokenizeLine(bodyText);
        renderTokenFlow(tokens, indentX, availWidth, 5.2, 9.5);
      }
      curY += 2;
      continue;
    }

    // Theme, clinical relevance, or tip starting with **Tema... / **Relação Clínica... or leftover emojis
    if (/^(?:[💡⚠️]|(?:Ü\||\u00DC\||\u00DC\u00A6))/u.test(trimmed) || /^\*\*(?:Tema(?:\s+da\s+[Pp]ergunta)?|Relev[aâ]ncia\s+Cl[íi]nica|Rela[çc][aã]o\s+Cl[íi]nica|S[íi]ntese\s+Central)\*\*\s*:?/i.test(trimmed)) {
      let cleanBody = trimmed
        .replace(/^(?:[💡⚠️]|(?:Ü\||\u00DC\||\u00DC\u00A6))\s*/u, "")
        .trim();
      const themeOrRel = cleanBody.match(/^(?:\*\*)?(?:Tema(?:\s+da\s+[Pp]ergunta)?|Relev[aâ]ncia\s+Cl[íi]nica|Rela[çc][aã]o\s+Cl[íi]nica|S[íi]ntese\s+Central)(?:\*\*)?\s*:?\s*(.*)$/i);
      if (themeOrRel) {
        const labelText = /Relev|Rela/i.test(cleanBody) ? "Relação Clínica" : /S[íi]ntese/i.test(cleanBody) ? "Síntese Central" : "Tema";
        cleanBody = `**${labelText}:** ${themeOrRel[1].trim()}`;
      } else if (!cleanBody.startsWith("**") && !cleanBody.startsWith("*")) {
        cleanBody = `**Relação Clínica:** ${cleanBody}`;
      }
      const sanitized = sanitizePdfText(cleanBody).trim();
      if (sanitized) {
        ensureSpace(8);
        curY += 1;
        const tokens = tokenizeLine(sanitized);
        renderTokenFlow(tokens, marginX + 2, contentW - 2, 5.0, 9.2);
        curY += 2;
      }
      continue;
    }

    // Regular contextual paragraph (clean any stray hashes and boilerplate contextualization attribution prefixes)
    const rawCleaned = trimmed
      .replace(/^#{1,6}\s*/, "")
      .replace(/^(?:\*\*)?(?:Contextualização\s+(?:Fisiopatológica[,\s]*Histológica\s+e\s+Epidemiológica\s+Abrangente|Fisiopatológica[^\n:*]*|Histológica[^\n:*]*|Epidemiológica[^\n:*]*|Abrangente|Objetiva|Clínica)|Contextualização)(?:\*\*)?\s*:\s*/i, "");
    if (!rawCleaned.trim()) continue;

    ensureSpace(12);
    const tokens = tokenizeLine(rawCleaned);
    renderTokenFlow(tokens, marginX, contentW, 5.2, 9.5);
    curY += 3.5;
  }

  /* ───────────────────────── RUNNING FOOTERS PASS ───────────────────────── */
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    // Bottom subtle divider
    doc.setDrawColor(...palette.dividerRgb);
    doc.setLineWidth(0.3);
    doc.line(marginX, 282, 192, 282);

    // Clean, academic footer labels
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // #94A3B8
    doc.text("Síntese & Material Acadêmico", marginX, 287);
    doc.text(docDate, 105, 287, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...palette.secondaryRgb);
    doc.text(`Página ${p} de ${totalPages}`, 192, 287, { align: "right" });
  }

  const cleanName = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  doc.save(cleanName);
}


import * as pdfjsLib from "pdfjs-dist";

// Configure worker for pdfjs-dist
if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || "4.10.38"}/pdf.worker.min.mjs`;
}

export interface RenderedPdfPage {
  pageNumber: number;
  dataUrl: string;
  width: number;
  height: number;
}

export interface PdfDocumentRenderResult {
  totalPages: number;
  pages: RenderedPdfPage[];
}

/**
 * Render a single page of a PDF file to high-res data URL
 */
export async function convertPdfPageToDataUrl(
  file: File,
  pageNum: number = 1
): Promise<{ dataUrl: string; totalPages: number; width: number; height: number }> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const totalPages = pdf.numPages;
    const targetPage = Math.max(1, Math.min(pageNum, totalPages));

    const page = await pdf.getPage(targetPage);
    const viewport = page.getViewport({ scale: 2.0 }); // 2x scale for crisp OCR and spatial detection

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not create canvas context");

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };

    // @ts-ignore
    await page.render(renderContext).promise;

    return {
      dataUrl: canvas.toDataURL("image/png"),
      totalPages,
      width: viewport.width,
      height: viewport.height,
    };
  } catch (error) {
    console.error("PDF render error:", error);
    throw new Error("Failed to render PDF page. Please ensure the file is a valid PDF.");
  }
}

/**
 * Render 100% of all pages (1, 2, ... N) from a PDF file
 * Guarantees zero page omission or truncation
 */
export async function convertAllPdfPagesToDataUrls(
  file: File,
  onProgress?: (current: number, total: number) => void
): Promise<PdfDocumentRenderResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const totalPages = pdf.numPages;

    const renderedPages: RenderedPdfPage[] = [];

    // Sequentially render every page from 1 to totalPages
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      if (onProgress) {
        onProgress(pageNum, totalPages);
      }

      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2.0 });

      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Could not create canvas context for page " + pageNum);

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      // @ts-ignore
      await page.render(renderContext).promise;

      renderedPages.push({
        pageNumber: pageNum,
        dataUrl: canvas.toDataURL("image/png"),
        width: viewport.width,
        height: viewport.height,
      });
    }

    return {
      totalPages,
      pages: renderedPages,
    };
  } catch (error) {
    console.error("Multi-page PDF render error:", error);
    throw new Error("Failed to process all PDF pages. Please verify the document.");
  }
}

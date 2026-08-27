import { jsPDF } from "jspdf";
import { BoundingBoxField } from "../types";

export interface PageImageSource {
  pageNumber: number;
  dataUrl: string;
}

export interface PdfGeneratorOptions {
  defaultFontSize?: number;
  defaultFontColor?: string;
}

/**
 * Renders a single page canvas with base document and mapped bounding box overlays
 */
export async function renderPageWithBurnIn(
  pageSource: PageImageSource,
  fieldsForPage: BoundingBoxField[],
  options?: PdfGeneratorOptions
): Promise<HTMLCanvasElement> {
  const defaultFontSize = options?.defaultFontSize || 11;
  const defaultFontColor = options?.defaultFontColor || "#1e3a8a";

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to initialize canvas 2D rendering context"));
        return;
      }

      // Use native resolution for crisp text & line art
      canvas.width = img.naturalWidth || 850;
      canvas.height = img.naturalHeight || 1100;

      // Draw base document
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Scale factor relative to standard 792pt letter height
      const ptScale = canvas.height / 792;

      // Overlay/burn in each mapped value
      fieldsForPage.forEach((field) => {
        if (!field.mapped_value) return;

        const [ymin, xmin, ymax, xmax] = field.box_2d;
        const boxX = (xmin / 1000) * canvas.width;
        const boxY = (ymin / 1000) * canvas.height;
        const boxW = ((xmax - xmin) / 1000) * canvas.width;
        const boxH = ((ymax - ymin) / 1000) * canvas.height;

        const fieldColor = field.font_color || defaultFontColor;
        const fieldPt = field.font_size || defaultFontSize;

        // Checkbox handling
        const val = field.mapped_value.trim();
        const isCheckbox =
          val === "X" ||
          val === "x" ||
          val === "✓" ||
          val === "[X]" ||
          val === "[x]" ||
          val === "true" ||
          val === "TRUE" ||
          val === "1";

        if (isCheckbox) {
          ctx.fillStyle = fieldColor;
          const checkSize = Math.max(12, Math.floor(Math.max(fieldPt * ptScale * 1.1, boxH * 0.8)));
          ctx.font = `bold ${checkSize}px sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("✓", boxX + boxW / 2, boxY + boxH / 2);
        } else {
          // Standard text box
          // Calculate font size based on pt setting scaled to canvas resolution, capped to box height
          const ptCalculatedSize = Math.round(fieldPt * ptScale);
          const fontSize = Math.max(9, Math.min(Math.floor(boxH * 0.9), ptCalculatedSize));
          
          ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Courier New", monospace`;
          ctx.fillStyle = fieldColor;
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";

          // Text positioning inside the bounding box (centered vertically in box)
          const textX = boxX + Math.max(4, boxW * 0.02);
          const textY = boxY + boxH / 2;

          // Clip to box boundary to prevent overflow
          ctx.save();
          ctx.beginPath();
          ctx.rect(boxX, boxY, boxW, boxH);
          ctx.clip();
          ctx.fillText(field.mapped_value, textX, textY, Math.max(20, boxW - 6));
          ctx.restore();
        }
      });

      resolve(canvas);
    };

    img.onerror = (err) => {
      reject(new Error(`Failed to load page image for page ${pageSource.pageNumber}: ${err}`));
    };

    img.src = pageSource.dataUrl;
  });
}

/**
 * Generates and downloads a complete, multi-page filled PDF document directly onto the user's device
 */
export async function downloadFilledDocumentPdf(
  pages: PageImageSource[],
  allFields: BoundingBoxField[],
  documentName: string = "document",
  options?: PdfGeneratorOptions,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  if (!pages || pages.length === 0) {
    throw new Error("No document pages available to generate PDF.");
  }

  // Sort pages by page number
  const sortedPages = [...pages].sort((a, b) => a.pageNumber - b.pageNumber);
  const total = sortedPages.length;

  let pdfDoc: jsPDF | null = null;

  for (let i = 0; i < total; i++) {
    const pageSource = sortedPages[i];
    if (onProgress) {
      onProgress(i + 1, total);
    }

    const pageFields = allFields.filter((f) => (f.page_number || 1) === pageSource.pageNumber);
    const canvas = await renderPageWithBurnIn(pageSource, pageFields, options);

    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;

    // Convert pixel dimensions to points (72 pt / 96 px = 0.75)
    const ptWidth = imgWidth * 0.75;
    const ptHeight = imgHeight * 0.75;
    const orientation = ptWidth > ptHeight ? "landscape" : "portrait";

    if (i === 0) {
      pdfDoc = new jsPDF({
        orientation,
        unit: "pt",
        format: [ptWidth, ptHeight],
      });
      pdfDoc.addImage(imgData, "JPEG", 0, 0, ptWidth, ptHeight, undefined, "FAST");
    } else if (pdfDoc) {
      pdfDoc.addPage([ptWidth, ptHeight], orientation);
      pdfDoc.addImage(imgData, "JPEG", 0, 0, ptWidth, ptHeight, undefined, "FAST");
    }
  }

  if (pdfDoc) {
    const cleanDocName = documentName.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `filled_${cleanDocName}.pdf`;
    
    // Save triggers native browser download to local device
    pdfDoc.save(filename);
  }
}

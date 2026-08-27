import React, { useRef, useEffect, useState } from "react";
import { BoundingBoxField } from "../types";
import { downloadFilledDocumentPdf } from "../utils/pdfGenerator";
import {
  Download,
  Printer,
  RefreshCw,
  FileText,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileDown,
  Check,
} from "lucide-react";

export interface PageImageSourceItem {
  pageNumber: number;
  dataUrl: string;
}

interface FilledDocumentPreviewProps {
  documentImageUrl: string;
  documentPages?: PageImageSourceItem[];
  fields: BoundingBoxField[];
  allFields?: BoundingBoxField[];
  documentName: string;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (newPage: number) => void;
  defaultFontSize?: number;
  defaultFontColor?: string;
}

export const FilledDocumentPreview: React.FC<FilledDocumentPreviewProps> = ({
  documentImageUrl,
  documentPages = [],
  fields,
  allFields,
  documentName,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  defaultFontSize = 11,
  defaultFontColor = "#1e3a8a",
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRendering, setIsRendering] = useState(true);
  const [downloadPngUrl, setDownloadPngUrl] = useState<string>("");
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [pdfDownloadSuccess, setPdfDownloadSuccess] = useState(false);
  const [pdfProgressText, setPdfProgressText] = useState<string>("");

  const effectiveAllFields = allFields || fields;

  useEffect(() => {
    if (!documentImageUrl) return;

    setIsRendering(true);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = documentImageUrl;

    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = img.naturalWidth || 850;
      canvas.height = img.naturalHeight || 1100;

      // Draw base document image
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const ptScale = canvas.height / 792;

      // Render each mapped value inside its detected box for the current page
      const currentPageFields = effectiveAllFields.filter(
        (f) => (f.page_number || 1) === currentPage
      );

      currentPageFields.forEach((field) => {
        if (!field.mapped_value) return;

        const [ymin, xmin, ymax, xmax] = field.box_2d;
        const boxX = (xmin / 1000) * canvas.width;
        const boxY = (ymin / 1000) * canvas.height;
        const boxW = ((xmax - xmin) / 1000) * canvas.width;
        const boxH = ((ymax - ymin) / 1000) * canvas.height;

        const fieldColor = field.font_color || defaultFontColor;
        const fieldPt = field.font_size || defaultFontSize;

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
          const checkSize = Math.max(12, Math.floor(Math.max(fieldPt * ptScale * 1.1, boxH * 0.8)));
          ctx.font = `bold ${checkSize}px sans-serif`;
          ctx.fillStyle = fieldColor;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("✓", boxX + boxW / 2, boxY + boxH / 2);
        } else {
          const ptCalculatedSize = Math.round(fieldPt * ptScale);
          const fontSize = Math.max(9, Math.min(Math.floor(boxH * 0.9), ptCalculatedSize));
          
          ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Courier New", monospace`;
          ctx.fillStyle = fieldColor;
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";

          const textX = boxX + Math.max(4, boxW * 0.02);
          const textY = boxY + boxH / 2;

          ctx.save();
          ctx.beginPath();
          ctx.rect(boxX, boxY, boxW, boxH);
          ctx.clip();
          ctx.fillText(field.mapped_value, textX, textY, Math.max(20, boxW - 6));
          ctx.restore();
        }
      });

      const url = canvas.toDataURL("image/png");
      setDownloadPngUrl(url);
      setIsRendering(false);
    };
  }, [documentImageUrl, effectiveAllFields, currentPage, defaultFontSize, defaultFontColor]);

  const handleDownloadPdf = async () => {
    try {
      setIsDownloadingPdf(true);
      setPdfDownloadSuccess(false);
      setPdfProgressText("Preparing filled PDF document...");

      // Prepare complete page list
      let pagesToInclude: PageImageSourceItem[] = [];
      if (documentPages && documentPages.length > 0) {
        pagesToInclude = documentPages;
      } else if (documentImageUrl) {
        pagesToInclude = [{ pageNumber: currentPage, dataUrl: documentImageUrl }];
      }

      await downloadFilledDocumentPdf(
        pagesToInclude,
        effectiveAllFields,
        documentName,
        { defaultFontSize, defaultFontColor },
        (curr, total) => {
          setPdfProgressText(`Compiling Page ${curr} of ${total}...`);
        }
      );

      setPdfDownloadSuccess(true);
      setTimeout(() => setPdfDownloadSuccess(false), 2500);
    } catch (err: any) {
      console.error("PDF Download error:", err);
      alert("Failed to download PDF: " + (err.message || String(err)));
    } finally {
      setIsDownloadingPdf(false);
      setPdfProgressText("");
    }
  };

  const handleDownloadImage = () => {
    if (!downloadPngUrl) return;
    const a = document.createElement("a");
    a.href = downloadPngUrl;
    a.download = `filled_${documentName.replace(/\.[^/.]+$/, "")}_p${currentPage}.png`;
    a.click();
  };

  const handlePrint = () => {
    if (!downloadPngUrl) return;
    const win = window.open("");
    if (win) {
      win.document.write(
        `<html><head><title>${documentName} - Page ${currentPage} Filled Preview</title></head><body style="margin:0;display:flex;justify-content:center;"><img src="${downloadPngUrl}" style="max-width:100%;height:auto;" onload="window.print();window.close();"/></body></html>`
      );
      win.document.close();
    }
  };

  const filledCountOnPage = effectiveAllFields.filter(
    (f) => (f.page_number || 1) === currentPage && f.mapped_value
  ).length;

  const totalFilledAcrossDoc = effectiveAllFields.filter((f) => f.mapped_value).length;

  return (
    <div
      id="filled-doc-preview"
      className="flex flex-col h-full bg-[#0a0a0a] border border-white/10 rounded-sm overflow-hidden shadow-2xl font-mono"
    >
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between px-3.5 py-2.5 bg-[#0f0f0f] border-b border-white/10 gap-2">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#00F5FF]" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Rendered Page {currentPage} ({filledCountOnPage} Stamped)
          </h3>
        </div>

        {/* Multi-Page Navigation */}
        {totalPages > 1 && onPageChange && (
          <div className="flex items-center bg-black/80 border border-white/15 rounded-sm p-0.5">
            <button
              id="prev-preview-page-btn"
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              className={`p-1 rounded-sm ${
                currentPage <= 1
                  ? "text-white/20 cursor-not-allowed"
                  : "text-[#00F5FF] hover:bg-white/10"
              }`}
              title="Previous Page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 text-[10px] font-bold text-white">
              P.{currentPage} / {totalPages}
            </span>
            <button
              id="next-preview-page-btn"
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
              className={`p-1 rounded-sm ${
                currentPage >= totalPages
                  ? "text-white/20 cursor-not-allowed"
                  : "text-[#00F5FF] hover:bg-white/10"
              }`}
              title="Next Page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Export & Download Actions */}
        <div className="flex items-center gap-2">
          {/* Download PDF Button */}
          <button
            id="download-filled-pdf-btn"
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-[11px] font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(0,245,255,0.3)] ${
              pdfDownloadSuccess
                ? "bg-green-500 text-black"
                : isDownloadingPdf
                ? "bg-[#00F5FF]/50 text-black cursor-wait"
                : "bg-[#00F5FF] hover:bg-[#00F5FF]/90 text-black active:scale-95 cursor-pointer"
            }`}
            title="Download complete filled PDF to local device"
          >
            {isDownloadingPdf ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                <span>{pdfProgressText || "Exporting PDF..."}</span>
              </>
            ) : pdfDownloadSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-black stroke-[3]" />
                <span>PDF Downloaded</span>
              </>
            ) : (
              <>
                <FileDown className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </>
            )}
          </button>

          {/* Download PNG Button */}
          <button
            id="download-filled-png-btn"
            onClick={handleDownloadImage}
            title="Download current page as high-res PNG"
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-black/80 hover:bg-white/10 text-white/80 rounded-sm text-[10px] font-bold uppercase tracking-wider transition-colors border border-white/10"
          >
            <Download className="w-3.5 h-3.5 text-[#00F5FF]" />
            <span className="hidden sm:inline">PNG</span>
          </button>

          {/* Print Button */}
          <button
            id="print-form-btn"
            onClick={handlePrint}
            title="Print form"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-black/80 hover:bg-white/10 text-white/80 rounded-sm text-[10px] font-bold uppercase tracking-wider transition-colors border border-white/10"
          >
            <Printer className="w-3.5 h-3.5 text-white/60" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Canvas Rendering Area - Auto-Fit Display Area centered without clipping */}
      <div className="flex-1 overflow-hidden p-3 bg-[#050505] flex items-center justify-center">
        {isRendering ? (
          <div className="flex items-center gap-2 text-white/50 text-xs">
            <RefreshCw className="w-4 h-4 animate-spin text-[#00F5FF]" />
            <span className="uppercase font-bold tracking-wider text-[10px]">
              Rendering High-Res Spatial Overlay...
            </span>
          </div>
        ) : (
          <div className="max-w-full max-h-full shadow-2xl rounded-sm border border-white/20 bg-white overflow-hidden flex items-center justify-center">
            <canvas
              ref={canvasRef}
              className="max-w-full max-h-full object-contain block select-none"
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
                display: "block",
              }}
            />
          </div>
        )}
      </div>

      {/* Footer Status */}
      <div className="px-4 py-2 bg-[#080808] border-t border-white/10 text-[10px] text-white/40 flex items-center justify-between font-mono">
        <div className="flex items-center gap-1.5 text-[#00F5FF]">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>
            {totalFilledAcrossDoc} Entities Stamped Across {totalPages} {totalPages === 1 ? "Page" : "Pages"}
          </span>
        </div>
        <span className="text-white/40 font-mono">INK: #1E3A8A // FULL_COVERAGE: 100%</span>
      </div>
    </div>
  );
};

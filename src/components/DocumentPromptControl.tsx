import React, { useRef, useState } from "react";
import { SAMPLE_PRESETS, generateSampleDocumentDataUrl } from "../data/samplePresets";
import { convertAllPdfPagesToDataUrls } from "../utils/pdfHelper";
import {
  UploadCloud,
  FileText,
  Sparkles,
  Zap,
  RotateCcw,
  Trash2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Edit3,
  Lock,
  FileDown,
} from "lucide-react";

export interface PageImageItem {
  pageNumber: number;
  dataUrl: string;
}

interface DocumentPromptControlProps {
  onDocumentLoaded: (
    pages: PageImageItem[],
    name: string,
    userText?: string,
    totalPages?: number,
    uploadedFile?: File | null
  ) => void;
  onExecuteMapping: (userDetailsText: string) => void;
  isProcessing: boolean;
  activePresetId: string | null;
  setActivePresetId: (id: string | null) => void;
  currentPromptText: string;
  setCurrentPromptText: (text: string) => void;
  processingTimeMs?: number;
  documentName?: string;
  totalPages?: number;
  isEditMode: boolean;
  onToggleEditMode: () => void;
  fieldsCount: number;
  onQuickExportPdf?: () => void;
  isDownloadingPdf?: boolean;
}

export const DocumentPromptControl: React.FC<DocumentPromptControlProps> = ({
  onDocumentLoaded,
  onExecuteMapping,
  isProcessing,
  activePresetId,
  setActivePresetId,
  currentPromptText,
  setCurrentPromptText,
  processingTimeMs,
  documentName = "Document",
  totalPages = 1,
  isEditMode,
  onToggleEditMode,
  fieldsCount,
  onQuickExportPdf,
  isDownloadingPdf = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [renderProgress, setRenderProgress] = useState<string>("");
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  const handleSelectPreset = (presetId: string) => {
    setActivePresetId(presetId);
    const preset = SAMPLE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    // Generate full page coverage for sample presets (Page 1 and Page 2)
    const page1Url = generateSampleDocumentDataUrl(presetId, 1);
    const page2Url = generateSampleDocumentDataUrl(presetId, 2);

    const pages: PageImageItem[] = [
      { pageNumber: 1, dataUrl: page1Url },
      { pageNumber: 2, dataUrl: page2Url },
    ];

    setCurrentPromptText(preset.sampleDetails);
    onDocumentLoaded(pages, `${preset.name}.png`, preset.sampleDetails, 2, null);
  };

  const handleRestoreCurrentPreset = () => {
    if (!activePresetId) {
      handleSelectPreset("form-w9");
      return;
    }
    const preset = SAMPLE_PRESETS.find((p) => p.id === activePresetId);
    if (preset) {
      setCurrentPromptText(preset.sampleDetails);
    }
  };

  const handleClearPayload = () => {
    setCurrentPromptText("");
  };

  const handleCopyPayload = () => {
    if (!currentPromptText) return;
    navigator.clipboard.writeText(currentPromptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processUploadedFile(file);
  };

  const processUploadedFile = async (file: File) => {
    setLoadingFile(true);
    setRenderProgress("Initiating layout rendering...");
    setActivePresetId(null);

    try {
      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        const { totalPages: pdfTotalPages, pages } = await convertAllPdfPagesToDataUrls(
          file,
          (curr, total) => {
            setRenderProgress(`Rendering Page ${curr} of ${total}...`);
          }
        );

        const formattedPages: PageImageItem[] = pages.map((p) => ({
          pageNumber: p.pageNumber,
          dataUrl: p.dataUrl,
        }));

        onDocumentLoaded(formattedPages, file.name, undefined, pdfTotalPages, file);
      } else {
        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string;
          const pages: PageImageItem[] = [{ pageNumber: 1, dataUrl }];
          onDocumentLoaded(pages, file.name, undefined, 1, file);
        };
        reader.readAsDataURL(file);
      }
    } catch (err: any) {
      alert("Error reading document: " + (err.message || String(err)));
    } finally {
      setLoadingFile(false);
      setRenderProgress("");
    }
  };

  return (
    <div
      id="document-prompt-control-card"
      className="bg-[#0a0a0a] border border-white/10 rounded-sm shadow-xl overflow-hidden font-mono"
    >
      {/* Top Bar: Action Buttons & Workflow Steps */}
      <div
        role="region"
        aria-label="Workflow Actions and Document Selection"
        className="bg-[#0f0f0f] border-b border-white/10 px-4 py-3 flex flex-wrap items-center justify-between gap-3"
      >
        {/* Left: Document Presets & Upload Controls */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Upload Document Button - 44px min touch target */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            onChange={handleFileChange}
            className="hidden"
            id="file-upload-input"
            aria-label="File upload input"
          />
          <button
            id="upload-doc-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={loadingFile}
            aria-label="Upload document or PDF file"
            className="flex items-center justify-center gap-2 px-4 min-h-[44px] rounded-sm bg-black/80 hover:bg-white/10 border border-white/20 hover:border-[#00F5FF]/60 text-xs font-bold text-white/95 transition-all shadow-sm focus-visible:ring-2 focus-visible:ring-[#00F5FF] focus-visible:outline-none active:scale-95"
          >
            {loadingFile ? (
              <div className="w-4 h-4 border-2 border-[#00F5FF] border-t-transparent rounded-full animate-spin flex-shrink-0" />
            ) : (
              <UploadCloud className="w-4 h-4 text-[#00F5FF] flex-shrink-0" />
            )}
            <span>{loadingFile ? renderProgress || "Loading..." : "Upload Document / PDF"}</span>
          </button>

          {/* Quick Preset Selector Chips with 44px touch targets */}
          <div
            role="group"
            aria-label="Sample Document Presets"
            className="hidden sm:flex items-center gap-1.5 pl-3 border-l border-white/15"
          >
            <span className="text-xs text-white/40 uppercase tracking-wider mr-1 font-bold">Presets:</span>
            {SAMPLE_PRESETS.map((preset) => {
              const isSelected = activePresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  id={`quick-preset-${preset.id}`}
                  onClick={() => handleSelectPreset(preset.id)}
                  aria-label={`Load preset ${preset.name}`}
                  aria-pressed={isSelected}
                  title={preset.name}
                  className={`px-3 min-h-[44px] rounded-sm text-xs font-semibold transition-all truncate max-w-[130px] lg:max-w-[160px] flex items-center justify-center focus-visible:ring-2 focus-visible:ring-[#00F5FF] focus-visible:outline-none active:scale-95 ${
                    isSelected
                      ? "bg-[#00F5FF]/20 border-2 border-[#00F5FF] text-[#00F5FF] font-bold shadow-[0_0_10px_rgba(0,245,255,0.3)]"
                      : "bg-black/60 border border-white/15 text-white/70 hover:text-white hover:bg-white/10 hover:border-white/30"
                  }`}
                >
                  {preset.name.split(" ")[0]} {preset.name.split(" ")[1] || ""}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: UI Action Sequence: [ Execute Spatial Fill ] -> [ Edit Form ] -> [ Save & Export PDF ] */}
        <div
          role="toolbar"
          aria-label="Primary Workflow Execution"
          className="flex items-center flex-wrap gap-2.5"
        >
          {/* Step 1: Execute Spatial Fill - 44px min height touch target with high contrast border */}
          <button
            id="run-spatial-mapping-btn"
            onClick={() => onExecuteMapping(currentPromptText)}
            disabled={isProcessing}
            aria-label="Execute Spatial Fill (Scan document layout and map unstructured user details to coordinates)"
            className={`flex items-center justify-center gap-2 px-5 min-h-[44px] rounded-sm text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(0,245,255,0.35)] border border-[#00F5FF] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white focus-visible:outline-none ${
              isProcessing
                ? "bg-[#00F5FF]/50 text-black cursor-wait"
                : "bg-[#00F5FF] hover:bg-[#00F5FF]/90 text-black active:scale-95 cursor-pointer"
            }`}
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin flex-shrink-0" />
                <span>Scanning & Mapping...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 fill-black text-black flex-shrink-0" />
                <span>Execute Spatial Fill</span>
              </>
            )}
          </button>

          {/* Step 2: Edit Form Button right after Execute Spatial Fill - 44px min height touch target */}
          <button
            id="toggle-edit-form-btn"
            onClick={onToggleEditMode}
            disabled={isProcessing || fieldsCount === 0}
            aria-label={isEditMode ? "Lock Form (Save layout adjustments)" : "Edit Form (Unlock transparent inline textboxes and draggable boundaries)"}
            aria-pressed={isEditMode}
            className={`flex items-center justify-center gap-2 px-4 min-h-[44px] rounded-sm text-xs font-bold uppercase tracking-wider transition-all border focus-visible:ring-2 focus-visible:ring-[#00F5FF] focus-visible:outline-none active:scale-95 cursor-pointer ${
              isEditMode
                ? "bg-emerald-500 hover:bg-emerald-400 text-black border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.5)] ring-1 ring-emerald-300"
                : "bg-black/90 hover:bg-[#00F5FF]/20 text-[#00F5FF] border-[#00F5FF]/60 hover:border-[#00F5FF] shadow-[0_0_12px_rgba(0,245,255,0.2)]"
            }`}
            title={
              isEditMode
                ? "Lock form layout and finalize coordinates"
                : "Unlock interactive dragging, resizing, and manual field editing on the canvas"
            }
          >
            {isEditMode ? (
              <>
                <Check className="w-4 h-4 stroke-[3] text-black flex-shrink-0" />
                <span>Lock Form</span>
              </>
            ) : (
              <>
                <Edit3 className="w-4 h-4 text-[#00F5FF] flex-shrink-0" />
                <span>Edit Form</span>
              </>
            )}
          </button>

          {/* Step 3: Save & Export PDF - 44px min height touch target */}
          {onQuickExportPdf && (
            <button
              id="workflow-export-pdf-btn"
              onClick={onQuickExportPdf}
              disabled={isDownloadingPdf || fieldsCount === 0}
              aria-label="Save final coordinate mappings and export filled PDF document"
              className="flex items-center justify-center gap-2 px-4 min-h-[44px] rounded-sm text-xs font-bold uppercase tracking-wider bg-white/10 hover:bg-white/15 border border-white/20 hover:border-white/40 text-white transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-[#00F5FF] focus-visible:outline-none active:scale-95"
              title="Save final coordinates & export PDF"
            >
              <FileDown className="w-4 h-4 text-[#00F5FF] flex-shrink-0" />
              <span className="hidden sm:inline">Save & Export PDF</span>
              <span className="sm:hidden">Export</span>
            </button>
          )}
        </div>
      </div>

      {/* Prominent User Information Payload (Source Entity Text) Section */}
      <div className="p-4 bg-[#080808]">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#00F5FF] flex-shrink-0" />
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">
              User Information Payload (Source Entity Text)
            </h2>
            <span className="text-[10px] text-white/50 bg-white/5 px-2.5 py-1 rounded border border-white/10">
              {currentPromptText ? `${currentPromptText.length} characters` : "Empty"}
            </span>
          </div>

          {/* Quick Payload Utilities - accessible touch targets */}
          <div className="flex items-center gap-2 text-xs">
            <button
              id="copy-payload-btn"
              onClick={handleCopyPayload}
              aria-label="Copy payload text to clipboard"
              title="Copy payload text"
              className="flex items-center justify-center gap-1.5 px-3 min-h-[36px] rounded-sm bg-black/80 hover:bg-white/10 border border-white/15 text-white/80 hover:text-white text-xs transition-colors focus-visible:ring-2 focus-visible:ring-[#00F5FF] focus-visible:outline-none"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#00F5FF]" />
                  <span className="text-[#00F5FF] font-bold">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>

            <button
              id="restore-payload-btn"
              onClick={handleRestoreCurrentPreset}
              aria-label="Restore sample payload entity text"
              title="Restore sample payload"
              className="flex items-center justify-center gap-1.5 px-3 min-h-[36px] rounded-sm bg-black/80 hover:bg-white/10 border border-white/15 text-white/80 hover:text-white text-xs transition-colors focus-visible:ring-2 focus-visible:ring-[#00F5FF] focus-visible:outline-none"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#00F5FF]" />
              <span>Restore Sample</span>
            </button>

            <button
              id="clear-payload-btn"
              onClick={handleClearPayload}
              aria-label="Clear payload input textarea"
              title="Clear payload text"
              className="flex items-center justify-center gap-1.5 px-3 min-h-[36px] rounded-sm bg-black/80 hover:bg-white/10 border border-white/15 text-white/80 hover:text-[#F27D26] text-xs transition-colors focus-visible:ring-2 focus-visible:ring-[#00F5FF] focus-visible:outline-none"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>

            <button
              id="toggle-payload-expand-btn"
              onClick={() => setIsExpanded(!isExpanded)}
              aria-label={isExpanded ? "Collapse payload input section" : "Expand payload input section"}
              aria-expanded={isExpanded}
              className="w-9 h-9 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-sm bg-black/80 hover:bg-white/10 border border-white/15 text-white/70 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-[#00F5FF] focus-visible:outline-none"
              title={isExpanded ? "Collapse payload" : "Expand payload"}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Textarea for Unstructured Entity Input */}
        {isExpanded && (
          <div className="space-y-2 animate-in slide-in-from-top-1 duration-150">
            <textarea
              id="user-information-payload-input"
              rows={4}
              aria-label="User Information Payload (Source Entity Text)"
              value={currentPromptText}
              onChange={(e) => setCurrentPromptText(e.target.value)}
              placeholder="Paste raw applicant bio, unstructured customer notes, medical records, or user profile..."
              className="w-full bg-black/90 border border-white/20 rounded-sm p-3 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#00F5FF] focus:ring-2 focus:ring-[#00F5FF]/50 font-mono leading-relaxed resize-y selection:bg-[#00F5FF] selection:text-black"
            />
            <div className="flex flex-wrap items-center justify-between text-xs text-white/50 pt-0.5 gap-2">
              <div className="flex items-center gap-1.5 text-[#00F5FF]">
                <ShieldCheck className="w-4 h-4 text-[#00F5FF] flex-shrink-0" />
                <span>Strict Zero-Sample Mode Active: Only values present in this payload are stamped.</span>
              </div>
              <span className="text-white/40">
                Press <b className="text-white">Execute Spatial Fill</b>, then <b className="text-white">Edit Form</b> to adjust boxes or type values.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

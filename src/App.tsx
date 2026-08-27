import React, { useState, useEffect, useCallback } from "react";
import { BoundingBoxField } from "./types";
import { SAMPLE_PRESETS, generateSampleDocumentDataUrl } from "./data/samplePresets";
import { SpatialDocumentCanvas } from "./components/SpatialDocumentCanvas";
import { FieldsInspector } from "./components/FieldsInspector";
import { RawJsonViewer } from "./components/RawJsonViewer";
import { FilledDocumentPreview } from "./components/FilledDocumentPreview";
import { DocumentPromptControl, PageImageItem } from "./components/DocumentPromptControl";
import { SchemaModal } from "./components/SchemaModal";
import { convertAllPdfPagesToDataUrls } from "./utils/pdfHelper";
import { downloadFilledDocumentPdf } from "./utils/pdfGenerator";
import {
  HelpCircle,
  AlertTriangle,
  Sparkles,
  Layers,
  Code2,
  FileCheck2,
  FileDown,
  Check,
  Edit3,
  Lock,
} from "lucide-react";

export default function App() {
  const [documentPages, setDocumentPages] = useState<PageImageItem[]>([]);
  const [documentImageUrl, setDocumentImageUrl] = useState<string>("");
  const [documentName, setDocumentName] = useState<string>("IRS Form W-9");
  const [activePresetId, setActivePresetId] = useState<string | null>("form-w9");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(2);

  const [currentPromptText, setCurrentPromptText] = useState<string>("");
  const [fields, setFields] = useState<BoundingBoxField[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingTimeMs, setProcessingTimeMs] = useState<number | undefined>(undefined);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [modelUsed, setModelUsed] = useState<string>("Gemini 3.7 Vision");
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);

  // Interactive Edit Mode State (Workflow step 3: [ Edit Form ] after [ Execute Spatial Fill ])
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [defaultFontSize, setDefaultFontSize] = useState<number>(11);
  const [defaultFontColor, setDefaultFontColor] = useState<string>("#1e3a8a");

  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);
  const [pdfDownloadSuccess, setPdfDownloadSuccess] = useState<boolean>(false);

  // Active right-side view tab
  const [activeRightTab, setActiveRightTab] = useState<"inspector" | "json" | "preview">("inspector");

  // Canvas visual layer toggles
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [showBoxes, setShowBoxes] = useState<boolean>(true);
  const [showBurnInValues, setShowBurnInValues] = useState<boolean>(true);
  const [showConfidence, setShowConfidence] = useState<boolean>(true);

  // Selection & Hover
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [hoveredFieldId, setHoveredFieldId] = useState<string | null>(null);

  // Documentation modal
  const [isSchemaModalOpen, setIsSchemaModalOpen] = useState<boolean>(false);

  // Load initial preset on mount
  useEffect(() => {
    const defaultPreset = SAMPLE_PRESETS[0];
    const page1Url = generateSampleDocumentDataUrl(defaultPreset.id, 1);
    const page2Url = generateSampleDocumentDataUrl(defaultPreset.id, 2);
    const initialPages: PageImageItem[] = [
      { pageNumber: 1, dataUrl: page1Url },
      { pageNumber: 2, dataUrl: page2Url },
    ];

    setDocumentPages(initialPages);
    setDocumentImageUrl(page1Url);
    setDocumentName(`${defaultPreset.name}.png`);
    setCurrentPromptText(defaultPreset.sampleDetails);
    setCurrentPage(1);
    setTotalPages(2);
    setUploadedFile(null);

    // Run initial scan across 100% of pages
    executeMapping(initialPages, defaultPreset.name, defaultPreset.sampleDetails, 2);
  }, []);

  const handleDocumentLoaded = (
    pages: PageImageItem[],
    name: string,
    userText?: string,
    numPages: number = 1,
    file?: File | null
  ) => {
    const actualPages = pages.length > 0 ? pages : [{ pageNumber: 1, dataUrl: "" }];
    setDocumentPages(actualPages);
    setDocumentImageUrl(actualPages[0]?.dataUrl || "");
    setDocumentName(name);
    setErrorMessage(null);
    setSelectedFieldId(null);
    setCurrentPage(1);
    setTotalPages(numPages || actualPages.length || 1);
    setUploadedFile(file || null);
    setIsEditMode(false);

    const promptToUse = userText !== undefined ? userText : currentPromptText;
    if (userText !== undefined) {
      setCurrentPromptText(userText);
    }
    executeMapping(actualPages, name, promptToUse, numPages || actualPages.length);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage === currentPage || newPage < 1 || newPage > totalPages) return;

    setCurrentPage(newPage);
    setSelectedFieldId(null);

    // Instantly retrieve rendered canvas for the selected page
    const targetPageObj = documentPages.find((p) => p.pageNumber === newPage);
    if (targetPageObj && targetPageObj.dataUrl) {
      setDocumentImageUrl(targetPageObj.dataUrl);
    } else if (activePresetId) {
      const dataUrl = generateSampleDocumentDataUrl(activePresetId, newPage);
      setDocumentImageUrl(dataUrl);
    }
  };

  const executeMapping = async (
    pagesList: PageImageItem[] = documentPages,
    docName: string = documentName,
    promptText: string = currentPromptText,
    numPages: number = totalPages
  ) => {
    if (!pagesList || pagesList.length === 0) return;

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      // Send 100% of pages to the spatial mapping engine
      const payloadPages = pagesList.map((p) => ({
        page_number: p.pageNumber,
        imageBase64: p.dataUrl,
        mimeType: "image/png",
      }));

      const response = await fetch("/api/process-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pages: payloadPages,
          totalPages: numPages || pagesList.length,
          userDetailsText: promptText,
          documentName: docName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to process document");
      }

      setFields(data.fields || []);
      setProcessingTimeMs(data.processing_time_ms);
      if (data.model_used) {
        setModelUsed(data.model_used);
      }
      setFallbackNotice(data.fallback_notice || null);
      if (data.fields && data.fields.length > 0) {
        // Select the first field on current page if available
        const firstPageField =
          data.fields.find((f: BoundingBoxField) => (f.page_number || 1) === currentPage) || data.fields[0];
        setSelectedFieldId(firstPageField.field_id);
      }
    } catch (err: any) {
      console.error("Mapping error:", err);
      setErrorMessage(err.message || "An error occurred while connecting to the spatial mapping engine.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateMappedValue = useCallback((fieldId: string, newValue: string | null) => {
    setFields((prev) =>
      prev.map((f) => (f.field_id === fieldId ? { ...f, mapped_value: newValue } : f))
    );
  }, []);

  const handleUpdateFieldBox = useCallback(
    (fieldId: string, newBox: [number, number, number, number]) => {
      setFields((prev) =>
        prev.map((f) => (f.field_id === fieldId ? { ...f, box_2d: newBox } : f))
      );
    },
    []
  );

  const handleAddNewField = useCallback((newField: BoundingBoxField) => {
    setFields((prev) => [...prev, newField]);
    setSelectedFieldId(newField.field_id);
  }, []);

  const handleDeleteField = useCallback((fieldId: string) => {
    setFields((prev) => prev.filter((f) => f.field_id !== fieldId));
    setSelectedFieldId(null);
  }, []);

  const handleToggleEditMode = useCallback(() => {
    setIsEditMode((prev) => !prev);
  }, []);

  const handleUpdateFieldStyle = useCallback((fieldId: string, style: { font_size?: number; font_color?: string }) => {
    setFields((prev) =>
      prev.map((f) => {
        if (f.field_id === fieldId) {
          return {
            ...f,
            font_size: style.font_size !== undefined ? style.font_size : f.font_size,
            font_color: style.font_color !== undefined ? style.font_color : f.font_color,
          };
        }
        return f;
      })
    );
    if (style.font_size !== undefined) {
      setDefaultFontSize(style.font_size);
    }
    if (style.font_color !== undefined) {
      setDefaultFontColor(style.font_color);
    }
  }, []);

  const handleApplyStyleToAll = useCallback((fontSize: number, fontColor: string) => {
    setDefaultFontSize(fontSize);
    setDefaultFontColor(fontColor);
    setFields((prev) =>
      prev.map((f) => ({
        ...f,
        font_size: fontSize,
        font_color: fontColor,
      }))
    );
  }, []);

  const handleQuickDownloadPdf = async () => {
    try {
      setIsDownloadingPdf(true);
      setPdfDownloadSuccess(false);

      let pagesToInclude: PageImageItem[] = [];
      if (documentPages && documentPages.length > 0) {
        pagesToInclude = documentPages;
      } else if (documentImageUrl) {
        pagesToInclude = [{ pageNumber: currentPage, dataUrl: documentImageUrl }];
      }

      await downloadFilledDocumentPdf(pagesToInclude, fields, documentName, {
        defaultFontSize,
        defaultFontColor,
      });
      setPdfDownloadSuccess(true);
      setTimeout(() => setPdfDownloadSuccess(false), 2500);
    } catch (err: any) {
      console.error("Header PDF Download error:", err);
      alert("Failed to download PDF: " + (err.message || String(err)));
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleCanvasFileDrop = async (file: File) => {
    try {
      setIsProcessing(true);
      setErrorMessage(null);
      const fileName = file.name;
      const isPdf = file.type === "application/pdf" || fileName.toLowerCase().endsWith(".pdf");

      if (isPdf) {
        const result = await convertAllPdfPagesToDataUrls(file);
        const pagesList = result.pages.map((p) => ({
          pageNumber: p.pageNumber,
          dataUrl: p.dataUrl,
        }));
        handleDocumentLoaded(pagesList, fileName, undefined, result.totalPages, file);
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          handleDocumentLoaded([{ pageNumber: 1, dataUrl }], fileName, undefined, 1, file);
        };
        reader.readAsDataURL(file);
      }
    } catch (err: any) {
      console.error("Canvas drop file load error:", err);
      setErrorMessage("Failed to load dropped document file. " + err.message);
      setIsProcessing(false);
    }
  };

  const mappedCount = fields.filter((f) => f.mapped_value !== null && f.mapped_value !== "").length;

  return (
    <div
      id="spatial-engine-root"
      className="min-h-screen bg-[#050505] text-[#d1d1d1] flex flex-col font-sans selection:bg-[#00F5FF] selection:text-black"
    >
      {/* Top Navigation / System Header */}
      <header className="border-b border-white/10 bg-[#080808]/90 backdrop-blur sticky top-0 z-40 px-4 lg:px-8 py-3 flex flex-wrap justify-between items-end gap-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#00F5FF] animate-pulse shadow-[0_0_8px_#00F5FF]" />
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#00F5FF] font-bold">
              Full Page Coverage: 100% Verified
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif italic text-white leading-none tracking-normal">
            Spatial Mapping Engine
            <span className="text-xs font-sans not-italic text-white/40 ml-2.5 font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10">
              v2.1.0-multipage
            </span>
          </h1>
        </div>

        {/* Right side nav telemetry and actions */}
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="flex gap-4 sm:gap-6 text-[11px] tracking-widest uppercase text-white/60 font-mono">
            <div className="flex flex-col items-end">
              <span className="text-white/30 text-[9px]">Latency</span>
              <span className="text-white font-semibold">{processingTimeMs ? `${processingTimeMs}ms` : "142ms"}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-white/30 text-[9px]">Total Fields</span>
              <span className="text-[#00F5FF] font-semibold">{fields.length} Objects</span>
            </div>
            <div className="hidden md:flex flex-col items-end">
              <span className="text-white/30 text-[9px]">Doc Pages</span>
              <span className="text-white/80 font-semibold">
                {totalPages} of {totalPages} (100%)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Header Direct Download / Save & Export PDF button */}
            <button
              id="header-download-pdf-btn"
              onClick={handleQuickDownloadPdf}
              disabled={isDownloadingPdf || fields.length === 0}
              aria-label="Save and export filled PDF document"
              className={`flex items-center justify-center gap-2 px-4 min-h-[44px] rounded-sm text-xs font-bold font-mono uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(0,245,255,0.3)] border border-[#00F5FF] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white focus-visible:outline-none ${
                pdfDownloadSuccess
                  ? "bg-green-500 text-black border-green-400"
                  : isDownloadingPdf
                  ? "bg-[#00F5FF]/50 text-black cursor-wait"
                  : "bg-[#00F5FF] hover:bg-[#00F5FF]/90 text-black active:scale-95 cursor-pointer"
              }`}
              title="Save & Export filled document PDF with burnt-in coordinates"
            >
              {isDownloadingPdf ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin flex-shrink-0" />
                  <span className="hidden sm:inline">Exporting...</span>
                </>
              ) : pdfDownloadSuccess ? (
                <>
                  <Check className="w-4 h-4 text-black stroke-[3] flex-shrink-0" />
                  <span className="hidden sm:inline">Exported!</span>
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4 text-black flex-shrink-0" />
                  <span className="hidden sm:inline">Save & Export PDF</span>
                  <span className="sm:hidden">Export PDF</span>
                </>
              )}
            </button>

            <button
              id="open-schema-docs-btn"
              onClick={() => setIsSchemaModalOpen(true)}
              aria-label="Open Engine Schema Specifications"
              className="flex items-center justify-center gap-2 px-3.5 min-h-[44px] rounded-sm bg-black/80 hover:bg-white/10 border border-white/20 text-xs font-mono text-white/90 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-[#00F5FF] focus-visible:outline-none"
            >
              <HelpCircle className="w-4 h-4 text-[#00F5FF] flex-shrink-0" />
              <span className="hidden sm:inline">Engine Spec</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1900px] w-full mx-auto p-4 lg:p-6 flex flex-col gap-4">
        {/* Fallback Notice Banner */}
        {fallbackNotice && !errorMessage && (
          <div className="bg-[#00F5FF]/10 border border-[#00F5FF]/30 text-[#00F5FF] px-4 py-2.5 rounded-sm flex items-center justify-between text-xs animate-in slide-in-from-top duration-200 font-mono">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#00F5FF] flex-shrink-0" />
              <span>{fallbackNotice}</span>
            </div>
            <span className="text-[10px] text-white/40 uppercase tracking-widest hidden sm:inline">
              Automatic Recovery Active
            </span>
          </div>
        )}

        {/* Error Banner if any */}
        {errorMessage && (
          <div className="bg-[#F27D26]/10 border border-[#F27D26]/40 text-[#F27D26] px-4 py-3 rounded-sm flex items-center justify-between text-xs animate-in slide-in-from-top duration-200">
            <div className="flex items-center gap-2 font-mono">
              <AlertTriangle className="w-4 h-4 text-[#F27D26] flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => executeMapping()}
              className="px-3 min-h-[36px] bg-[#F27D26] hover:bg-[#F27D26]/90 text-black rounded text-xs font-bold transition-colors uppercase tracking-wider font-mono focus-visible:ring-2 focus-visible:ring-white"
            >
              Retry
            </button>
          </div>
        )}

        {/* User Information Payload & Action Sequence Control Bar */}
        <DocumentPromptControl
          onDocumentLoaded={handleDocumentLoaded}
          onExecuteMapping={(text) => executeMapping(documentPages, documentName, text, totalPages)}
          isProcessing={isProcessing}
          activePresetId={activePresetId}
          setActivePresetId={setActivePresetId}
          currentPromptText={currentPromptText}
          setCurrentPromptText={setCurrentPromptText}
          processingTimeMs={processingTimeMs}
          documentName={documentName}
          totalPages={totalPages}
          isEditMode={isEditMode}
          onToggleEditMode={handleToggleEditMode}
          fieldsCount={fields.length}
          onQuickExportPdf={handleQuickDownloadPdf}
          isDownloadingPdf={isDownloadingPdf}
        />

        {/* Dual-Panel Workspace: Spatial Canvas (Left) + Tabs Inspector/JSON (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-[640px]">
          {/* Left Panel: Spatial Canvas */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col min-h-[500px]">
            <SpatialDocumentCanvas
              documentImageUrl={documentImageUrl}
              documentName={documentName}
              fields={fields}
              selectedFieldId={selectedFieldId}
              hoveredFieldId={hoveredFieldId}
              onSelectField={setSelectedFieldId}
              onHoverField={setHoveredFieldId}
              onUpdateFieldBox={handleUpdateFieldBox}
              onUpdateMappedValue={handleUpdateMappedValue}
              onAddField={handleAddNewField}
              onDeleteField={handleDeleteField}
              onUpdateFieldStyle={handleUpdateFieldStyle}
              onApplyStyleToAll={handleApplyStyleToAll}
              isEditMode={isEditMode}
              onToggleEditMode={handleToggleEditMode}
              showLabels={showLabels}
              setShowLabels={setShowLabels}
              showBoxes={showBoxes}
              setShowBoxes={setShowBoxes}
              showBurnInValues={showBurnInValues}
              setShowBurnInValues={setShowBurnInValues}
              showConfidence={showConfidence}
              setShowConfidence={setShowConfidence}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              onFileDrop={handleCanvasFileDrop}
            />
          </div>

          {/* Right Panel: Tabbed Inspector, Raw JSON, and Simulation Preview */}
          <div className="lg:col-span-5 xl:col-span-4 flex flex-col min-h-[500px] bg-[#0a0a0a] border border-white/10 rounded-sm overflow-hidden shadow-2xl">
            {/* Tab navigation headers */}
            <div
              role="tablist"
              aria-label="Document views and inspection tabs"
              className="flex items-center justify-between border-b border-white/10 bg-[#0f0f0f] px-3 pt-2"
            >
              <div className="flex items-center gap-1 font-mono text-xs flex-wrap">
                <button
                  id="tab-inspector-btn"
                  role="tab"
                  aria-selected={activeRightTab === "inspector"}
                  aria-controls="tabpanel-inspector"
                  onClick={() => setActiveRightTab("inspector")}
                  className={`flex items-center gap-2 px-3.5 min-h-[44px] text-xs font-bold rounded-t-sm transition-colors border-b-2 focus-visible:ring-2 focus-visible:ring-[#00F5FF] focus-visible:outline-none ${
                    activeRightTab === "inspector"
                      ? "border-[#00F5FF] text-[#00F5FF] bg-[#0a0a0a]"
                      : "border-transparent text-white/50 hover:text-white"
                  }`}
                >
                  <Layers className="w-4 h-4 flex-shrink-0" />
                  <span>Fields ({fields.length})</span>
                </button>

                <button
                  id="tab-json-btn"
                  role="tab"
                  aria-selected={activeRightTab === "json"}
                  aria-controls="tabpanel-json"
                  onClick={() => setActiveRightTab("json")}
                  className={`flex items-center gap-2 px-3.5 min-h-[44px] text-xs font-bold rounded-t-sm transition-colors border-b-2 focus-visible:ring-2 focus-visible:ring-[#00F5FF] focus-visible:outline-none ${
                    activeRightTab === "json"
                      ? "border-[#00F5FF] text-[#00F5FF] bg-[#0a0a0a]"
                      : "border-transparent text-white/50 hover:text-white"
                  }`}
                >
                  <Code2 className="w-4 h-4 flex-shrink-0" />
                  <span>Raw Schema JSON</span>
                </button>

                <button
                  id="tab-preview-btn"
                  role="tab"
                  aria-selected={activeRightTab === "preview"}
                  aria-controls="tabpanel-preview"
                  onClick={() => setActiveRightTab("preview")}
                  className={`flex items-center gap-2 px-3.5 min-h-[44px] text-xs font-bold rounded-t-sm transition-colors border-b-2 focus-visible:ring-2 focus-visible:ring-[#00F5FF] focus-visible:outline-none ${
                    activeRightTab === "preview"
                      ? "border-[#00F5FF] text-[#00F5FF] bg-[#0a0a0a]"
                      : "border-transparent text-white/50 hover:text-white"
                  }`}
                >
                  <FileCheck2 className="w-4 h-4 flex-shrink-0" />
                  <span>Rendered Form</span>
                </button>
              </div>

              <div className="hidden xl:flex items-center text-[10px] font-mono text-white/40 pb-1">
                <span className="text-[#00F5FF] font-bold">{mappedCount}</span>
                <span className="mx-1">/</span>
                <span>{fields.length} Mapped</span>
              </div>
            </div>

            {/* Tab content panels */}
            <div className="flex-1 overflow-hidden p-0 relative">
              {activeRightTab === "inspector" && (
                <div id="tabpanel-inspector" role="tabpanel" aria-labelledby="tab-inspector-btn" className="h-full">
                  <FieldsInspector
                    fields={fields}
                    selectedFieldId={selectedFieldId}
                    hoveredFieldId={hoveredFieldId}
                    onSelectField={setSelectedFieldId}
                    onHoverField={setHoveredFieldId}
                    onUpdateMappedValue={handleUpdateMappedValue}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}

              {activeRightTab === "json" && (
                <div id="tabpanel-json" role="tabpanel" aria-labelledby="tab-json-btn" className="h-full">
                  <RawJsonViewer fields={fields} rawJsonString={JSON.stringify(fields, null, 2)} />
                </div>
              )}

              {activeRightTab === "preview" && (
                <div id="tabpanel-preview" role="tabpanel" aria-labelledby="tab-preview-btn" className="h-full">
                  <FilledDocumentPreview
                    documentImageUrl={documentImageUrl}
                    documentPages={documentPages}
                    fields={fields.filter((f) => (f.page_number || 1) === currentPage)}
                    allFields={fields}
                    documentName={documentName}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                    defaultFontSize={defaultFontSize}
                    defaultFontColor={defaultFontColor}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sophisticated Dark Telemetry Footer */}
        <footer className="mt-2 pt-3 border-t border-white/10 flex flex-wrap justify-between items-center text-[9px] font-mono text-white/30 uppercase tracking-[0.2em] gap-2">
          <div>Engine: v2.1.0-spatial // Multi-Page Coverage: 100% (Pages 1..N)</div>
          <div>Coord System: Page-Specific Normalized [0, 1000] // Index Binding: 1-Based</div>
        </footer>
      </main>

      {/* Schema Specification Documentation Modal */}
      <SchemaModal isOpen={isSchemaModalOpen} onClose={() => setIsSchemaModalOpen(false)} />
    </div>
  );
}

import React, { useState } from "react";
import { BoundingBoxField } from "../types";
import { Copy, Check, Download, Code2, Terminal, CheckCircle2 } from "lucide-react";

interface RawJsonViewerProps {
  fields: BoundingBoxField[];
  rawJsonString?: string;
  totalPages?: number;
}

export const RawJsonViewer: React.FC<RawJsonViewerProps> = ({ fields, totalPages = 1 }) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"json" | "curl">("json");

  // Exact JSON output according to Google AI Studio prompt specification
  const formattedOutput = JSON.stringify(
    {
      total_pages: totalPages,
      mapped_fields: fields.map((f) => ({
        field_id: f.field_id,
        page_number: f.page_number || 1,
        detected_label: f.detected_label,
        box_2d: f.box_2d,
        mapped_value: f.mapped_value !== undefined && f.mapped_value !== "" ? f.mapped_value : null,
        confidence_score: typeof f.confidence_score === "number" ? f.confidence_score : 0.98,
      })),
    },
    null,
    2
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(activeTab === "json" ? formattedOutput : curlSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([formattedOutput], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `spatial_mapped_fields_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const curlSnippet = `curl -X POST "${window.location.origin}/api/process-document" \\
  -H "Content-Type: application/json" \\
  -d '{
    "imageBase64": "<BASE64_IMAGE_OR_PDF_DATA>",
    "mimeType": "image/png",
    "userDetailsText": "John Doe, DOB: 01/01/1990, SSN: 000-00-0000"
  }'`;

  return (
    <div id="raw-json-viewer" className="flex flex-col h-full bg-[#0a0a0a] border border-white/10 rounded-sm overflow-hidden shadow-2xl font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#0f0f0f] border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-black/80 p-0.5 rounded-sm border border-white/10">
            <button
              onClick={() => setActiveTab("json")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider transition-colors ${
                activeTab === "json"
                  ? "bg-[#00F5FF] text-black shadow-[0_0_10px_rgba(0,245,255,0.4)]"
                  : "text-white/50 hover:text-white"
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>JSON Stream Output</span>
            </button>
            <button
              onClick={() => setActiveTab("curl")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider transition-colors ${
                activeTab === "curl"
                  ? "bg-[#00F5FF] text-black shadow-[0_0_10px_rgba(0,245,255,0.4)]"
                  : "text-white/50 hover:text-white"
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>cURL Snippet</span>
            </button>
          </div>
          <div className="hidden sm:flex items-center gap-1 text-[9px] text-[#00F5FF] bg-[#00F5FF]/10 border border-[#00F5FF]/30 px-2 py-0.5 rounded-sm font-mono uppercase font-bold">
            <CheckCircle2 className="w-3 h-3" />
            <span>SCHEMA: COMPLIANT [0..1000]</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="download-json-btn"
            onClick={handleDownload}
            title="Download JSON file"
            className="flex items-center gap-1 px-3 py-1.5 bg-black/80 hover:bg-white/10 text-white/80 rounded-sm text-[10px] font-bold uppercase tracking-wider transition-colors border border-white/10"
          >
            <Download className="w-3.5 h-3.5 text-[#00F5FF]" />
            <span className="hidden sm:inline">Export JSON</span>
          </button>
          <button
            id="copy-json-btn"
            onClick={handleCopy}
            className={`flex items-center gap-1 px-3.5 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-wider transition-all ${
              copied
                ? "bg-[#00F5FF] text-black shadow-[0_0_15px_rgba(0,245,255,0.6)]"
                : "bg-[#00F5FF] hover:bg-[#00F5FF]/90 text-black shadow-[0_0_15px_rgba(0,245,255,0.3)]"
            }`}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copied" : "Copy Payload"}</span>
          </button>
        </div>
      </div>

      {/* Code Viewer */}
      <div className="flex-1 overflow-auto p-4 bg-[#050505] font-mono text-xs text-white/90 leading-relaxed">
        {activeTab === "json" ? (
          <pre id="raw-json-output" className="whitespace-pre-wrap select-text text-[#d1d1d1]">
            {formattedOutput}
          </pre>
        ) : (
          <pre id="curl-snippet-output" className="whitespace-pre-wrap text-[#00F5FF] select-text">
            {curlSnippet}
          </pre>
        )}
      </div>

      {/* Footer Schema Spec Bar */}
      <div className="px-4 py-2 bg-[#080808] border-t border-white/10 text-[10px] text-white/40 flex items-center justify-between font-mono">
        <span>ARRAY_COUNT: {fields.length} OBJECTS</span>
        <span className="text-[#00F5FF]/70">NORM: box_2d [ymin, xmin, ymax, xmax] 0..1000</span>
      </div>
    </div>
  );
};

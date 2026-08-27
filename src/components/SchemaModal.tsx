import React from "react";
import { X, BookOpen, Layers, CheckCircle2, Code2, ArrowRight, ShieldCheck, Target } from "lucide-react";

interface SchemaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SchemaModal: React.FC<SchemaModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 font-mono">
      <div className="bg-[#0c0c0c] border border-white/15 rounded-sm max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#111111] border-b border-white/10">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#00F5FF]" />
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">
              Document Processing & Spatial Mapping Specification
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-sm text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-white/70 leading-relaxed font-mono">
          {/* Core Mandates */}
          <div className="bg-black/60 p-4 rounded-sm border border-[#00F5FF]/30 space-y-2">
            <h3 className="font-bold text-white text-xs uppercase text-[#00F5FF] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>Strictly Enforced Engine Mandates</span>
            </h3>
            <ul className="list-disc pl-5 text-[11px] text-white/80 space-y-1">
              <li>
                <strong>Full Page Coverage:</strong> Performs visual layout analysis across 100% of uploaded PDF files ($1, 2, \dots, N$) with zero omission or truncation.
              </li>
              <li>
                <strong>Page-Specific Coordinates:</strong> Bounding boxes normalized strictly to each individual page's dimensions on a $[0, 1000]$ integer grid.
              </li>
              <li>
                <strong>1-Based Page Index Binding:</strong> Every form field entity explicitly tagged with its 1-based <code className="text-[#00F5FF] bg-black px-1 rounded-sm">page_number</code> for accurate downstream canvas rendering.
              </li>
            </ul>
          </div>

          {/* 3 Pipeline Stages */}
          <div className="space-y-3">
            <h3 className="font-bold text-white text-xs uppercase tracking-wider">
              Execution Pipeline Stages
            </h3>

            <div className="p-3 bg-black/40 rounded-sm border border-white/10 space-y-1">
              <div className="font-bold text-[#00F5FF] text-[11px] uppercase">
                Stage 1: Multi-Page Visual Layout & Coordinate Extraction
              </div>
              <p className="text-white/60 text-[11px]">
                Scans 100% of document pages ($1..N$) to identify fillable input boxes, underline blanks, and checkboxes.
                Calculates normalized coordinates on $[0, 1000]$:
              </p>
              <ul className="list-disc pl-5 font-mono text-[10px] text-white/50 space-y-0.5 mt-1">
                <li>ymin: Top edge coordinate (0 to 1000)</li>
                <li>xmin: Left edge coordinate (0 to 1000)</li>
                <li>ymax: Bottom edge coordinate (0 to 1000)</li>
                <li>xmax: Right edge coordinate (0 to 1000)</li>
              </ul>
            </div>

            <div className="p-3 bg-black/40 rounded-sm border border-white/10 space-y-1">
              <div className="font-bold text-[#00F5FF] text-[11px] uppercase">
                Stage 2: Semantic Matching (Zero-Hallucination)
              </div>
              <p className="text-white/60 text-[11px]">
                Matches extracted user prompt parameters against detected field labels based on semantic relevance.
                Never generates sample/fake values. If unstated, outputs strictly <code className="text-[#F27D26] bg-black px-1 rounded-sm">mapped_value: null</code>.
              </p>
            </div>

            <div className="p-3 bg-black/40 rounded-sm border border-white/10 space-y-1">
              <div className="font-bold text-[#00F5FF] text-[11px] uppercase">
                Stage 3: JSON Output Schema
              </div>
              <pre className="p-3 bg-black rounded-sm text-[#00F5FF] font-mono text-[10px] overflow-x-auto mt-2 border border-white/10">
{`[
  {
    "field_id": "p1_field_1",
    "detected_label": "Applicant Full Name",
    "page_number": 1,
    "box_2d": [ymin, xmin, ymax, xmax],
    "mapped_value": "Extracted text or null",
    "confidence_score": 0.98
  }
]`}
              </pre>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-[#111111] border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#00F5FF] hover:bg-[#00F5FF]/90 text-black rounded-sm text-xs font-bold uppercase tracking-wider transition-colors font-mono"
          >
            Close Spec
          </button>
        </div>
      </div>
    </div>
  );
};

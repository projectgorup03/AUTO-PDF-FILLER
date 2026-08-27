import React, { useState } from "react";
import { BoundingBoxField } from "../types";
import {
  Search,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Check,
  X,
  Target,
  Copy,
  CheckCheck,
  SlidersHorizontal,
  FileText,
} from "lucide-react";

interface FieldsInspectorProps {
  fields: BoundingBoxField[];
  selectedFieldId: string | null;
  hoveredFieldId: string | null;
  onSelectField: (id: string | null) => void;
  onHoverField: (id: string | null) => void;
  onUpdateMappedValue: (fieldId: string, newValue: string | null) => void;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}

export const FieldsInspector: React.FC<FieldsInspectorProps> = ({
  fields,
  selectedFieldId,
  hoveredFieldId,
  onSelectField,
  onHoverField,
  onUpdateMappedValue,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "mapped" | "unmapped">("all");
  const [pageFilter, setPageFilter] = useState<"all" | number>("all");
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [copiedFieldId, setCopiedFieldId] = useState<string | null>(null);

  const mappedCount = fields.filter((f) => f.mapped_value !== null && f.mapped_value !== "").length;
  const unmappedCount = fields.length - mappedCount;

  const filteredFields = fields.filter((field) => {
    const matchesSearch =
      field.detected_label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (field.mapped_value && field.mapped_value.toLowerCase().includes(searchQuery.toLowerCase())) ||
      field.field_id.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (pageFilter !== "all" && (field.page_number || 1) !== pageFilter) return false;

    if (filterType === "mapped") return field.mapped_value !== null && field.mapped_value !== "";
    if (filterType === "unmapped") return field.mapped_value === null || field.mapped_value === "";
    return true;
  });

  const handleStartEdit = (field: BoundingBoxField) => {
    setEditingFieldId(field.field_id);
    setEditValue(field.mapped_value || "");
  };

  const handleSaveEdit = (fieldId: string) => {
    onUpdateMappedValue(fieldId, editValue.trim() === "" ? null : editValue.trim());
    setEditingFieldId(null);
  };

  const handleCancelEdit = () => {
    setEditingFieldId(null);
    setEditValue("");
  };

  const handleCopyValue = (fieldId: string, val: string | null) => {
    if (!val) return;
    navigator.clipboard.writeText(val);
    setCopiedFieldId(fieldId);
    setTimeout(() => setCopiedFieldId(null), 1500);
  };

  const handleFieldClick = (field: BoundingBoxField) => {
    const isSelected = selectedFieldId === field.field_id;
    onSelectField(isSelected ? null : field.field_id);
    // If field is on a different page, auto-jump to that page!
    if (onPageChange && field.page_number && field.page_number !== currentPage) {
      onPageChange(field.page_number);
    }
  };

  return (
    <div
      id="fields-inspector"
      role="region"
      aria-label="Detected Spatial Regions and Field Inspector"
      className="flex flex-col h-full bg-[#0a0a0a] border border-white/10 rounded-sm overflow-hidden shadow-2xl"
    >
      {/* Header & Controls */}
      <div className="p-3.5 bg-[#0f0f0f] border-b border-white/10 space-y-3 font-mono">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-[#00F5FF]" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Detected Spatial Regions ({fields.length})
            </h3>
          </div>
          <span className="text-[10px] text-white/50">
            <span className="text-[#00F5FF] font-bold">{mappedCount}</span> FILLED / <span className="text-[#F27D26] font-bold">{unmappedCount}</span> NULL
          </span>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
          <input
            id="field-search-input"
            type="text"
            aria-label="Search fields by label, ID, or mapped value"
            placeholder="Filter by label, ID, or mapped entity..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full min-h-[40px] bg-black/80 border border-white/15 rounded-sm pl-9 pr-8 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#00F5FF] focus:ring-1 focus:ring-[#00F5FF] transition-all font-mono"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              aria-label="Clear field search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center text-white/40 hover:text-white rounded focus-visible:ring-2 focus-visible:ring-[#00F5FF]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Pills and Page Selector */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div role="group" aria-label="Filter fields by mapping status" className="flex items-center gap-1.5 flex-wrap">
            <button
              id="filter-all-btn"
              onClick={() => setFilterType("all")}
              aria-label={`Show all ${fields.length} fields`}
              aria-pressed={filterType === "all"}
              className={`px-3 min-h-[36px] rounded-sm font-bold uppercase tracking-wider text-[11px] transition-colors focus-visible:ring-2 focus-visible:ring-[#00F5FF] focus-visible:outline-none ${
                filterType === "all"
                  ? "bg-[#00F5FF] text-black shadow-[0_0_10px_rgba(0,245,255,0.4)]"
                  : "bg-black/60 border border-white/15 text-white/70 hover:text-white"
              }`}
            >
              All ({fields.length})
            </button>
            <button
              id="filter-mapped-btn"
              onClick={() => setFilterType("mapped")}
              aria-label={`Show mapped fields only (${mappedCount})`}
              aria-pressed={filterType === "mapped"}
              className={`flex items-center gap-1.5 px-3 min-h-[36px] rounded-sm font-bold uppercase tracking-wider text-[11px] transition-colors focus-visible:ring-2 focus-visible:ring-[#00F5FF] focus-visible:outline-none ${
                filterType === "mapped"
                  ? "bg-[#00F5FF] text-black shadow-[0_0_10px_rgba(0,245,255,0.4)]"
                  : "bg-black/60 border border-white/15 text-white/70 hover:text-white"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Mapped ({mappedCount})
            </button>
            <button
              id="filter-unmapped-btn"
              onClick={() => setFilterType("unmapped")}
              aria-label={`Show null unmapped fields only (${unmappedCount})`}
              aria-pressed={filterType === "unmapped"}
              className={`flex items-center gap-1.5 px-3 min-h-[36px] rounded-sm font-bold uppercase tracking-wider text-[11px] transition-colors focus-visible:ring-2 focus-visible:ring-[#00F5FF] focus-visible:outline-none ${
                filterType === "unmapped"
                  ? "bg-[#F27D26] text-black shadow-[0_0_10px_rgba(242,125,38,0.4)]"
                  : "bg-black/60 border border-white/15 text-white/70 hover:text-white"
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              Null ({unmappedCount})
            </button>
          </div>

          {/* Page scope selector if multi-page */}
          {totalPages > 1 && (
            <div role="group" aria-label="Page filter" className="flex items-center bg-black/80 border border-white/15 rounded-sm p-1 text-[10px] font-mono">
              <button
                onClick={() => setPageFilter("all")}
                aria-label="Show fields across all pages"
                aria-pressed={pageFilter === "all"}
                className={`px-2.5 min-h-[32px] rounded-sm transition-colors focus-visible:ring-2 focus-visible:ring-[#00F5FF] ${
                  pageFilter === "all" ? "bg-white/20 text-white font-bold" : "text-white/40 hover:text-white"
                }`}
              >
                ALL
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPageFilter(p)}
                  aria-label={`Show fields on page ${p}`}
                  aria-pressed={pageFilter === p}
                  className={`px-2.5 min-h-[32px] rounded-sm transition-colors focus-visible:ring-2 focus-visible:ring-[#00F5FF] ${
                    pageFilter === p ? "bg-[#00F5FF] text-black font-bold" : "text-white/40 hover:text-white"
                  }`}
                >
                  P.{p}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Fields List */}
      <div
        role="list"
        aria-label="Detected spatial fields list"
        className="flex-1 overflow-y-auto p-3 space-y-2.5 divide-y divide-white/5 font-mono"
      >
        {filteredFields.length === 0 ? (
          <div className="text-center py-12 text-white/40 font-mono">
            <SlidersHorizontal className="w-8 h-8 mx-auto mb-2 opacity-50 text-[#00F5FF]" />
            <p className="text-xs font-bold uppercase">No matching fields found</p>
            <p className="text-[10px] text-white/30 mt-0.5">Adjust filter or search keyword.</p>
          </div>
        ) : (
          filteredFields.map((field) => {
            const isSelected = selectedFieldId === field.field_id;
            const isHovered = hoveredFieldId === field.field_id;
            const isEditing = editingFieldId === field.field_id;
            const hasValue = field.mapped_value !== null && field.mapped_value !== "";
            const [ymin, xmin, ymax, xmax] = field.box_2d;
            const fieldPage = field.page_number || 1;

            return (
              <div
                key={field.field_id}
                id={`inspector-item-${field.field_id}`}
                role="listitem"
                tabIndex={0}
                aria-label={`Field ${field.detected_label}, page ${fieldPage}, ${hasValue ? `value ${field.mapped_value}` : "null unmapped"}`}
                aria-selected={isSelected}
                onClick={() => handleFieldClick(field)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleFieldClick(field);
                  }
                }}
                onMouseEnter={() => onHoverField(field.field_id)}
                onMouseLeave={() => onHoverField(null)}
                className={`p-3 rounded-sm transition-all cursor-pointer border focus-visible:ring-2 focus-visible:ring-[#00F5FF] focus-visible:outline-none ${
                  isSelected
                    ? "bg-[#00F5FF]/10 border-2 border-[#00F5FF] shadow-[0_0_15px_rgba(0,245,255,0.25)]"
                    : isHovered
                    ? "bg-white/5 border-white/30"
                    : "bg-black/50 border-white/10 hover:border-white/20"
                }`}
              >
                {/* Top row: Label & ID & Confidence */}
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                          hasValue ? "bg-[#00F5FF] shadow-[0_0_6px_#00F5FF]" : "bg-[#F27D26]"
                        }`}
                      />
                      <h4 className="text-xs font-bold text-white truncate uppercase tracking-tight">
                        {field.detected_label}
                      </h4>
                      {/* Page badge */}
                      <span className="px-1.5 py-0.5 bg-white/10 text-white/80 text-[9px] font-bold rounded-sm border border-white/15">
                        PAGE {fieldPage}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-white/40">
                      <span className="text-[#00F5FF]/90 font-semibold">ID: {field.field_id}</span>
                      <span>•</span>
                      <span>
                        box_2d: [{ymin}, {xmin}, {ymax}, {xmax}]
                      </span>
                    </div>
                  </div>

                  {/* Confidence Score Pill */}
                  <div className="flex items-center gap-1 bg-black/90 px-2 py-1 rounded-sm border border-white/15 text-[10px] text-white/90 flex-shrink-0">
                    <span className="text-white/40 uppercase">conf:</span>
                    <span className={field.confidence_score >= 0.9 ? "text-[#00F5FF] font-bold" : "text-[#F27D26]"}>
                      {(field.confidence_score * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>

                {/* Bottom row: Mapped Value or Inline Editor */}
                <div className="mt-2 pt-2 border-t border-white/10">
                  {isEditing ? (
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        aria-label={`Edit value for field ${field.detected_label}`}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        placeholder="Enter value or leave empty for null..."
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveEdit(field.field_id);
                          if (e.key === "Escape") handleCancelEdit();
                        }}
                        className="flex-1 min-h-[38px] bg-black border-2 border-[#00F5FF] rounded-sm px-3 py-1.5 text-xs text-white focus:outline-none font-mono"
                      />
                      <button
                        onClick={() => handleSaveEdit(field.field_id)}
                        aria-label="Save field value"
                        className="w-9 h-9 min-w-[36px] flex items-center justify-center bg-[#00F5FF] hover:bg-[#00F5FF]/90 text-black font-bold rounded-sm transition-colors focus-visible:ring-2 focus-visible:ring-white"
                        title="Save changes"
                      >
                        <Check className="w-4 h-4 stroke-[2.5]" />
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        aria-label="Cancel editing"
                        className="w-9 h-9 min-w-[36px] flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-sm transition-colors focus-visible:ring-2 focus-visible:ring-white"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between group/val min-h-[32px]">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[10px] text-white/40 uppercase">mapped_value:</span>
                        {hasValue ? (
                          <span className="text-xs font-bold text-[#00F5FF] bg-[#00F5FF]/10 px-2.5 py-1 rounded-sm border border-[#00F5FF]/30 truncate max-w-[200px]">
                            {field.mapped_value}
                          </span>
                        ) : (
                          <span className="text-xs text-[#F27D26] italic bg-[#F27D26]/10 px-2.5 py-1 rounded-sm border border-[#F27D26]/30">
                            null
                          </span>
                        )}
                      </div>

                      {/* Actions with accessible touch targets */}
                      <div className="flex items-center gap-1.5 opacity-80 group-hover/val:opacity-100 transition-opacity">
                        {hasValue && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyValue(field.field_id, field.mapped_value);
                            }}
                            aria-label={`Copy value for field ${field.detected_label}`}
                            title="Copy value"
                            className="w-8 h-8 flex items-center justify-center hover:bg-white/10 text-white/70 hover:text-white rounded-sm transition-colors focus-visible:ring-2 focus-visible:ring-[#00F5FF]"
                          >
                            {copiedFieldId === field.field_id ? (
                              <CheckCheck className="w-4 h-4 text-[#00F5FF]" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEdit(field);
                          }}
                          aria-label={`Edit value for field ${field.detected_label}`}
                          title="Edit mapped value"
                          className="w-8 h-8 flex items-center justify-center hover:bg-white/10 text-white/70 hover:text-[#00F5FF] rounded-sm transition-colors focus-visible:ring-2 focus-visible:ring-[#00F5FF]"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

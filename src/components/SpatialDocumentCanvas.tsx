import React, { useState, useRef, useEffect, useCallback } from "react";
import { BoundingBoxField } from "../types";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Tag,
  CheckCircle2,
  AlertCircle,
  Layers,
  Type as TypeIcon,
  Move,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Check,
  X,
  Maximize2,
  GripHorizontal,
  PlusCircle,
  Trash2,
  Crosshair,
  Sparkles,
  Palette,
  Minus,
  Plus,
  Sliders,
} from "lucide-react";

interface SpatialDocumentCanvasProps {
  documentImageUrl: string;
  documentName: string;
  fields: BoundingBoxField[];
  selectedFieldId: string | null;
  hoveredFieldId: string | null;
  onSelectField: (fieldId: string | null) => void;
  onHoverField: (fieldId: string | null) => void;
  onUpdateFieldBox?: (fieldId: string, newBox: [number, number, number, number]) => void;
  onUpdateMappedValue?: (fieldId: string, newValue: string | null) => void;
  onUpdateFieldStyle?: (
    fieldId: string | null,
    style: { font_size?: number; font_color?: string },
    applyToAll?: boolean
  ) => void;
  onAddField?: (newField: BoundingBoxField) => void;
  onDeleteField?: (fieldId: string) => void;
  isEditMode: boolean;
  onToggleEditMode: () => void;
  showLabels: boolean;
  setShowLabels: (v: boolean) => void;
  showBoxes: boolean;
  setShowBoxes: (v: boolean) => void;
  showBurnInValues: boolean;
  setShowBurnInValues: (v: boolean) => void;
  showConfidence: boolean;
  setShowConfidence: (v: boolean) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  onFileDrop?: (file: File) => void;
  defaultFontSize?: number;
  defaultFontColor?: string;
}

interface DraggingState {
  fieldId: string;
  mode: "move" | "resize";
  startPointerX: number;
  startPointerY: number;
  initialBox: [number, number, number, number];
}

interface DrawingState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

const PRESET_COLORS = [
  { name: "Blue Ink", hex: "#1e3a8a" },
  { name: "Black", hex: "#000000" },
  { name: "Charcoal", hex: "#374151" },
  { name: "Cyan", hex: "#00F5FF" },
  { name: "Crimson", hex: "#dc2626" },
  { name: "Emerald", hex: "#16a34a" },
  { name: "Purple", hex: "#7c3aed" },
];

const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24];

export const SpatialDocumentCanvas: React.FC<SpatialDocumentCanvasProps> = ({
  documentImageUrl,
  documentName,
  fields,
  selectedFieldId,
  hoveredFieldId,
  onSelectField,
  onHoverField,
  onUpdateFieldBox,
  onUpdateMappedValue,
  onUpdateFieldStyle,
  onAddField,
  onDeleteField,
  isEditMode,
  onToggleEditMode,
  showLabels,
  setShowLabels,
  showBoxes,
  setShowBoxes,
  showBurnInValues,
  setShowBurnInValues,
  showConfidence,
  setShowConfidence,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  onFileDrop,
  defaultFontSize = 11,
  defaultFontColor = "#1e3a8a",
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [startPan, setStartPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isCanvasDragOver, setIsCanvasDragOver] = useState<boolean>(false);

  // Manual box addition / drawing mode state
  const [isDrawingMode, setIsDrawingMode] = useState<boolean>(false);
  const [drawingState, setDrawingState] = useState<DrawingState | null>(null);

  // Dragging / Resizing state for bounding box overlays
  const [dragState, setDragState] = useState<DraggingState | null>(null);

  // Multi-touch tracking for pinch-to-zoom & touch gestures
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const initialPinchDistanceRef = useRef<number | null>(null);
  const initialPinchZoomRef = useRef<number>(1);

  // Active field style lookup
  const activeField = fields.find((f) => f.field_id === selectedFieldId);
  const currentFieldFontSize = activeField?.font_size || defaultFontSize;
  const currentFieldFontColor = activeField?.font_color || defaultFontColor;

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const isAutoFittingRef = useRef<boolean>(false);

  // Auto-fit helper: accurately scales and centers the entire uploaded PDF page/image within the preview frame without clipping
  const autoFitPage = useCallback((mode: "contain" | "width" | "height" = "contain") => {
    if (!containerRef.current || !imageRef.current) return;
    const container = containerRef.current;
    const img = imageRef.current;

    const naturalWidth = img.naturalWidth || 850;
    const naturalHeight = img.naturalHeight || 1100;

    // Available inner viewport accounting for padding
    const paddingX = 24;
    const paddingY = 24;
    const availableWidth = Math.max(120, container.clientWidth - paddingX);
    const availableHeight = Math.max(120, container.clientHeight - paddingY);

    const scaleW = availableWidth / naturalWidth;
    const scaleH = availableHeight / naturalHeight;

    let targetZoom = 1;
    if (mode === "width") {
      targetZoom = Math.min(3.5, Math.max(0.15, scaleW));
    } else if (mode === "height") {
      targetZoom = Math.min(3.5, Math.max(0.15, scaleH));
    } else {
      // Contain: render the entire page centered within preview frame (100% fit, no overflow clipping)
      targetZoom = Math.min(3.5, Math.max(0.15, Math.min(scaleW, scaleH)));
    }

    setZoom(Number(targetZoom.toFixed(3)));
    setPan({ x: 0, y: 0 });
  }, []);

  // When image loads or document changes, auto-fit to container frame perfectly
  useEffect(() => {
    if (documentImageUrl) {
      const timer = setTimeout(() => {
        autoFitPage("contain");
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [documentImageUrl, currentPage, autoFitPage]);

  // ResizeObserver: dynamically maintain auto-fit scaling on window/container resize
  useEffect(() => {
    if (!containerRef.current) return;
    let animationFrameId: number;

    const observer = new ResizeObserver(() => {
      // Avoid calling during active pan, drag, or draw
      if (isPanning || dragState || drawingState || isAutoFittingRef.current) return;

      cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(() => {
        autoFitPage("contain");
      });
    });

    observer.observe(containerRef.current);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(animationFrameId);
    };
  }, [autoFitPage, isPanning, dragState, drawingState]);

  const handleZoomIn = () => setZoom((prev) => Math.min(3.5, Number((prev + 0.15).toFixed(2))));
  const handleZoomOut = () => setZoom((prev) => Math.max(0.2, Number((prev - 0.15).toFixed(2))));

  // Text formatting controls handlers
  const handleFontSizeChange = (newSize: number) => {
    if (onUpdateFieldStyle) {
      onUpdateFieldStyle(selectedFieldId, { font_size: newSize });
    }
  };

  const handleStepFontSize = (delta: number) => {
    const current = currentFieldFontSize;
    const next = Math.max(7, Math.min(32, current + delta));
    handleFontSizeChange(next);
  };

  const handleFontColorChange = (newColor: string) => {
    if (onUpdateFieldStyle) {
      onUpdateFieldStyle(selectedFieldId, { font_color: newColor });
    }
  };

  const handleApplyStyleToAll = () => {
    if (onUpdateFieldStyle) {
      onUpdateFieldStyle(
        null,
        { font_size: currentFieldFontSize, font_color: currentFieldFontColor },
        true
      );
    }
  };

  // Cross-Platform Pointer Events Handler for Canvas Pan & Drawing
  const handleCanvasPointerDown = (e: React.PointerEvent) => {
    // Register active pointer
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Handle multi-touch pinch to zoom (2 fingers)
    if (activePointersRef.current.size === 2) {
      const pointers: { x: number; y: number }[] = Array.from(activePointersRef.current.values());
      const dist = Math.hypot(pointers[0].x - pointers[1].x, pointers[0].y - pointers[1].y);
      initialPinchDistanceRef.current = dist;
      initialPinchZoomRef.current = zoom;
      setIsPanning(false);
      return;
    }

    if (isDrawingMode) {
      // Start drawing a new bounding box on the document
      if (imageRef.current) {
        const imgRect = imageRef.current.getBoundingClientRect();
        const startX = Math.max(0, Math.min(imgRect.width, e.clientX - imgRect.left));
        const startY = Math.max(0, Math.min(imgRect.height, e.clientY - imgRect.top));
        setDrawingState({
          startX,
          startY,
          currentX: startX,
          currentY: startY,
        });
      }
      return;
    }

    const target = e.target as HTMLElement;
    if (
      e.button === 0 &&
      (target === containerRef.current ||
        target.tagName === "IMG" ||
        target.id === "spatial-grid-bg" ||
        target.id === "document-canvas-wrapper" ||
        target.id === "spatial-coordinate-overlay")
    ) {
      setIsPanning(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  // Canvas Drag & Drop handlers for file drop
  const handleCanvasDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsCanvasDragOver(true);
  };

  const handleCanvasDragLeave = () => {
    setIsCanvasDragOver(false);
  };

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsCanvasDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && onFileDrop) {
      onFileDrop(file);
    }
  };

  // Global pointer move for panning, dragging/resizing, pinch-zoom, or drawing new box
  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      // Update pointer location
      if (activePointersRef.current.has(e.pointerId)) {
        activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      }

      // Handle 2-finger pinch to zoom on touch screens
      if (activePointersRef.current.size === 2 && initialPinchDistanceRef.current !== null) {
        const pointers: { x: number; y: number }[] = Array.from(activePointersRef.current.values());
        const currentDist = Math.hypot(pointers[0].x - pointers[1].x, pointers[0].y - pointers[1].y);
        const scale = currentDist / initialPinchDistanceRef.current;
        const newZoom = Math.min(3.5, Math.max(0.2, initialPinchZoomRef.current * scale));
        setZoom(Number(newZoom.toFixed(2)));
        return;
      }

      if (drawingState && imageRef.current) {
        const imgRect = imageRef.current.getBoundingClientRect();
        const currentX = Math.max(0, Math.min(imgRect.width, e.clientX - imgRect.left));
        const currentY = Math.max(0, Math.min(imgRect.height, e.clientY - imgRect.top));
        setDrawingState((prev) => (prev ? { ...prev, currentX, currentY } : null));
      } else if (isPanning) {
        setPan({
          x: e.clientX - startPan.x,
          y: e.clientY - startPan.y,
        });
      } else if (dragState && imageRef.current && onUpdateFieldBox) {
        const imgRect = imageRef.current.getBoundingClientRect();
        if (imgRect.width === 0 || imgRect.height === 0) return;

        const displayedWidth = imgRect.width;
        const displayedHeight = imgRect.height;

        // Accurate normalized coordinate conversion relative to rendered document dimensions
        const deltaNormX = ((e.clientX - dragState.startPointerX) / displayedWidth) * 1000;
        const deltaNormY = ((e.clientY - dragState.startPointerY) / displayedHeight) * 1000;

        const [initYmin, initXmin, initYmax, initXmax] = dragState.initialBox;
        const boxWidth = initXmax - initXmin;
        const boxHeight = initYmax - initYmin;

        if (dragState.mode === "move") {
          let newXmin = Math.round(initXmin + deltaNormX);
          let newYmin = Math.round(initYmin + deltaNormY);

          newXmin = Math.max(0, Math.min(1000 - boxWidth, newXmin));
          newYmin = Math.max(0, Math.min(1000 - boxHeight, newYmin));
          const newXmax = Math.min(1000, newXmin + boxWidth);
          const newYmax = Math.min(1000, newYmin + boxHeight);

          onUpdateFieldBox(dragState.fieldId, [newYmin, newXmin, newYmax, newXmax]);
        } else if (dragState.mode === "resize") {
          let newXmax = Math.round(initXmax + deltaNormX);
          let newYmax = Math.round(initYmax + deltaNormY);

          newXmax = Math.max(initXmin + 15, Math.min(1000, newXmax));
          newYmax = Math.max(initYmin + 15, Math.min(1000, newYmax));

          onUpdateFieldBox(dragState.fieldId, [initYmin, initXmin, newYmax, newXmax]);
        }
      }
    },
    [isPanning, startPan, dragState, drawingState, onUpdateFieldBox]
  );

  const handlePointerUp = useCallback(
    (e: PointerEvent) => {
      activePointersRef.current.delete(e.pointerId);
      if (activePointersRef.current.size < 2) {
        initialPinchDistanceRef.current = null;
      }

      if (drawingState && imageRef.current && onAddField) {
        const imgRect = imageRef.current.getBoundingClientRect();
        const width = imgRect.width;
        const height = imgRect.height;

        if (width > 0 && height > 0) {
          const rawX1 = Math.min(drawingState.startX, drawingState.currentX);
          const rawX2 = Math.max(drawingState.startX, drawingState.currentX);
          const rawY1 = Math.min(drawingState.startY, drawingState.currentY);
          const rawY2 = Math.max(drawingState.startY, drawingState.currentY);

          const normXmin = Math.round((rawX1 / width) * 1000);
          const normXmax = Math.round((rawX2 / width) * 1000);
          const normYmin = Math.round((rawY1 / height) * 1000);
          const normYmax = Math.round((rawY2 / height) * 1000);

          // Only create box if user actually dragged a reasonable size (at least 15x15 units)
          if (normXmax - normXmin >= 15 && normYmax - normYmin >= 12) {
            const customId = `custom_${Date.now().toString(36)}`;
            const newField: BoundingBoxField = {
              field_id: customId,
              detected_label: `Field ${fields.length + 1}`,
              box_2d: [normYmin, normXmin, normYmax, normXmax],
              mapped_value: "",
              confidence_score: 1.0,
              page_number: currentPage,
              field_type: "text",
              font_size: currentFieldFontSize,
              font_color: currentFieldFontColor,
            };

            onAddField(newField);
            onSelectField(customId);
          }
        }
        setDrawingState(null);
        setIsDrawingMode(false);
      }

      setIsPanning(false);
      setDragState(null);
    },
    [
      drawingState,
      onAddField,
      fields.length,
      currentPage,
      onSelectField,
      currentFieldFontSize,
      currentFieldFontColor,
    ]
  );

  useEffect(() => {
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      setZoom((prev) => Math.min(3.5, Math.max(0.2, Number((prev * zoomFactor).toFixed(2)))));
    }
  };

  const handleBoxPointerDown = (
    e: React.PointerEvent,
    field: BoundingBoxField,
    mode: "move" | "resize" = "move"
  ) => {
    e.stopPropagation();
    onSelectField(field.field_id);

    // Only allow drag reposition/resize if in Edit Mode
    if (isEditMode) {
      setDragState({
        fieldId: field.field_id,
        mode,
        startPointerX: e.clientX,
        startPointerY: e.clientY,
        initialBox: [...field.box_2d],
      });
    }
  };

  const handleDeleteBox = (fieldId: string, e: React.MouseEvent | React.PointerEvent) => {
    e.stopPropagation();
    if (onDeleteField) {
      onDeleteField(fieldId);
    }
  };

  const pageFields = fields.filter((f) => (f.page_number || 1) === currentPage);
  const totalPageFields = pageFields.length;
  const mappedPageFields = pageFields.filter(
    (f) => f.mapped_value !== null && f.mapped_value !== ""
  ).length;
  const unmappedPageFields = totalPageFields - mappedPageFields;

  return (
    <div
      id="spatial-canvas-container"
      className={`relative flex flex-col h-full w-full bg-[#070707] rounded-sm overflow-hidden border shadow-2xl select-none transition-colors ${
        isEditMode ? "border-[#00F5FF]/50 ring-1 ring-[#00F5FF]/30" : "border-white/10"
      }`}
    >
      {/* Top Canvas Toolbar with Navigation, Edit Mode Actions, Text Formatting Tools, Layer Toggles, and Zoom */}
      <div
        role="toolbar"
        aria-label="Spatial Document Canvas Controls"
        className="flex flex-wrap items-center justify-between px-3 py-2 bg-[#090909]/95 border-b border-white/10 backdrop-blur z-20 gap-2.5"
      >
        {/* Left Section: Source info & Multi-Page Navigation & Edit Form Toggle */}
        <div className="flex items-center flex-wrap gap-2">
          <div className="bg-black/90 px-3 py-2 min-h-[44px] border border-[#00F5FF]/30 backdrop-blur-md rounded-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00F5FF] animate-pulse flex-shrink-0" />
            <span className="text-xs font-mono text-[#00F5FF] font-bold uppercase tracking-wider truncate max-w-[130px] sm:max-w-[200px]">
              {documentName}
            </span>
          </div>

          {/* Multi-Page Navigation Controls with 44px min touch targets */}
          <div
            role="group"
            aria-label="Document Page Navigation"
            className="flex items-center bg-black/90 border border-white/15 rounded-sm p-0.5 shadow-inner"
          >
            <button
              id="prev-page-btn"
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              aria-label={currentPage <= 1 ? "First Page Reached" : `Go to Previous Page (Page ${currentPage - 1})`}
              title={currentPage <= 1 ? "First Page" : `Go to Page ${currentPage - 1}`}
              className={`flex items-center justify-center gap-1.5 px-3 min-h-[44px] text-xs font-mono rounded-sm transition-all focus-visible:ring-2 focus-visible:ring-[#00F5FF] focus-visible:outline-none ${
                currentPage <= 1
                  ? "text-white/20 cursor-not-allowed bg-transparent"
                  : "text-[#00F5FF] hover:bg-[#00F5FF]/20 hover:text-white cursor-pointer active:scale-95"
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="text-xs font-bold uppercase hidden sm:inline">Prev</span>
            </button>

            <div
              id="page-indicator-badge"
              aria-current="page"
              className="px-3 min-h-[44px] text-xs font-mono font-bold text-white bg-white/5 border-x border-white/10 tracking-widest uppercase flex items-center justify-center gap-1.5"
            >
              <span className="text-[#00F5FF]">P.{currentPage}</span>
              <span className="text-white/40">/</span>
              <span>{Math.max(1, totalPages)}</span>
            </div>

            <button
              id="next-page-btn"
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
              aria-label={currentPage >= totalPages ? "Last Page Reached" : `Go to Next Page (Page ${currentPage + 1})`}
              title={currentPage >= totalPages ? "Last Page" : `Go to Page ${currentPage + 1}`}
              className={`flex items-center justify-center gap-1.5 px-3 min-h-[44px] text-xs font-mono rounded-sm transition-all focus-visible:ring-2 focus-visible:ring-[#00F5FF] focus-visible:outline-none ${
                currentPage >= totalPages
                  ? "text-white/20 cursor-not-allowed bg-transparent"
                  : "text-[#00F5FF] hover:bg-[#00F5FF]/20 hover:text-white cursor-pointer active:scale-95"
              }`}
            >
              <span className="text-xs font-bold uppercase hidden sm:inline">Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Canvas Edit Mode Toggle Button - 44px min height touch target */}
          <button
            id="canvas-toggle-edit-mode-btn"
            onClick={onToggleEditMode}
            aria-label={isEditMode ? "Done Editing (Lock Form Fields)" : "Edit Form (Unlock In-Place Textboxes & Boundaries)"}
            aria-pressed={isEditMode}
            className={`flex items-center gap-2 px-4 min-h-[44px] rounded-sm text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer border focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#00F5FF] focus-visible:outline-none active:scale-95 ${
              isEditMode
                ? "bg-emerald-500 hover:bg-emerald-400 text-black border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                : "bg-[#00F5FF]/10 hover:bg-[#00F5FF]/20 text-[#00F5FF] border-[#00F5FF]/40 hover:border-[#00F5FF]"
            }`}
            title={isEditMode ? "Lock Form & Finish Editing" : "Unlock Interactive Dragging, Typing & Styling"}
          >
            {isEditMode ? (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Done Editing</span>
              </>
            ) : (
              <>
                <Edit2 className="w-4 h-4 text-[#00F5FF]" />
                <span>Edit Form</span>
              </>
            )}
          </button>

          {/* If in Edit Mode, show "+ Add Field (Draw Box)" Button with 44px touch target */}
          {isEditMode && (
            <button
              id="draw-new-box-btn"
              onClick={() => setIsDrawingMode(!isDrawingMode)}
              aria-label={isDrawingMode ? "Drawing Active: Click and drag on canvas" : "Add custom bounding box field"}
              aria-pressed={isDrawingMode}
              className={`flex items-center gap-1.5 px-3.5 min-h-[44px] rounded-sm text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer border focus-visible:ring-2 focus-visible:ring-[#00F5FF] focus-visible:outline-none active:scale-95 ${
                isDrawingMode
                  ? "bg-[#00F5FF] text-black border-[#00F5FF] shadow-[0_0_12px_rgba(0,245,255,0.5)] animate-pulse"
                  : "bg-black/80 text-white/80 hover:text-white border-white/20 hover:border-[#00F5FF]/50"
              }`}
              title="Click and drag on the document to draw a new bounding box"
            >
              <Crosshair className="w-4 h-4 text-[#00F5FF]" />
              <span>{isDrawingMode ? "Drawing Active..." : "+ Add Field"}</span>
            </button>
          )}
        </div>

        {/* Right Section: Layer Toggles & Fit/Zoom Controls */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Layer toggles with 44px min height touch target */}
          <div
            role="group"
            aria-label="Layer Visibility Toggles"
            className="flex items-center bg-black/80 border border-white/15 rounded-sm p-0.5 text-xs font-mono"
          >
            <button
              id="toggle-boxes-btn"
              onClick={() => setShowBoxes(!showBoxes)}
              aria-label="Toggle Bounding Boxes Layer"
              aria-pressed={showBoxes}
              title="Toggle Bounding Boxes"
              className={`flex items-center justify-center gap-1.5 px-3 min-h-[44px] rounded-sm transition-colors focus-visible:ring-2 focus-visible:ring-[#00F5FF] focus-visible:outline-none ${
                showBoxes ? "bg-[#00F5FF] text-black font-bold" : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden md:inline text-xs">Boxes</span>
            </button>
            <button
              id="toggle-labels-btn"
              onClick={() => setShowLabels(!showLabels)}
              aria-label="Toggle Field Labels Layer"
              aria-pressed={showLabels}
              title="Toggle Field Labels"
              className={`flex items-center justify-center gap-1.5 px-3 min-h-[44px] rounded-sm transition-colors focus-visible:ring-2 focus-visible:ring-[#00F5FF] focus-visible:outline-none ${
                showLabels ? "bg-[#00F5FF] text-black font-bold" : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span className="hidden md:inline text-xs">Labels</span>
            </button>
            <button
              id="toggle-burn-in-btn"
              onClick={() => setShowBurnInValues(!showBurnInValues)}
              aria-label="Toggle Mapped Values Burn-In Layer"
              aria-pressed={showBurnInValues}
              title="Simulate Filled Values in Bounding Boxes"
              className={`flex items-center justify-center gap-1.5 px-3 min-h-[44px] rounded-sm transition-colors focus-visible:ring-2 focus-visible:ring-[#00F5FF] focus-visible:outline-none ${
                showBurnInValues ? "bg-[#00F5FF] text-black font-bold" : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <TypeIcon className="w-3.5 h-3.5" />
              <span className="hidden md:inline text-xs">Values</span>
            </button>
            <button
              id="toggle-confidence-btn"
              onClick={() => setShowConfidence(!showConfidence)}
              aria-label="Toggle Confidence Scores Layer"
              aria-pressed={showConfidence}
              title="Toggle Confidence Scores"
              className={`flex items-center justify-center gap-1 px-3 min-h-[44px] rounded-sm transition-colors focus-visible:ring-2 focus-visible:ring-[#00F5FF] focus-visible:outline-none ${
                showConfidence ? "bg-[#00F5FF] text-black font-bold" : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <span className="text-xs font-bold">%</span>
              <span className="hidden md:inline text-xs">Scores</span>
            </button>
          </div>

          {/* Quick Fit View Controls (Fit Page, Fit Width) */}
          <div
            role="group"
            aria-label="Canvas Framing Options"
            className="flex items-center bg-black/80 border border-white/15 rounded-sm p-0.5 text-xs font-mono"
          >
            <button
              id="fit-page-btn"
              onClick={() => autoFitPage("contain")}
              aria-label="Fit entire document page 100% inside preview workspace"
              title="Fit Entire Page 100% in Preview Frame"
              className="px-3 min-h-[44px] text-white/80 hover:text-[#00F5FF] hover:bg-white/5 rounded-sm transition-colors font-bold flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[#00F5FF] focus-visible:outline-none"
            >
              <Maximize2 className="w-3.5 h-3.5 text-[#00F5FF]" />
              <span>Fit Page</span>
            </button>
            <button
              id="fit-width-btn"
              onClick={() => autoFitPage("width")}
              aria-label="Fit document page to container width"
              title="Fit to Container Width"
              className="hidden sm:flex items-center justify-center px-3 min-h-[44px] text-white/60 hover:text-white hover:bg-white/5 rounded-sm transition-colors focus-visible:ring-2 focus-visible:ring-[#00F5FF] focus-visible:outline-none"
            >
              Width
            </button>
          </div>

          {/* Zoom Actions - 44px touch targets */}
          <div
            role="group"
            aria-label="Canvas Zoom Controls"
            className="flex items-center bg-black/80 border border-white/15 rounded-sm p-0.5"
          >
            <button
              id="zoom-out-btn"
              onClick={handleZoomOut}
              aria-label="Zoom Out Canvas View"
              title="Zoom Out"
              className="w-11 h-11 min-h-[44px] min-w-[44px] flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded-sm transition-colors focus-visible:ring-2 focus-visible:ring-[#00F5FF] focus-visible:outline-none active:scale-95"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span
              aria-live="polite"
              className="px-2 text-xs font-mono font-bold text-[#00F5FF] min-w-[44px] text-center"
            >
              {Math.round(zoom * 100)}%
            </span>
            <button
              id="zoom-in-btn"
              onClick={handleZoomIn}
              aria-label="Zoom In Canvas View"
              title="Zoom In"
              className="w-11 h-11 min-h-[44px] min-w-[44px] flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded-sm transition-colors focus-visible:ring-2 focus-visible:ring-[#00F5FF] focus-visible:outline-none active:scale-95"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              id="reset-zoom-btn"
              onClick={() => autoFitPage("contain")}
              aria-label="Reset Zoom and Center Document"
              title="Reset to Fit View"
              className="w-11 h-11 min-h-[44px] min-w-[44px] flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded-sm transition-colors focus-visible:ring-2 focus-visible:ring-[#00F5FF] focus-visible:outline-none active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* TEXT FORMATTING TOOLBAR & EDIT MODE CONTROLS */}
      <div
        id="text-formatting-toolbar"
        role="toolbar"
        aria-label="Text Formatting and Styling Tools"
        className={`flex flex-wrap items-center justify-between px-3 py-2 border-b text-xs font-mono transition-colors z-20 gap-2.5 ${
          isEditMode
            ? "bg-[#0d1f18] border-emerald-500/40 text-emerald-200"
            : "bg-[#0c0c0c] border-white/10 text-white/70"
        }`}
      >
        {/* Left Section: Target Field & Text Size (pt selector/stepper) */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Target indicator badge */}
          <div className="flex items-center gap-2 min-h-[44px]">
            <Sliders className="w-4 h-4 text-[#00F5FF] flex-shrink-0" />
            <span className="text-xs uppercase font-bold tracking-wider text-white/60">
              Styling:
            </span>
            <span
              className={`px-2 py-1 rounded-sm text-xs font-bold ${
                selectedFieldId
                  ? "bg-[#00F5FF] text-black shadow-[0_0_8px_rgba(0,245,255,0.4)]"
                  : "bg-white/10 text-white/80"
              }`}
            >
              {selectedFieldId ? `Field: ${selectedFieldId}` : "All Fields (Default)"}
            </span>
          </div>

          {/* Text Size (pt selector & stepper) with 44px min height */}
          <div
            role="group"
            aria-label="Font Size Stepper and Selector"
            className="flex items-center bg-black/90 border border-white/20 rounded-sm p-0.5"
          >
            <span className="px-2 text-xs uppercase font-bold text-white/50 flex items-center gap-1">
              <TypeIcon className="w-3.5 h-3.5 text-[#00F5FF]" />
              Size
            </span>
            <button
              id="font-size-dec-btn"
              onClick={() => handleStepFontSize(-1)}
              aria-label="Decrease font size by 1 point"
              title="Decrease Font Size (-1 pt)"
              className="w-11 h-11 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-white/10 text-white/80 hover:text-white rounded-sm transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[#00F5FF] focus-visible:outline-none"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>

            {/* Dropdown pt selector */}
            <select
              id="font-size-select"
              aria-label="Select font size in points"
              value={currentFieldFontSize}
              onChange={(e) => handleFontSizeChange(Number(e.target.value))}
              className="bg-black text-[#00F5FF] font-bold text-xs px-2 min-h-[44px] rounded-none focus:outline-none cursor-pointer border-x border-white/15 text-center focus-visible:ring-2 focus-visible:ring-[#00F5FF]"
            >
              {FONT_SIZES.map((size) => (
                <option key={size} value={size} className="bg-[#111] text-white">
                  {size} pt
                </option>
              ))}
            </select>

            <button
              id="font-size-inc-btn"
              onClick={() => handleStepFontSize(1)}
              aria-label="Increase font size by 1 point"
              title="Increase Font Size (+1 pt)"
              className="w-11 h-11 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-white/10 text-white/80 hover:text-white rounded-sm transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[#00F5FF] focus-visible:outline-none"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Text Color (Color Picker & Quick Swatches) */}
          <div
            role="group"
            aria-label="Font Color Controls"
            className="flex items-center bg-black/90 border border-white/20 rounded-sm p-0.5 gap-1.5"
          >
            <span className="px-2 text-xs uppercase font-bold text-white/50 flex items-center gap-1">
              <Palette className="w-3.5 h-3.5 text-[#00F5FF]" />
              Color
            </span>

            {/* Preset Color Swatches */}
            <div className="flex items-center gap-1.5 px-1 min-h-[44px]">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c.hex}
                  onClick={() => handleFontColorChange(c.hex)}
                  aria-label={`Select color ${c.name} (${c.hex})`}
                  title={`${c.name} (${c.hex})`}
                  style={{ backgroundColor: c.hex }}
                  className={`w-7 h-7 min-w-[28px] min-h-[28px] rounded-full border transition-transform cursor-pointer focus-visible:ring-2 focus-visible:ring-[#00F5FF] focus-visible:outline-none ${
                    currentFieldFontColor.toLowerCase() === c.hex.toLowerCase()
                      ? "border-white ring-2 ring-[#00F5FF] scale-110 shadow-[0_0_8px_#00F5FF]"
                      : "border-white/20 hover:scale-105"
                  }`}
                />
              ))}
            </div>

            {/* Native Color Picker input & hex display */}
            <label
              title="Choose custom text color"
              className="flex items-center gap-1.5 px-3 min-h-[44px] bg-white/5 hover:bg-white/10 rounded-sm cursor-pointer border-l border-white/15"
            >
              <input
                type="color"
                aria-label="Custom color picker input"
                value={
                  currentFieldFontColor.startsWith("#") && currentFieldFontColor.length === 7
                    ? currentFieldFontColor
                    : "#1e3a8a"
                }
                onChange={(e) => handleFontColorChange(e.target.value)}
                className="w-5 h-5 p-0 bg-transparent border-0 cursor-pointer rounded-full"
              />
              <span className="text-xs font-mono font-bold text-white/90 uppercase">
                {currentFieldFontColor}
              </span>
            </label>
          </div>

          {/* Apply to All Fields Button */}
          <button
            id="apply-style-all-btn"
            onClick={handleApplyStyleToAll}
            aria-label="Apply currently selected font size and color to all fields on the document"
            title="Apply currently selected font size and color to all fields on the document"
            className="flex items-center justify-center gap-1.5 px-3.5 min-h-[44px] bg-black/80 hover:bg-white/10 text-white/90 hover:text-white border border-white/20 hover:border-[#00F5FF]/50 rounded-sm text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[#00F5FF] focus-visible:outline-none active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#00F5FF]" />
            <span>Apply to All</span>
          </button>
        </div>

        {/* Right Section: Edit Mode guidance or lock */}
        <div className="flex items-center gap-2">
          {isEditMode ? (
            <span className="text-xs text-emerald-300 font-bold hidden md:inline">
              ✨ Type directly in field boxes or drag/resize borders
            </span>
          ) : (
            <span className="text-xs text-white/40 hidden md:inline">
              Coordinates Locked • Click "Edit Form" to type in-place
            </span>
          )}
        </div>
      </div>

      {/* Main Viewport Container: Auto-Fit Display Area fitting container frame 100% perfectly */}
      <div
        ref={containerRef}
        onPointerDown={handleCanvasPointerDown}
        onWheel={handleWheel}
        onDragOver={handleCanvasDragOver}
        onDragLeave={handleCanvasDragLeave}
        onDrop={handleCanvasDrop}
        className={`relative flex-1 w-full h-full min-h-[480px] overflow-hidden bg-[#050505] flex items-center justify-center p-3 touch-none ${
          isDrawingMode
            ? "cursor-crosshair"
            : isPanning
            ? "cursor-grabbing"
            : isEditMode
            ? "cursor-default"
            : "cursor-grab"
        }`}
      >
        {/* Spatial Grid Background */}
        <div
          id="spatial-grid-bg"
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, #00F5FF 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />

        {/* Drag over upload indicator */}
        {isCanvasDragOver && (
          <div className="absolute inset-0 bg-[#00F5FF]/15 border-2 border-dashed border-[#00F5FF] z-50 flex flex-col items-center justify-center pointer-events-none backdrop-blur-xs animate-in fade-in duration-100 font-mono">
            <div className="bg-black/90 p-4 rounded-sm border border-[#00F5FF] text-center shadow-2xl">
              <span className="text-sm font-bold text-[#00F5FF] uppercase tracking-wider block mb-1">
                Drop Document Here
              </span>
              <span className="text-xs text-white/60">
                100% Full Page Layout & Coordinate Mapping
              </span>
            </div>
          </div>
        )}

        {documentImageUrl ? (
          <div
            id="document-canvas-wrapper"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "center center",
              transition: isPanning || dragState || drawingState ? "none" : "transform 0.12s ease-out",
            }}
            className="relative shadow-[0_0_35px_rgba(0,0,0,0.8)] rounded-sm bg-white inline-block transition-transform select-none max-w-full max-h-full touch-none"
          >
            {/* Auto-Fit Display Area: Base Document Image rendered centered (max-w: 100%, max-h: 100%, object-fit: contain) */}
            <img
              ref={imageRef}
              src={documentImageUrl}
              alt={`Document Page ${currentPage}`}
              onLoad={() => autoFitPage("contain")}
              className="block max-w-full max-h-full object-contain pointer-events-none rounded-sm select-none shadow-2xl"
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
                display: "block",
              }}
              referrerPolicy="no-referrer"
            />

            {/* Responsive Bounding Box Alignment: Coordinate overlay layer scaled dynamically alongside the document image */}
            {showBoxes && (
              <div
                ref={overlayRef}
                id="spatial-coordinate-overlay"
                className="absolute inset-0 w-full h-full pointer-events-auto touch-none"
                style={{ width: "100%", height: "100%" }}
              >
                {pageFields.map((field) => {
                  const [ymin, xmin, ymax, xmax] = field.box_2d;
                  const isSelected = selectedFieldId === field.field_id;
                  const isHovered = hoveredFieldId === field.field_id;
                  const isBeingDragged = dragState?.fieldId === field.field_id;
                  const hasValue = field.mapped_value !== null && field.mapped_value !== "";

                  const fieldSize = field.font_size || defaultFontSize;
                  const fieldColor = field.font_color || defaultFontColor;

                  // High legibility & contrast border styling
                  // Requirement: "Apply a thin, high-contrast border outline (e.g., 1px solid #0066FF) around each transparent box"
                  let borderStyle = "border border-[#0066FF]/70 shadow-[0_0_4px_rgba(0,102,255,0.25)]";
                  let bgStyle = "bg-transparent";
                  let tagBg = "bg-[#0066FF] text-white font-bold";

                  if (isEditMode) {
                    borderStyle = "border border-[#0066FF] shadow-[0_0_6px_rgba(0,102,255,0.4)]";
                    bgStyle = "bg-transparent";
                    tagBg = "bg-[#0066FF] text-white font-bold";
                  }

                  if (isSelected || isBeingDragged) {
                    borderStyle =
                      "border-2 border-[#00F5FF] ring-2 ring-[#0066FF]/60 shadow-[0_0_12px_rgba(0,245,255,0.6)]";
                    bgStyle = "bg-transparent";
                    tagBg = "bg-[#00F5FF] text-black font-bold";
                  } else if (isHovered) {
                    borderStyle = isEditMode
                      ? "border border-[#00F5FF] ring-1 ring-[#0066FF] shadow-[0_0_8px_rgba(0,245,255,0.4)]"
                      : hasValue
                      ? "border border-[#0066FF] ring-1 ring-[#0066FF]/60"
                      : "border border-[#F27D26] ring-1 ring-[#F27D26]/60";
                    bgStyle = "bg-transparent";
                  }

                  // Precise normalized [0, 1000] percentage scaling relative to rendered page size
                  const topPercent = ymin / 10;
                  const leftPercent = xmin / 10;
                  const heightPercent = Math.max(1.2, (ymax - ymin) / 10);
                  const widthPercent = Math.max(1.2, (xmax - xmin) / 10);

                  const isMultiline =
                    field.field_type === "multiline" ||
                    (heightPercent > 4.5 && widthPercent > 15);

                  return (
                    <div
                      key={field.field_id}
                      id={`bbox-${field.field_id}`}
                      role="region"
                      aria-label={`Field region: ${field.detected_label || field.field_id}`}
                      onPointerDown={(e) => {
                        // Allow dragging from bounding box border/grip
                        const target = e.target as HTMLElement;
                        if (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA") {
                          handleBoxPointerDown(e, field, "move");
                        }
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectField(field.field_id);
                      }}
                      onMouseEnter={() => onHoverField(field.field_id)}
                      onMouseLeave={() => onHoverField(null)}
                      style={{
                        top: `${topPercent}%`,
                        left: `${leftPercent}%`,
                        height: `${heightPercent}%`,
                        width: `${widthPercent}%`,
                        background: "transparent",
                        cursor: isEditMode
                          ? isBeingDragged
                            ? "grabbing"
                            : "default"
                          : "pointer",
                      }}
                      className={`absolute ${borderStyle} ${bgStyle} transition-shadow duration-75 group rounded-[1px] ${
                        isSelected || isBeingDragged ? "z-30" : "z-10 hover:z-20"
                      }`}
                    >
                      {/* Drag grip bar for visual affordance in Edit Mode */}
                      {isEditMode && (
                        <div
                          title="Click and drag to reposition box"
                          aria-label="Drag handle to reposition field bounding box"
                          onPointerDown={(e) => handleBoxPointerDown(e, field, "move")}
                          className="absolute -top-3.5 left-0 px-1.5 py-0.5 min-h-[24px] bg-black/90 text-[#0066FF] hover:text-[#00F5FF] flex items-center justify-center rounded-t-sm border border-[#0066FF]/40 opacity-0 group-hover:opacity-100 cursor-move pointer-events-auto shadow-sm z-40 transition-opacity"
                        >
                          <GripHorizontal className="w-3 h-3" />
                        </div>
                      )}

                      {/* Delete Box button in Edit Mode with accessible target */}
                      {isEditMode && (
                        <button
                          onClick={(e) => handleDeleteBox(field.field_id, e)}
                          aria-label={`Delete field ${field.detected_label || field.field_id}`}
                          title="Delete field"
                          className="absolute -top-3.5 -right-3.5 w-6 h-6 bg-red-600 hover:bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto z-50 shadow-md cursor-pointer focus:opacity-100"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}

                      {/* Label Tag on top of box */}
                      {showLabels && (
                        <div
                          style={{ top: "-18px", left: isEditMode ? "18px" : "-1px" }}
                          className={`absolute ${tagBg} text-[10px] font-mono font-bold px-2 py-0.5 whitespace-nowrap shadow-md pointer-events-auto flex items-center gap-1 leading-tight tracking-tight uppercase z-30 rounded-[1px]`}
                        >
                          <span className="truncate max-w-[140px]">
                            {field.detected_label || field.field_id}
                          </span>
                          {showConfidence && (
                            <span className="opacity-90 text-[9px] font-mono">
                              {Math.round(field.confidence_score * 100)}%
                            </span>
                          )}
                        </div>
                      )}

                      {/* TRANSPARENT EDITABLE TEXTBOX INPUT: Aligned precisely over (x, y, w, h) */}
                      {isEditMode ? (
                        <div className="absolute inset-0 w-full h-full flex items-center p-0 pointer-events-auto z-20 bg-transparent">
                          {isMultiline ? (
                            <textarea
                              id={`input-${field.field_id}`}
                              aria-label={`Text value for ${field.detected_label || field.field_id}`}
                              value={field.mapped_value || ""}
                              onChange={(e) => {
                                if (onUpdateMappedValue) {
                                  onUpdateMappedValue(field.field_id, e.target.value);
                                }
                              }}
                              onFocus={() => onSelectField(field.field_id)}
                              onClick={(e) => e.stopPropagation()}
                              placeholder={field.detected_label || "Enter text..."}
                              style={{
                                color: fieldColor,
                                fontSize: `${Math.max(9, Math.min(22, Math.round(fieldSize * 1.05)))}px`,
                                background: "transparent",
                                caretColor: "#0066FF",
                              }}
                              className="w-full h-full bg-transparent font-mono font-semibold px-1 py-0.5 border-none outline-none focus:ring-1 focus:ring-[#0066FF] text-left resize-none leading-tight selection:bg-[#0066FF]/30 selection:text-white select-text cursor-text"
                            />
                          ) : (
                            <input
                              id={`input-${field.field_id}`}
                              aria-label={`Text value for ${field.detected_label || field.field_id}`}
                              type="text"
                              value={field.mapped_value || ""}
                              onChange={(e) => {
                                if (onUpdateMappedValue) {
                                  onUpdateMappedValue(field.field_id, e.target.value);
                                }
                              }}
                              onFocus={() => onSelectField(field.field_id)}
                              onClick={(e) => e.stopPropagation()}
                              placeholder={field.detected_label || ""}
                              style={{
                                color: fieldColor,
                                fontSize: `${Math.max(9, Math.min(22, Math.round(fieldSize * 1.05)))}px`,
                                background: "transparent",
                                caretColor: "#0066FF",
                              }}
                              className="w-full h-full bg-transparent font-mono font-semibold px-1 py-0 border-none outline-none focus:ring-1 focus:ring-[#0066FF] text-left leading-none selection:bg-[#0066FF]/30 selection:text-white select-text cursor-text"
                            />
                          )}
                        </div>
                      ) : (
                        /* LOCKED STATE: Transparent Burn-in Mapped Value Simulation inside box */
                        showBurnInValues &&
                        field.mapped_value && (
                          <div className="absolute inset-0 flex items-center px-1 overflow-hidden pointer-events-none bg-transparent">
                            <span
                              style={{
                                color: fieldColor,
                                fontSize: `${Math.max(9, Math.min(22, Math.round(fieldSize * 1.05)))}px`,
                              }}
                              className="font-mono font-bold truncate tracking-tight select-none leading-none drop-shadow-xs"
                            >
                              {field.mapped_value}
                            </span>
                          </div>
                        )
                      )}

                      {/* Resize Handle at Bottom-Right in Edit Mode */}
                      {isEditMode && (
                        <div
                          title="Drag to resize field box"
                          aria-label="Drag handle to resize field box dimensions"
                          onPointerDown={(e) => handleBoxPointerDown(e, field, "resize")}
                          className="absolute bottom-0 right-0 w-4 h-4 bg-[#0066FF] hover:bg-[#00F5FF] cursor-se-resize flex items-center justify-center opacity-75 group-hover:opacity-100 rounded-tl-sm shadow-md z-40 transition-colors pointer-events-auto"
                        >
                          <div className="w-1.5 h-1.5 border-r-2 border-b-2 border-white" />
                        </div>
                      )}

                      {/* Coordinate Tooltip on Hover */}
                      <div className="opacity-0 group-hover:opacity-100 pointer-events-none absolute -bottom-16 left-0 min-w-[220px] z-50 bg-[#080808]/95 text-white p-2 rounded-sm shadow-2xl border border-white/20 text-xs transition-opacity backdrop-blur font-mono">
                        <div className="font-bold text-[#00F5FF] truncate uppercase">{field.detected_label}</div>
                        <div className="text-[10px] text-white/50 mt-0.5">
                          ID: {field.field_id} | Box: [{ymin}, {xmin}, {ymax}, {xmax}] (P.{field.page_number || 1})
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[10px] border-t border-white/10 pt-1">
                          <span className="text-white/40 uppercase">Style:</span>
                          <span className="font-bold text-[#00F5FF]">
                            {fieldSize}pt • {fieldColor}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Drawing dynamic rectangle preview when user is manually adding a box */}
                {drawingState && imageRef.current && (
                  <div
                    style={{
                      left: `${(Math.min(drawingState.startX, drawingState.currentX) / imageRef.current.clientWidth) * 100}%`,
                      top: `${(Math.min(drawingState.startY, drawingState.currentY) / imageRef.current.clientHeight) * 100}%`,
                      width: `${(Math.abs(drawingState.currentX - drawingState.startX) / imageRef.current.clientWidth) * 100}%`,
                      height: `${(Math.abs(drawingState.currentY - drawingState.startY) / imageRef.current.clientHeight) * 100}%`,
                    }}
                    className="absolute border-2 border-dashed border-[#00F5FF] bg-[#00F5FF]/20 pointer-events-none z-50 shadow-[0_0_15px_rgba(0,245,255,0.4)]"
                  >
                    <div className="absolute -top-5 left-0 bg-[#00F5FF] text-black text-[9px] font-mono font-bold px-1 py-0.2">
                      New Field
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center p-8 text-white/40 font-mono">
            <Layers className="w-12 h-12 mx-auto mb-3 text-[#00F5FF]/50 animate-pulse" />
            <p className="text-sm font-bold text-white uppercase tracking-wider">No document loaded</p>
            <p className="text-xs text-white/30 mt-1">Upload a PDF or Image, or pick a preset from the toolbar above.</p>
          </div>
        )}

        {/* Floating Canvas Navigation / Edit Help */}
        <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-black/85 backdrop-blur px-3 py-1.5 rounded-sm border border-white/10 text-xs font-mono text-white/70 pointer-events-none">
          <Move className="w-3.5 h-3.5 text-[#00F5FF]" />
          {isEditMode ? (
            <span>Edit Mode: Type in box • Touch/Drag to move • Drag bottom-right to resize • Use styling toolbar</span>
          ) : (
            <span>Locked Mode: Touch/Drag to pan • Pinch to zoom • Click "Edit Form" to type in-place & customize font/color</span>
          )}
        </div>
      </div>

      {/* Cyber/Spatial Indicator Laser Bar */}
      <div className="h-1 w-full bg-[#111] relative overflow-hidden border-t border-white/5">
        <div className="absolute inset-0 bg-[#00F5FF] w-1/3 shadow-[0_0_15px_rgba(0,245,255,0.7)] animate-pulse" />
      </div>
    </div>
  );
};

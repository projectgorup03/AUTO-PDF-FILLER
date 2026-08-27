export interface BoundingBoxField {
  field_id: string;
  detected_label: string;
  box_2d: [number, number, number, number]; // [ymin, xmin, ymax, xmax] in [0, 1000] scale
  mapped_value: string | null;
  confidence_score: number; // 0.0 to 1.0
  page_number: number; // 1-based index (Page 1, Page 2, etc.)
  field_type?: 'text' | 'checkbox' | 'date' | 'signature' | 'number' | 'multiline';
  font_size?: number; // text size in pt (e.g. 8 to 24)
  font_color?: string; // text color hex (e.g. #1e3a8a, #000000)
}

export interface DocumentProcessingResult {
  fields: BoundingBoxField[];
  raw_json: string;
  processing_time_ms: number;
  unstructured_input: string;
  document_name: string;
  total_pages?: number;
  dimensions?: { width: number; height: number };
}

export interface SamplePreset {
  id: string;
  name: string;
  category: string;
  description: string;
  documentUrl: string; // data URL or SVG/canvas generated image
  sampleDetails: string;
}

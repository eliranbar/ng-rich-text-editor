import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { RteFeatureId } from './features';

export type ImageUploadHandler = (
  file: File,
) => Observable<string> | Promise<string>;

export type ToolbarItem =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strike'
  | 'heading'
  | 'align'
  | 'direction'
  | 'orderedList'
  | 'bulletList'
  | 'textColor'
  | 'backgroundColor'
  | 'link'
  | 'image'
  | 'undo'
  | 'redo'
  | 'clear'
  | 'source'
  | 'table'
  | 'fullscreen'
  | '|';

export interface TableConfig {
  /** Largest table the size picker and inputs accept. Defaults to 50. */
  maxRows?: number;
  /** Largest column count the size picker and inputs accept. Defaults to 20. */
  maxColumns?: number;
  /** Size of the hover grid in the insert popover. Defaults to 10×10. */
  pickerRows?: number;
  pickerColumns?: number;
  /** Give new tables a `<thead>` header row. Defaults to true. */
  headerRow?: boolean;
}

export interface RichTextEditorConfig {
  /** Offline signed license key unlocking premium features. */
  licenseKey?: string;
  /** Host-provided upload handler; returns the public URL of the saved image. */
  imageUploadHandler?: ImageUploadHandler;
  /** Override which toolbar controls are shown (still gated by license). */
  toolbar?: ToolbarItem[];
  /** Extra free features granted without a license (honor-system override). */
  extraFeatures?: RteFeatureId[];
  /** Placeholder text shown when the editor is empty. */
  placeholder?: string;
  /** Table sizing limits and insert-picker defaults. */
  table?: TableConfig;
}

export const DEFAULT_TABLE_CONFIG: Required<TableConfig> = {
  maxRows: 50,
  maxColumns: 20,
  pickerRows: 10,
  pickerColumns: 10,
  headerRow: true,
};

export const RTE_CONFIG = new InjectionToken<RichTextEditorConfig>('RTE_CONFIG', {
  providedIn: 'root',
  factory: () => ({}),
});

export const DEFAULT_TOOLBAR: ToolbarItem[] = [
  'undo',
  'redo',
  '|',
  'heading',
  '|',
  'bold',
  'italic',
  'underline',
  'strike',
  '|',
  'textColor',
  'backgroundColor',
  '|',
  'align',
  'direction',
  '|',
  'orderedList',
  'bulletList',
  '|',
  'link',
  'image',
  '|',
  'table',
  'source',
  'fullscreen',
  '|',
  'clear',
];

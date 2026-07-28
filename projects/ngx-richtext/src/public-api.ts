/*
 * Public API Surface of ngx-richtext
 */

export { provideRichTextEditor } from './lib/config/provide';
export {
  RTE_CONFIG,
  DEFAULT_TOOLBAR,
  DEFAULT_TABLE_CONFIG,
  type RichTextEditorConfig,
  type ImageUploadHandler,
  type TableConfig,
  type ToolbarItem,
} from './lib/config/tokens';
export {
  RTE_FEATURES,
  FREE_FEATURES,
  PREMIUM_FEATURES,
  ALL_FEATURES,
  type RteFeatureId,
} from './lib/config/features';

export { RteEditorComponent } from './lib/editor/editor.component';
export { RteWrapperComponent } from './lib/editor/wrapper.component';
export { RteToolbarComponent } from './lib/toolbar/toolbar.component';

export {
  SelectionService,
  type SelectionState,
  type SavedSelection,
  type SavedOffsets,
} from './lib/core/selection.service';
export { CommandService, type InlineMark, type BlockType, type AlignType, type DirectionType } from './lib/core/command.service';
export { HistoryService } from './lib/core/history.service';
export { HtmlSerializer } from './lib/core/serializer';
export { sanitizeHtml } from './lib/core/sanitizer';
export { cleanPastedHtml, plainTextToHtml } from './lib/core/paste';

export { LicenseService, type LicensePayload, type LicenseState } from './lib/license/license.service';
export { FeatureGateService } from './lib/license/feature-gate.service';

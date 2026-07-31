/** Feature identifiers used for free / premium gating. */
export const RTE_FEATURES = {
  bold: 'bold',
  italic: 'italic',
  underline: 'underline',
  strike: 'strike',
  heading: 'heading',
  lists: 'lists',
  alignment: 'alignment',
  direction: 'direction',
  link: 'link',
  undoRedo: 'undoRedo',
  image: 'image',
  clearFormat: 'clearFormat',
  textColor: 'textColor',
  backgroundColor: 'backgroundColor',
  tables: 'tables',
  /** Premium */
  imageResize: 'imageResize',
  sourceView: 'sourceView',
  wordCount: 'wordCount',
  fullscreen: 'fullscreen',
} as const;

export type RteFeatureId = (typeof RTE_FEATURES)[keyof typeof RTE_FEATURES];

export const FREE_FEATURES: readonly RteFeatureId[] = [
  RTE_FEATURES.bold,
  RTE_FEATURES.italic,
  RTE_FEATURES.underline,
  RTE_FEATURES.strike,
  RTE_FEATURES.heading,
  RTE_FEATURES.lists,
  RTE_FEATURES.alignment,
  RTE_FEATURES.direction,
  RTE_FEATURES.link,
  RTE_FEATURES.undoRedo,
  RTE_FEATURES.image,
  RTE_FEATURES.clearFormat,
  RTE_FEATURES.textColor,
  RTE_FEATURES.backgroundColor,
  RTE_FEATURES.tables,
];

export const PREMIUM_FEATURES: readonly RteFeatureId[] = [
  RTE_FEATURES.imageResize,
  RTE_FEATURES.sourceView,
  RTE_FEATURES.wordCount,
  RTE_FEATURES.fullscreen,
];

export const ALL_FEATURES: readonly RteFeatureId[] = [
  ...FREE_FEATURES,
  ...PREMIUM_FEATURES,
];

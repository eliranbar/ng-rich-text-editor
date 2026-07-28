/**
 * Premium image resize helpers.
 * Attach resize handles to a selected image inside the editor root.
 */
export const IMAGE_RESIZE_FEATURE = 'imageResize' as const;

export function enableImageResize(img: HTMLImageElement): () => void {
  img.style.resize = 'both';
  img.style.overflow = 'auto';
  img.style.maxWidth = '100%';
  return () => {
    img.style.resize = '';
    img.style.overflow = '';
  };
}

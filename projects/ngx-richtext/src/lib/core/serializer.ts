import { sanitizeHtml } from './sanitizer';
import { isEditorEmpty, normalizeEmptyEditor } from './dom-utils';

export class HtmlSerializer {
  serialize(root: HTMLElement): string {
    if (isEditorEmpty(root)) {
      return '';
    }
    return sanitizeHtml(root.innerHTML);
  }

  deserialize(html: string, root: HTMLElement): void {
    const clean = sanitizeHtml(html || '');
    root.innerHTML = clean || '<p><br></p>';
    normalizeEmptyEditor(root);
  }
}

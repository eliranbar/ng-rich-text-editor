# ngx-richtext

Professional Angular rich text editor — toolbar + contenteditable area, HTML value format, host-delegated image uploads, and free/premium feature tiers unlocked by an offline signed license key.

## Install

```bash
npm install ngx-richtext
```

Peer dependencies: `@angular/core`, `@angular/common`, `@angular/forms` (v21+).

Import styles once in your global stylesheet:

```css
@import 'ngx-richtext/styles.css';
```

(After install, the stylesheet is exported as `ngx-richtext/styles.css`.)

## Quick start

```ts
import { provideRichTextEditor, RteEditorComponent, RteToolbarComponent, RteWrapperComponent } from 'ngx-richtext';
import { FormsModule } from '@angular/forms';

export const appConfig = {
  providers: [
    provideRichTextEditor({
      // optional premium license
      // licenseKey: '...',
      imageUploadHandler: (file) => myApi.upload(file), // returns Promise<string> | Observable<string>
    }),
  ],
};
```

```html
<ngx-rte-wrapper>
  <ngx-rte-toolbar [editor]="editor" />
  <ngx-rte #editor [(ngModel)]="html" placeholder="Type here…" />
</ngx-rte-wrapper>
```

The editor value is a **sanitized HTML string** suitable for `ngModel` / reactive forms.

## RTL / Hebrew & Arabic

Use the **LTR** / **RTL** toolbar buttons to set writing direction on the current block (or list). HTML is stored with `dir="rtl"` (and `style="direction: rtl"`).

You can also set a default for the whole editor:

```html
<ngx-rte [dir]="'rtl'" [(ngModel)]="html" />
```

## Tables

The table button opens a picker with two ways to choose a size: hover the grid for
quick sizes, or type exact row and column counts for anything larger. A `Header row`
option puts the first row in a `<thead>` as `<th>` cells.

Once the caret is inside a table, the toolbar shows controls to insert a row above or
below, insert a column left or right, and delete the current row, column, or the whole
table — so a table can grow to any size after it is created.

Limits and picker defaults are configurable:

```ts
provideRichTextEditor({
  table: {
    maxRows: 50,        // largest table the picker and inputs accept
    maxColumns: 20,
    pickerRows: 10,     // size of the hover grid
    pickerColumns: 10,
    headerRow: true,    // default state of the "Header row" checkbox
  },
})
```

Sizes typed into the inputs are clamped to `maxRows` / `maxColumns`.

## Image uploads

The package never uploads to a server itself. Provide `imageUploadHandler` in `provideRichTextEditor`:

```ts
imageUploadHandler: (file: File) => this.http.post<{url: string}>('/api/images', formData).pipe(map(r => r.url))
```

Flow:

1. User picks / pastes / drops an image
2. Editor inserts a temporary placeholder (`blob:` URL + uploading marker)
3. Your handler saves the file and returns the public URL
4. Editor swaps `src` to that URL (or removes the placeholder and emits `imageUploadError` on failure)

Without a handler, the toolbar still exposes the image button and emits `(imageRequest)` with the `File`.

## Free vs premium

| Feature | Free | Premium |
| --- | --- | --- |
| Bold / italic / underline / strike | ✓ | ✓ |
| Headings, lists, alignment, LTR/RTL direction, links | ✓ | ✓ |
| Undo / redo, clear formatting | ✓ | ✓ |
| Basic image insert | ✓ | ✓ |
| Text & highlight colors | | ✓ |
| Tables | | ✓ |
| HTML source view | | ✓ |
| Word / char counter | | ✓ |
| Fullscreen | | ✓ |
| Image resize helpers | | ✓ |

Premium modules are also available as secondary entry points so free apps do not bundle them:

```ts
import { createTableHtml } from 'ngx-richtext/tables';
import { countWords } from 'ngx-richtext/word-count';
import { enableImageResize } from 'ngx-richtext/image-resize';
```

### License keys

Offline Ed25519-signed keys — no license server required.

```bash
# generate a key pair (keep private key secret)
node tools/generate-license.mjs --keypair

# issue a license
RTE_LICENSE_PRIVATE_KEY=<private> node tools/generate-license.mjs \
  --licensee "Acme Inc" --expiry 2027-12-31
```

Pass the resulting `licenseKey` to `provideRichTextEditor`. Invalid / missing / expired keys gracefully fall back to the free tier.

## Theming

Override CSS custom properties:

```css
.ngx-rte-wrapper {
  --rte-accent: #7c3aed;
  --rte-radius: 12px;
}
```

Use `[theme]="'dark'"` on `<ngx-rte-wrapper>` or add class `ngx-rte-theme-dark`.

## API overview

### `provideRichTextEditor(config)`

- `licenseKey?: string`
- `imageUploadHandler?: (file: File) => Observable<string> | Promise<string>`
- `toolbar?: ToolbarItem[]`
- `extraFeatures?: RteFeatureId[]`
- `placeholder?: string`

### `<ngx-rte>`

Inputs: `placeholder`, `disabled`, `minHeight`  
Outputs: `contentChange`, `focused`, `blurred`, `imageUploadError`, `imageRequest`, `selectionStateChange`  
Implements `ControlValueAccessor`.

### `<ngx-rte-toolbar>`

Inputs: `editor` (required), `items` (optional toolbar layout)

## Development

```bash
npm start          # demo app
npm test           # unit tests
npm run e2e        # Playwright
npm run build      # library
npm run publish:dry
```

## License

MIT — free to use. Premium capabilities are gated by a separately issued license key.

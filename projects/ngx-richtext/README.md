# ngx-richtext

Professional Angular rich text editor — one tag, toolbar included, HTML value format, host-delegated image uploads, and free/premium feature tiers unlocked by an offline signed license key.

**[Live demo → https://www.ebdev-design.com](https://www.ebdev-design.com)**

## Install

```bash
npm install ngx-richtext
```

Peer dependencies: `@angular/core`, `@angular/common`, `@angular/forms` (v18, v19, v20 or v21) and `rxjs`.

Import styles once in your global stylesheet:

```css
@import 'ngx-richtext/styles.css';
```

(After install, the stylesheet is exported as `ngx-richtext/styles.css`.)

## Quick start

```ts
import { signal } from '@angular/core';
import { provideRichTextEditor, RteEditorComponent } from 'ngx-richtext';

export const appConfig = {
  providers: [
    provideRichTextEditor({
      // optional premium license
      // licenseKey: '...',
      imageUploadHandler: (file) => myApi.upload(file), // returns Promise<string> | Observable<string>
    }),
  ],
};

readonly html = signal('');
```

Add `RteEditorComponent` to the component's `imports`, then drop in a single tag:

```html
<ngx-rte [(value)]="html" placeholder="Type here…" />
```

That's the whole editor — toolbar included. The `[(value)]` model is **free**.

### Reactive forms (Premium)

With a premium license (`reactiveForms`), bind a `FormControl` for validation, `disable()`, and touched/dirty status:

```ts
import { FormControl, Validators } from '@angular/forms';

readonly body = new FormControl('', {
  nonNullable: true,
  validators: [Validators.required],
});
```

```html
<ngx-rte [formControl]="body" placeholder="Type here…" />
<!-- or formControlName="body" inside a [formGroup] -->
```

An empty editor emits `''`, so `Validators.required` (and other string validators) behave as expected. Without a license, FormControl binding is ignored (with a console warning) and `[(value)]` keeps working.

### Toolbar on / off

The toolbar renders by default. Set `showToolbar` to `false` for a plain editable surface:

```html
<ngx-rte showToolbar="false" [(value)]="html" />
<ngx-rte [showToolbar]="!readonlyMode()" [(value)]="html" />
```

Override which controls it shows with `toolbarItems` (or globally via the `toolbar` config):

```html
<ngx-rte [toolbarItems]="['bold', 'italic', '|', 'link']" [(value)]="html" />
```

### Toolbar outside the editor

To place the toolbar somewhere else, turn the built-in one off and bind
`<ngx-rte-toolbar>` to the editor:

```html
<ngx-rte-toolbar [editor]="editor" />
<ngx-rte #editor showToolbar="false" [(value)]="html" />
```

The editor's `value` model signal is a **sanitized HTML string** (free).
`ControlValueAccessor` / FormControl support is a **premium** feature (`reactiveForms`).

## RTL / Hebrew & Arabic

Use the **LTR** / **RTL** toolbar buttons to set writing direction on the current block (or list). HTML is stored with `dir="rtl"` (and `style="direction: rtl"`).

You can also set a default for the whole editor:

```html
<ngx-rte [dir]="'rtl'" [(value)]="html" />
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
| Text & highlight colors | ✓ | ✓ |
| Tables (picker, header row, row/column editing) | ✓ | ✓ |
| `[(value)]` signal / two-way model | ✓ | ✓ |
| FormControl / formControlName / ngModel | | ✓ |
| HTML source view | | ✓ |
| Word / char counter | | ✓ |
| Fullscreen | | ✓ |
| Image resize helpers | | ✓ |

Optional modules are also available as secondary entry points so apps only bundle what they use:

```ts
import { createTableHtml } from 'ngx-richtext/tables';
import { countWords } from 'ngx-richtext/word-count';
import { enableImageResize } from 'ngx-richtext/image-resize';
```

### License keys

Offline Ed25519-signed keys — no license server required. Every key is bound to
the hostnames it was issued for and carries an expiry date (one year by default):

```jsonc
{
  "plan": "premium",
  "features": ["imageResize", "sourceView", "wordCount", "fullscreen", "reactiveForms"],
  "domains": ["acme.com", "*.acme.com"],
  "expiry": "2027-08-03",
  "licensee": "Acme Inc"
}
```

Pass the key to `provideRichTextEditor({ licenseKey })`. Verification happens once
at startup and never blocks rendering — a missing, malformed, expired, or
wrong-domain key logs a warning and falls back to the free tier.

**Domain binding.** `*.acme.com` matches the apex and every subdomain;
`notacme.com` does not. `localhost`, `127.0.0.1`, and `*.localhost` are always
accepted so `ng serve`, CI, and unit tests work without a key of their own. Server
rendering (no `location`) is likewise treated as a development host.

**Expiry.** When a key expires the editor keeps working — only premium features
switch off. Renew by dropping in a new key; no code change needed.

Issuing keys (maintainers):

```bash
RTE_LICENSE_PRIVATE_KEY=<private> node tools/generate-license.mjs \
  --licensee "Acme Inc" --domains "acme.com,*.acme.com"
```

## Theming

Override CSS custom properties:

```css
.ngx-rte {
  --rte-accent: #7c3aed;
  --rte-radius: 12px;
}
```

Use `[theme]="'dark'"` on `<ngx-rte>`, or add the class `ngx-rte-theme-dark` to any ancestor.

## API overview

### `provideRichTextEditor(config)`

- `licenseKey?: string`
- `imageUploadHandler?: (file: File) => Observable<string> | Promise<string>`
- `toolbar?: ToolbarItem[]`
- `extraFeatures?: RteFeatureId[]`
- `placeholder?: string`

### `<ngx-rte>`

Models: `value` (free)  
Inputs: `placeholder`, `disabled`, `minHeight`, `dir`, `showToolbar` (default `true`), `toolbarItems`, `theme`  
Outputs: `contentChange`, `focused`, `blurred`, `imageUploadError`, `imageRequest`, `selectionStateChange`  
Premium `reactiveForms`: `[formControl]` / `formControlName` / `ngModel`. Empty content is `''` so `Validators.required` works.

### `<ngx-rte-toolbar>`

Only needed to place the toolbar outside the editor. Inputs: `editor` (required), `items` (optional toolbar layout)

### `<ngx-rte-wrapper>`

**Deprecated.** `<ngx-rte>` is a complete card on its own. The old three-tag layout
still works, but new code should use `<ngx-rte>` alone.

## Development

```bash
npm start          # demo app
npm test           # unit tests
npm run e2e        # Playwright
npm run build      # library
npm run publish:dry
```

## License

Source-available under the [ngx-richtext License Agreement](LICENSE) — **not MIT**.

- **Free tier** — free forever, in unlimited applications, including commercial ones. No key, no registration.
- **Premium tier** — requires a purchased license key, bound to your domains and renewed annually.
- **Source** — published to read, audit, debug, and contribute to. Redistributing the library itself, or bypassing the feature gate, is not permitted.

[Get a license →](https://www.ebdev-design.com)

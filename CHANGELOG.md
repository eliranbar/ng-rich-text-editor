# Changelog

## 0.4.0

**Fixes a bug that silently downgraded paying customers to the free tier.**

- **Ed25519 fallback.** `crypto.subtle` only gained Ed25519 in Chrome 137, and it does not exist
  at all outside a secure context. Until now the verifier caught that failure and reported
  `parse-error`, so a customer on an older browser, a pinned enterprise build, an Android WebView,
  or a plain-`http://` intranet lost the features they had paid for — with nothing in the console
  to explain why. A pure-JS fallback now handles those environments. It is **loaded on demand**,
  so the majority with native Ed25519 download nothing extra.
- **The public key is now a keyring.** `RTE_LICENSE_KEYRING` holds an ordered list of trusted
  keys, and payloads carry a `kid` naming the one that signed them. The **successor key for the
  next rotation ships in this release**, roughly a year before it signs anything — so when
  rotation happens it is a server-side change that requires no action from you. Previously a
  rotation would have invalidated every key ever issued, simultaneously.
- **Licenses are bound to a product.** Payloads carry `product`, and a key issued for another
  E.B Dev & Design package is rejected here even though the signature is valid. Every product
  also has its own signing keypair, which makes cross-product forgery impossible rather than
  merely detected.
- **Expiry no longer ends a day early.** A key stamped `2027-08-05` was read as expiring at
  00:00 **UTC**, so anyone east of Greenwich lost a day they had paid for. A 24-hour grace window
  means the stamped day is always a full day, in every timezone.
- **Angular 22 supported** — added to the peer range alongside 18–21.
- New failure reasons on `LicenseState`: `no-crypto` (the environment cannot verify anything) and
  `product-mismatch`. `reason` is now the `LicenseFailureReason` union instead of `string`.
- The demo key is no longer bound to `*.ebdev-design.com`. It ships in a public bundle, and a
  wildcard made every present and future demo subdomain a valid host for it.

## 0.3.0

**Breaking: every previously issued license key is invalid.** The signing key pair
was rotated because the old public key had signed a perpetual demo key published in
this repository. Existing customers need a reissued key.

- **Domain binding.** License keys now carry a `domains` list and are only valid on
  those hostnames. `*.acme.com` matches the apex and all subdomains. A key lifted
  out of someone else's JS bundle unlocks nothing elsewhere. `localhost`,
  `127.0.0.1`, `*.localhost`, and server rendering always pass, so no separate key
  is needed for `ng serve`, CI, or SSR.
- **Real expiry dates.** `tools/generate-license.mjs` now defaults to a one-year
  term instead of 2099, and refuses to issue a key without `--domains`. Expired
  keys fall back to the free tier — the editor keeps working, premium switches off.
- **License changed from MIT to the ngx-richtext License Agreement.** Source-
  available, not open source: the free tier stays free forever in any application
  including commercial ones, premium features require a purchased key, and
  redistributing the library or bypassing the feature gate is not permitted.
- The demo license is now bound to the demo's own hosts and expires 2027-08-03.

## 0.1.8

- **One tag instead of three.** `<ngx-rte>` now renders its own toolbar and card
  chrome, so the whole editor is `<ngx-rte [(value)]="html" />`.
- New `showToolbar` input (default `true`) toggles the built-in toolbar:
  `<ngx-rte showToolbar="false" [(value)]="html" />`. Also accepts `[showToolbar]`.
- New `toolbarItems` and `theme` inputs on `<ngx-rte>`.
- `<ngx-rte-wrapper>` is deprecated and `<ngx-rte-toolbar>` is now only needed to
  place the toolbar outside the editor. The old three-tag layout keeps working.
- Fix: dark theme tokens were reset to their light values on nested `.ngx-rte` /
  `.ngx-rte-toolbar` elements, so `[theme]="'dark'"` left the editor surface light.

## 0.1.6

- Tables and text / highlight colors are now part of the **free** tier — no license
  key needed. They keep working exactly as before for licensed apps.
- Premium is now: HTML source view, word count, fullscreen, and image resize helpers.

## 0.1.3

- Tables are no longer fixed at 3×3. The table button opens a picker with a hover
  grid for quick sizes plus row/column inputs for larger tables, and an optional
  header row.
- New table editing commands, exposed in the toolbar whenever the caret is inside a
  table: insert row above/below, insert column left/right, delete row, delete
  column, delete table.
- New `table` config section: `maxRows`, `maxColumns`, `pickerRows`,
  `pickerColumns`, `headerRow`.
- Fix: tables were inserted *inside* the current paragraph, which is invalid markup —
  re-parsing it during serialization silently dropped rows or the whole table. Tables
  are now inserted as siblings, splitting the paragraph when the caret is mid-text.
- `SelectionState` gains `inTable`.

## 0.1.2

Fixes found by driving every toolbar control through Playwright.

- Links: the URL dialog stole the selection, so applying, editing, or removing a
  link silently did nothing. The selection is now saved when the dialog opens.
- Commands that replace elements (headings, lists) left the selection detached,
  making the *next* command a no-op — e.g. heading → paragraph, bullet → numbered,
  or turning a list off. Selection is now preserved as text offsets across commands.
- Inline marks wrapped block elements when a whole block was selected, producing
  invalid markup like `<strong><p>text</p></strong>`. Marks and colors are now
  applied per block.
- Clear formatting did nothing when the caret was inside the mark being cleared,
  and dropped the block wrapper when it did apply.
- Undo jumped past typed text and could clear the editor, because the initial
  snapshot was taken before the value was written and pending typing was not
  flushed before a command.
- Fullscreen covered the toolbar, leaving every control unclickable; the wrapper
  card now expands instead of the editor alone.
- Pressing a toolbar button no longer moves focus out of the editor.

## 0.1.1

- Add LTR/RTL direction toolbar control for Hebrew, Arabic, and other RTL languages
- Persist `dir` / `direction` on blocks; editor `[dir]` input for default writing direction

## 0.1.0

- Initial release of `ngx-richtext`
- Custom contenteditable engine with toolbar (bold, italic, underline, strike, headings, lists, alignment, links, undo/redo)
- Host-delegated image upload via `imageUploadHandler`
- HTML value format with allowlist sanitization
- Offline Ed25519 license keys for premium features (colors, tables, source view, word count, fullscreen, image resize helpers)
- Secondary entry points: `ngx-richtext/tables`, `source-view`, `word-count`, `fullscreen`, `image-resize`
- Demo app, Vitest unit tests, Playwright e2e

# Changelog

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

import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  AfterViewInit,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { RteEditorComponent } from '../editor/editor.component';
import { SavedOffsets, SelectionState } from '../core/selection.service';
import {
  RTE_CONFIG,
  DEFAULT_TOOLBAR,
  DEFAULT_TABLE_CONFIG,
  TableConfig,
  ToolbarItem,
} from '../config/tokens';
import { FeatureGateService } from '../license/feature-gate.service';
import { FREE_FEATURES, RTE_FEATURES, RteFeatureId } from '../config/features';
import { AlignType, BlockType, DirectionType } from '../core/command.service';

/** Approximate width of the table popover, used to decide which side it opens on. */
const PICKER_WIDTH = 240;

const COLOR_PALETTE = [
  '#000000',
  '#434343',
  '#666666',
  '#999999',
  '#ffffff',
  '#e11d48',
  '#ea580c',
  '#ca8a04',
  '#16a34a',
  '#2563eb',
  '#7c3aed',
  '#db2777',
];

@Component({
  selector: 'ngx-rte-toolbar',
  standalone: true,
  templateUrl: './toolbar.component.html',
  styleUrl: './toolbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ngx-rte-toolbar',
    role: 'toolbar',
    'aria-label': 'Formatting',
  },
})
export class RteToolbarComponent implements AfterViewInit, OnDestroy {
  readonly editor = input.required<RteEditorComponent>();
  readonly items = input<ToolbarItem[] | null>(null);

  readonly state = signal<SelectionState>({
    bold: false,
    italic: false,
    underline: false,
    strike: false,
    link: false,
    orderedList: false,
    bulletList: false,
    inTable: false,
    blockType: 'p',
    align: 'left',
    direction: 'ltr',
    textColor: null,
    backgroundColor: null,
    href: null,
  });

  readonly showLinkDialog = signal(false);
  readonly linkUrl = signal('https://');
  readonly showTextColor = signal(false);
  readonly showBgColor = signal(false);
  readonly palette = COLOR_PALETTE;

  readonly showTablePicker = signal(false);
  readonly pickerAlignEnd = signal(false);
  /** Rows/columns highlighted in the hover grid; 0 means nothing hovered yet. */
  readonly hoverRows = signal(0);
  readonly hoverColumns = signal(0);

  /** Editor selection held while a dialog has focus. */
  private pendingSelection: SavedOffsets | null = null;

  private readonly config = inject(RTE_CONFIG);
  readonly tableConfig: Required<TableConfig> = {
    ...DEFAULT_TABLE_CONFIG,
    ...this.config.table,
  };
  /** Row indexes of the hover grid, for template iteration. */
  readonly pickerRowList = Array.from(
    { length: Math.min(this.tableConfig.pickerRows, this.tableConfig.maxRows) },
    (_, i) => i + 1,
  );
  readonly pickerColumnList = Array.from(
    { length: Math.min(this.tableConfig.pickerColumns, this.tableConfig.maxColumns) },
    (_, i) => i + 1,
  );

  readonly tableRows = signal(Math.min(3, this.tableConfig.maxRows));
  readonly tableColumns = signal(Math.min(3, this.tableConfig.maxColumns));
  readonly tableHeader = signal(this.tableConfig.headerRow);

  private readonly hostRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly features = inject(FeatureGateService, { optional: true });
  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');
  private unsub: (() => void) | null = null;

  async ngAfterViewInit(): Promise<void> {
    await this.features?.init();
    const ed = this.editor();
    this.unsub = () => undefined;
    // Poll selection via editor output by binding in template; also listen here
    const handler = () => this.state.set(ed.selection.getState());
    document.addEventListener('selectionchange', handler);
    this.unsub = () => document.removeEventListener('selectionchange', handler);
  }

  ngOnDestroy(): void {
    this.unsub?.();
  }

  toolbarItems(): ToolbarItem[] {
    return this.items() ?? this.config.toolbar ?? DEFAULT_TOOLBAR;
  }

  can(feature: RteFeatureId): boolean {
    if (!this.features) {
      // Without provideRichTextEditor, allow free features only
      return FREE_FEATURES.includes(feature);
    }
    return this.features.isEnabled(feature);
  }

  visible(item: ToolbarItem): boolean {
    if (item === '|') {
      return true;
    }
    const map: Partial<Record<ToolbarItem, RteFeatureId>> = {
      bold: RTE_FEATURES.bold,
      italic: RTE_FEATURES.italic,
      underline: RTE_FEATURES.underline,
      strike: RTE_FEATURES.strike,
      heading: RTE_FEATURES.heading,
      align: RTE_FEATURES.alignment,
      direction: RTE_FEATURES.direction,
      orderedList: RTE_FEATURES.lists,
      bulletList: RTE_FEATURES.lists,
      textColor: RTE_FEATURES.textColor,
      backgroundColor: RTE_FEATURES.backgroundColor,
      link: RTE_FEATURES.link,
      image: RTE_FEATURES.image,
      undo: RTE_FEATURES.undoRedo,
      redo: RTE_FEATURES.undoRedo,
      clear: RTE_FEATURES.clearFormat,
      source: RTE_FEATURES.sourceView,
      table: RTE_FEATURES.tables,
      fullscreen: RTE_FEATURES.fullscreen,
    };
    const feature = map[item];
    if (!feature) {
      return true;
    }
    if (item === 'image' && !this.config.imageUploadHandler) {
      // Still show — host can listen to imageRequest
      return this.can(feature);
    }
    return this.can(feature);
  }

  run(action: () => void): void {
    action();
    this.state.set(this.editor().selection.getState());
  }

  /**
   * Keep the caret inside the editor when a control is pressed. Without this the
   * button takes focus, the document selection collapses, and the command has
   * nothing to act on.
   */
  onControlMouseDown(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (target?.closest('input, select, textarea')) {
      return;
    }
    event.preventDefault();
  }

  toggle(mark: 'bold' | 'italic' | 'underline' | 'strike'): void {
    this.run(() => this.editor().commands.toggleMark(mark));
  }

  setHeading(value: string): void {
    this.run(() => this.editor().commands.setBlockType(value as BlockType));
  }

  setAlign(value: string): void {
    this.run(() => this.editor().commands.setAlignment(value as AlignType));
  }

  setDirection(value: string): void {
    this.run(() => this.editor().commands.setDirection(value as DirectionType));
  }

  toggleList(ordered: boolean): void {
    this.run(() => this.editor().commands.toggleList(ordered));
  }

  undo(): void {
    this.run(() => this.editor().commands.undo());
  }

  redo(): void {
    this.run(() => this.editor().commands.redo());
  }

  clear(): void {
    this.run(() => this.editor().commands.clearFormatting());
  }

  openLink(): void {
    // Typing in the URL field moves focus out of the editor, so remember the
    // selection now and re-apply it when the dialog is confirmed.
    this.pendingSelection = this.editor().selection.saveOffsets();
    this.linkUrl.set(this.state().href || 'https://');
    this.showLinkDialog.set(true);
  }

  applyLink(): void {
    const url = this.linkUrl().trim();
    this.withRestoredSelection(() => this.editor().commands.setLink(url || null));
    this.showLinkDialog.set(false);
  }

  removeLink(): void {
    this.withRestoredSelection(() => this.editor().commands.setLink(null));
    this.showLinkDialog.set(false);
  }

  cancelLink(): void {
    this.pendingSelection = null;
    this.showLinkDialog.set(false);
    this.editor().selection.focusEditor();
  }

  private withRestoredSelection(action: () => void): void {
    const selection = this.editor().selection;
    selection.focusEditor();
    selection.restoreOffsets(this.pendingSelection);
    this.pendingSelection = null;
    this.run(action);
  }

  pickTextColor(color: string | null): void {
    this.run(() => this.editor().commands.setTextColor(color));
    this.showTextColor.set(false);
  }

  pickBgColor(color: string | null): void {
    this.run(() => this.editor().commands.setBackgroundColor(color));
    this.showBgColor.set(false);
  }

  pickImage(): void {
    this.fileInput()?.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      void this.editor().uploadImage(file);
    }
    input.value = '';
  }

  openTablePicker(event: MouseEvent): void {
    this.pendingSelection = this.editor().selection.saveOffsets();
    this.hoverRows.set(0);
    this.hoverColumns.set(0);
    this.alignPicker(event.currentTarget as HTMLElement | null);
    this.showTablePicker.update((open) => !open);
  }

  /** Flip the popover to the right edge when it would overflow the toolbar. */
  private alignPicker(button: HTMLElement | null): void {
    const host = this.hostRef.nativeElement;
    if (!button) {
      return;
    }
    const available = host.getBoundingClientRect().right - button.getBoundingClientRect().left;
    this.pickerAlignEnd.set(available < PICKER_WIDTH);
  }

  hoverCell(rows: number, columns: number): void {
    this.hoverRows.set(rows);
    this.hoverColumns.set(columns);
  }

  /** Insert the size highlighted in the hover grid. */
  insertPickedTable(rows: number, columns: number): void {
    this.tableRows.set(rows);
    this.tableColumns.set(columns);
    this.insertTable();
  }

  /** Insert the size typed into the row/column inputs. */
  insertTable(): void {
    const rows = this.clampRows(this.tableRows());
    const columns = this.clampColumns(this.tableColumns());
    this.tableRows.set(rows);
    this.tableColumns.set(columns);
    this.showTablePicker.set(false);
    this.withRestoredSelection(() =>
      this.editor().commands.insertTable(rows, columns, { header: this.tableHeader() }),
    );
  }

  setTableRows(value: number | string): void {
    this.tableRows.set(this.clampRows(Number(value)));
  }

  setTableColumns(value: number | string): void {
    this.tableColumns.set(this.clampColumns(Number(value)));
  }

  addTableRow(where: 'above' | 'below'): void {
    this.run(() => this.editor().commands.insertTableRow(where));
  }

  addTableColumn(where: 'before' | 'after'): void {
    this.run(() => this.editor().commands.insertTableColumn(where));
  }

  removeTableRow(): void {
    this.run(() => this.editor().commands.deleteTableRow());
  }

  removeTableColumn(): void {
    this.run(() => this.editor().commands.deleteTableColumn());
  }

  removeTable(): void {
    this.run(() => this.editor().commands.deleteTable());
  }

  private clampRows(value: number): number {
    return this.clamp(value, this.tableConfig.maxRows);
  }

  private clampColumns(value: number): number {
    return this.clamp(value, this.tableConfig.maxColumns);
  }

  private clamp(value: number, max: number): number {
    if (!Number.isFinite(value)) {
      return 1;
    }
    return Math.min(Math.max(Math.floor(value), 1), max);
  }

  toggleSource(): void {
    this.editor().toggleSourceView();
  }

  toggleFullscreen(): void {
    this.editor().toggleFullscreen();
  }

  onToolbarKeydown(event: KeyboardEvent): void {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') {
      return;
    }
    const buttons = Array.from(
      (event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>(
        'button:not([disabled]), select',
      ),
    );
    const idx = buttons.indexOf(event.target as HTMLElement);
    if (idx < 0) {
      return;
    }
    event.preventDefault();
    const next =
      event.key === 'ArrowRight'
        ? buttons[(idx + 1) % buttons.length]
        : buttons[(idx - 1 + buttons.length) % buttons.length];
    next.focus();
  }
}

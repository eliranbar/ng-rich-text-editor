import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  AfterViewInit,
  booleanAttribute,
  computed,
  effect,
  forwardRef,
  inject,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { firstValueFrom, isObservable, Observable } from 'rxjs';
import { RTE_CONFIG, ToolbarItem } from '../config/tokens';
import { RTE_FEATURES } from '../config/features';
import { RteToolbarComponent } from '../toolbar/toolbar.component';
import { FeatureGateService } from '../license/feature-gate.service';
import { SelectionService, SelectionState } from '../core/selection.service';
import { CommandService } from '../core/command.service';
import { HistoryService } from '../core/history.service';
import { HtmlSerializer } from '../core/serializer';
import { cleanPastedHtml } from '../core/paste';
import { isEditorEmpty, normalizeEmptyEditor } from '../core/dom-utils';
import { sanitizeHtml } from '../core/sanitizer';

/**
 * The whole editor: toolbar + editable surface in a single tag.
 *
 * @example
 * ```html
 * <!-- Free: signal / two-way model -->
 * <ngx-rte [(value)]="html" placeholder="Type here…" />
 *
 * <!-- Premium: reactive forms -->
 * <ngx-rte [formControl]="body" />
 * ```
 */
@Component({
  selector: 'ngx-rte',
  standalone: true,
  imports: [RteToolbarComponent],
  templateUrl: './editor.component.html',
  styleUrl: './editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    SelectionService,
    CommandService,
    HistoryService,
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RteEditorComponent),
      multi: true,
    },
  ],
  host: {
    class: 'ngx-rte',
    '[class.ngx-rte--disabled]': 'isDisabled()',
    '[class.ngx-rte--empty]': 'empty()',
    '[class.ngx-rte--fullscreen]': 'fullscreen()',
    '[class.ngx-rte--fullscreen-wrapped]': 'fullscreen() && wrapped()',
    '[class.ngx-rte--toolbar]': 'showToolbar()',
    '[class.ngx-rte--dark]': 'theme() === "dark"',
    '[attr.aria-disabled]': 'isDisabled() ? "true" : null',
  },
})
export class RteEditorComponent implements ControlValueAccessor, AfterViewInit, OnDestroy {
  /** Signal-based editor value. Supports two-way binding with `[(value)]`. */
  readonly value = model('');
  readonly placeholder = input('Type here...');
  /** Disable editing from the template. Also honors `FormControl.disable()`. */
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly minHeight = input('160px');
  /** Default writing direction for the editable surface (`ltr` or `rtl`). */
  readonly dir = input<'ltr' | 'rtl'>('ltr');
  /** Render the built-in toolbar. Set to `false` for an editable surface only. */
  readonly showToolbar = input(true, { transform: booleanAttribute });
  /** Toolbar layout override; falls back to the `toolbar` config, then the default set. */
  readonly toolbarItems = input<ToolbarItem[] | null>(null);
  readonly theme = input<'light' | 'dark'>('light');
  readonly editable = viewChild<ElementRef<HTMLElement>>('editable');

  /** Handed to the built-in toolbar, which takes the editor it controls as an input. */
  readonly self = this;

  readonly contentChange = output<string>();
  readonly focused = output<void>();
  readonly blurred = output<void>();
  readonly imageUploadError = output<unknown>();
  readonly imageRequest = output<File>();
  readonly selectionStateChange = output<SelectionState>();

  readonly empty = signal(true);
  readonly fullscreen = signal(false);
  /** True when a wrapper card handles the fullscreen layout instead of this host. */
  readonly wrapped = signal(false);
  readonly sourceMode = signal(false);
  readonly sourceHtml = signal('');
  readonly wordCount = signal(0);
  readonly charCount = signal(0);

  /** Combined template + FormControl disabled state. */
  readonly isDisabled = computed(() => this.disabled() || this.cvaDisabled());

  private readonly hostRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly config = inject(RTE_CONFIG);
  readonly features = inject(FeatureGateService, { optional: true });
  readonly selection = inject(SelectionService);
  readonly commands = inject(CommandService);
  private readonly history = inject(HistoryService);
  private readonly serializer = new HtmlSerializer();

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;
  private selectionListener: (() => void) | null = null;
  private writing = false;
  private pendingValue: string | null = null;
  private viewReady = false;
  private featuresReady = false;
  private usingControlValueAccessor = false;
  private cvaRequested = false;
  private formControlWarned = false;
  private pendingOnChange: ((value: string) => void) | null = null;
  private pendingOnTouched: (() => void) | null = null;
  private pendingDisabled: boolean | null = null;
  private readonly cvaDisabled = signal(false);

  constructor() {
    effect(() => {
      const value = this.value();
      if (!this.usingControlValueAccessor && (!this.viewReady || value !== this.getHtml())) {
        this.writeValue(value);
      }
    });
  }

  async ngAfterViewInit(): Promise<void> {
    await this.features?.init();
    this.featuresReady = true;

    const root = this.editable()?.nativeElement;
    if (!root) {
      this.applyControlValueAccessor();
      return;
    }
    this.selection.attach(root);
    this.commands.onChange(() => this.emitContent());
    this.viewReady = true;
    if (this.pendingValue !== null) {
      this.serializer.deserialize(this.pendingValue, root);
      this.pendingValue = null;
    } else {
      normalizeEmptyEditor(root);
    }
    // Attach after the initial value is written so the first undo step is the
    // starting content rather than an empty editor.
    this.history.attach(root);
    this.empty.set(isEditorEmpty(root));
    this.updateCounts();

    this.selectionListener = () => {
      const state = this.selection.getState();
      this.selectionStateChange.emit(state);
    };
    document.addEventListener('selectionchange', this.selectionListener);

    // Unlock FormControl after the surface is ready so the initial sync is accurate.
    this.applyControlValueAccessor();
  }

  ngOnDestroy(): void {
    if (this.selectionListener) {
      document.removeEventListener('selectionchange', this.selectionListener);
    }
  }

  writeValue(value: string | null): void {
    const next = value ?? '';
    const root = this.editable()?.nativeElement;
    if (!root || !this.viewReady) {
      this.pendingValue = next;
      this.syncValueModel(next);
      return;
    }
    this.writing = true;
    this.serializer.deserialize(next, root);
    this.empty.set(isEditorEmpty(root));
    this.updateCounts();
    // Keep the model in sync with what FormControl / writeValue applied
    // (empty markup normalizes to '').
    this.syncValueModel(this.serializer.serialize(root));
    this.writing = false;
  }

  registerOnChange(fn: (value: string) => void): void {
    this.cvaRequested = true;
    this.pendingOnChange = fn;
    this.applyControlValueAccessor();
  }

  registerOnTouched(fn: () => void): void {
    this.cvaRequested = true;
    this.pendingOnTouched = fn;
    this.applyControlValueAccessor();
  }

  setDisabledState(isDisabled: boolean): void {
    this.pendingDisabled = isDisabled;
    if (this.usingControlValueAccessor) {
      this.cvaDisabled.set(isDisabled);
    }
  }

  /** Premium `reactiveForms` unlocks FormControl / ngModel; `[(value)]` is always free. */
  private isReactiveFormsEnabled(): boolean {
    return !!this.features?.isEnabled(RTE_FEATURES.reactiveForms);
  }

  private applyControlValueAccessor(): void {
    if (!this.featuresReady || !this.cvaRequested) {
      return;
    }

    if (!this.isReactiveFormsEnabled()) {
      if (!this.formControlWarned) {
        console.warn(
          '[ngx-richtext] FormControl / ngModel binding is a premium feature. ' +
            'Use [(value)] on the free tier, or unlock with a license (feature: reactiveForms).',
        );
        this.formControlWarned = true;
      }
      this.usingControlValueAccessor = false;
      this.onChange = () => undefined;
      this.onTouched = () => undefined;
      this.cvaDisabled.set(false);
      return;
    }

    this.usingControlValueAccessor = true;
    if (this.pendingOnChange) {
      this.onChange = this.pendingOnChange;
      if (this.viewReady) {
        // Sync after late unlock so the control isn't left on a stale value.
        this.onChange(this.getHtml());
      }
    }
    if (this.pendingOnTouched) {
      this.onTouched = this.pendingOnTouched;
    }
    if (this.pendingDisabled !== null) {
      this.cvaDisabled.set(this.pendingDisabled);
    }
  }

  onInput(): void {
    if (this.writing) {
      return;
    }
    this.history.scheduleCheckpoint();
    this.emitContent();
  }

  onFocus(): void {
    this.focused.emit();
  }

  onBlur(): void {
    this.onTouched();
    this.blurred.emit();
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const clipboard = event.clipboardData;
    if (!clipboard) {
      return;
    }

    const files = Array.from(clipboard.files ?? []).filter((f) =>
      f.type.startsWith('image/'),
    );
    if (files.length) {
      for (const file of files) {
        void this.uploadImage(file);
      }
      return;
    }

    const html = clipboard.getData('text/html');
    const text = clipboard.getData('text/plain');
    const cleaned = cleanPastedHtml(html, text);
    this.commands.insertHtml(cleaned);
  }

  onDrop(event: DragEvent): void {
    const files = Array.from(event.dataTransfer?.files ?? []).filter((f) =>
      f.type.startsWith('image/'),
    );
    if (!files.length) {
      return;
    }
    event.preventDefault();
    for (const file of files) {
      void this.uploadImage(file);
    }
  }

  onDragOver(event: DragEvent): void {
    if (Array.from(event.dataTransfer?.items ?? []).some((i) => i.type.startsWith('image/'))) {
      event.preventDefault();
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    const meta = event.metaKey || event.ctrlKey;
    if (meta && event.key.toLowerCase() === 'b') {
      event.preventDefault();
      this.commands.toggleMark('bold');
      return;
    }
    if (meta && event.key.toLowerCase() === 'i') {
      event.preventDefault();
      this.commands.toggleMark('italic');
      return;
    }
    if (meta && event.key.toLowerCase() === 'u') {
      event.preventDefault();
      this.commands.toggleMark('underline');
      return;
    }
    if (meta && event.key.toLowerCase() === 'z' && !event.shiftKey) {
      event.preventDefault();
      this.commands.undo();
      return;
    }
    if (meta && (event.key.toLowerCase() === 'y' || (event.key.toLowerCase() === 'z' && event.shiftKey))) {
      event.preventDefault();
      this.commands.redo();
      return;
    }
    if (event.key === 'Tab') {
      if (this.commands.handleTab(event.shiftKey)) {
        event.preventDefault();
      }
    }
  }

  onClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.tagName === 'IMG') {
      this.selectImage(target as HTMLImageElement);
    }
  }

  async uploadImage(file: File): Promise<void> {
    const handler = this.config.imageUploadHandler;
    if (!handler) {
      this.imageRequest.emit(file);
      return;
    }

    const id = `rte-img-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const objectUrl = URL.createObjectURL(file);
    this.commands.insertImage(objectUrl, {
      'data-rte-id': id,
      'data-rte-uploading': 'true',
      alt: file.name,
    });

    try {
      const result = handler(file);
      const url = await (isObservable(result)
        ? firstValueFrom(result as Observable<string>)
        : result);
      if (!url) {
        throw new Error('Upload handler returned an empty URL');
      }
      const root = this.editable()?.nativeElement;
      const img = root?.querySelector(`img[data-rte-id="${id}"]`) as HTMLImageElement | null;
      if (img) {
        URL.revokeObjectURL(objectUrl);
        img.src = url;
        img.removeAttribute('data-rte-uploading');
        this.emitContent();
      }
    } catch (err) {
      const root = this.editable()?.nativeElement;
      root?.querySelector(`img[data-rte-id="${id}"]`)?.remove();
      URL.revokeObjectURL(objectUrl);
      this.imageUploadError.emit(err);
      this.emitContent();
    }
  }

  toggleFullscreen(): void {
    const next = !this.fullscreen();
    this.fullscreen.set(next);
    // The built-in toolbar lives inside the host, so expanding the host is
    // enough. With an external toolbar the surrounding card must expand
    // instead, otherwise the editor would cover the toolbar and leave every
    // control unclickable.
    const card = this.showToolbar()
      ? null
      : this.hostRef.nativeElement.closest('.ngx-rte-wrapper');
    card?.classList.toggle('ngx-rte-wrapper--fullscreen', next);
    this.wrapped.set(!!card);
  }

  toggleSourceView(): void {
    const root = this.editable()?.nativeElement;
    if (!root) {
      return;
    }
    if (!this.sourceMode()) {
      this.sourceHtml.set(this.serializer.serialize(root));
      this.sourceMode.set(true);
    } else {
      this.serializer.deserialize(sanitizeHtml(this.sourceHtml()), root);
      this.sourceMode.set(false);
      this.emitContent();
    }
  }

  onSourceInput(value: string): void {
    this.sourceHtml.set(value);
  }

  getHtml(): string {
    const root = this.editable()?.nativeElement;
    return root ? this.serializer.serialize(root) : '';
  }

  private selectImage(img: HTMLImageElement): void {
    const range = document.createRange();
    range.selectNode(img);
    const sel = document.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }

  private emitContent(): void {
    const root = this.editable()?.nativeElement;
    if (!root) {
      return;
    }
    const html = this.serializer.serialize(root);
    this.empty.set(isEditorEmpty(root));
    this.updateCounts();
    this.syncValueModel(html);
    this.onChange(html);
    this.contentChange.emit(html);
  }

  private syncValueModel(html: string): void {
    if (this.value() !== html) {
      this.value.set(html);
    }
  }

  private updateCounts(): void {
    const text = this.editable()?.nativeElement.textContent ?? '';
    const trimmed = text.replace(/\u200b/g, '').trim();
    this.charCount.set(trimmed.length);
    this.wordCount.set(trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0);
  }
}

import { Injectable } from '@angular/core';

@Injectable()
export class HistoryService {
  private undoStack: string[] = [];
  private redoStack: string[] = [];
  private root: HTMLElement | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private lastSnapshot = '';
  private readonly max = 100;

  attach(root: HTMLElement): void {
    this.root = root;
    this.undoStack = [];
    this.redoStack = [];
    this.lastSnapshot = root.innerHTML;
  }

  /** Record immediately (after a command). */
  checkpoint(): void {
    if (!this.root) {
      return;
    }
    const html = this.root.innerHTML;
    if (html === this.lastSnapshot) {
      return;
    }
    this.undoStack.push(this.lastSnapshot);
    if (this.undoStack.length > this.max) {
      this.undoStack.shift();
    }
    this.redoStack = [];
    this.lastSnapshot = html;
  }

  /**
   * Flush any pending debounced typing snapshot. Must run before a command
   * mutates the DOM, otherwise undo would skip past the typed text.
   */
  beginCommand(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.checkpoint();
  }

  /** Debounced recording for typing. */
  scheduleCheckpoint(delay = 400): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.checkpoint();
      this.debounceTimer = null;
    }, delay);
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  undo(): boolean {
    if (!this.root || !this.canUndo()) {
      return false;
    }
    const current = this.root.innerHTML;
    const prev = this.undoStack.pop()!;
    this.redoStack.push(current);
    this.root.innerHTML = prev;
    this.lastSnapshot = prev;
    return true;
  }

  redo(): boolean {
    if (!this.root || !this.canRedo()) {
      return false;
    }
    const current = this.root.innerHTML;
    const next = this.redoStack.pop()!;
    this.undoStack.push(current);
    this.root.innerHTML = next;
    this.lastSnapshot = next;
    return true;
  }
}

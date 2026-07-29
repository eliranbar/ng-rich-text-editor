import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Optional layout wrapper that styles the toolbar + editor as a single card.
 *
 * @example
 * ```html
 * <ngx-rte-wrapper>
 *   <ngx-rte-toolbar [editor]="editor" />
 *   <ngx-rte #editor [(value)]="html" />
 * </ngx-rte-wrapper>
 * ```
 */
@Component({
  selector: 'ngx-rte-wrapper',
  standalone: true,
  template: `<ng-content />`,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      border: 1px solid var(--rte-border, #e4e7ec);
      border-radius: var(--rte-radius, 10px);
      overflow: visible;
      background: var(--rte-surface, #fff);
      box-shadow: var(--rte-shadow, 0 1px 2px rgba(16, 24, 40, 0.04));
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ngx-rte-wrapper',
    '[class.ngx-rte-wrapper--dark]': 'theme() === "dark"',
  },
})
export class RteWrapperComponent {
  readonly theme = input<'light' | 'dark'>('light');
}

import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Layout wrapper that styles an external toolbar + editor as a single card.
 *
 * @deprecated `<ngx-rte>` is a complete card on its own — use it alone:
 * `<ngx-rte [(value)]="html" />`. This wrapper is only needed for the legacy
 * three-tag layout and will be removed in a future major version.
 *
 * @example
 * ```html
 * <ngx-rte-wrapper>
 *   <ngx-rte-toolbar [editor]="editor" />
 *   <ngx-rte #editor showToolbar="false" [(value)]="html" />
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

    /* The editor draws its own card, which would double up inside this one. */
    :host ::ng-deep ngx-rte {
      border: 0;
      border-radius: 0 0 var(--rte-radius, 10px) var(--rte-radius, 10px);
      box-shadow: none;
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

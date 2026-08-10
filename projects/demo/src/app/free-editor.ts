import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';
import {
  FeatureGateService,
  LicenseService,
  RTE_CONFIG,
  RteEditorComponent,
} from 'ngx-richtext';
import { FREE_RTE_CONFIG } from './demo-rte-config';

/**
 * Free-tier editor, for the side-by-side comparison on the demo page.
 *
 * `provideRichTextEditor` installs one application-wide `FeatureGateService`,
 * and this demo licenses it — so every `<ngx-rte>` on the page would otherwise
 * render the premium toolbar and the two demos would look identical. Re-providing
 * the three RTE services here gives this editor its own gate, built from a config
 * with no `licenseKey`: no source-view or fullscreen buttons, no word-count
 * footer, and `[formControl]` refused. Apps don't need any of this — they get one
 * tier and provide it once at the root.
 */
@Component({
  selector: 'demo-free-rte',
  standalone: true,
  imports: [RteEditorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: RTE_CONFIG, useValue: FREE_RTE_CONFIG },
    LicenseService,
    FeatureGateService,
  ],
  template: `
    <ngx-rte
      [theme]="theme()"
      [(value)]="value"
      [placeholder]="placeholder()"
      [minHeight]="minHeight()"
      (imageUploadError)="imageUploadError.emit($event)"
    />
  `,
})
export class FreeRteDemo {
  readonly value = model('');
  readonly theme = input<'light' | 'dark'>('light');
  readonly placeholder = input('Type here…');
  readonly minHeight = input('280px');
  readonly imageUploadError = output<unknown>();
}

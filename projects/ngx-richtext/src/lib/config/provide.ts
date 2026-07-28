import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { RichTextEditorConfig, RTE_CONFIG } from './tokens';
import { LicenseService } from '../license/license.service';
import { FeatureGateService } from '../license/feature-gate.service';

/**
 * Provide ngx-richtext configuration at the application root.
 *
 * @example
 * ```ts
 * provideRichTextEditor({
 *   licenseKey: '....',
 *   imageUploadHandler: (file) => myApi.upload(file),
 * })
 * ```
 */
export function provideRichTextEditor(
  config: RichTextEditorConfig = {},
): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: RTE_CONFIG, useValue: config },
    LicenseService,
    FeatureGateService,
  ]);
}

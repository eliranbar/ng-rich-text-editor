import { delay, of } from 'rxjs';
import { RichTextEditorConfig } from 'ngx-richtext';

/**
 * Demo premium license. Bound to exactly the hosts the demo runs on
 * (ebdev-design.com, www.ebdev-design.com, ngx-richtext.ebdev-design.com,
 * localhost, 127.0.0.1) and expires 2027-08-10, so copying it into another app
 * unlocks nothing.
 *
 * Deliberately *not* `*.ebdev-design.com`: this key ships in a public bundle, and
 * a wildcard would make every current and future demo subdomain a valid host for
 * it. That means every hostname the demo is served from must be listed here —
 * the apex and `www.` are separate hosts and neither is implied by the other.
 * Reissue with:
 *   npm run license -- --licensee "ngx-richtext demo" \
 *     --domains "ebdev-design.com,www.ebdev-design.com,ngx-richtext.ebdev-design.com,localhost,127.0.0.1"
 */
export const DEMO_LICENSE_KEY =
  'eyJwIjoiZXlKd2NtOWtkV04wSWpvaVFHVmlaR1YyTDI1bmVDMXlhV05vZEdWNGRDSXNJbXRwWkNJNkluSjBaUzB5TURJMkxUQTRJaXdpY0d4aGJpSTZJbkJ5WlcxcGRXMGlMQ0ptWldGMGRYSmxjeUk2V3lKcGJXRm5aVkpsYzJsNlpTSXNJbk52ZFhKalpWWnBaWGNpTENKM2IzSmtRMjkxYm5RaUxDSm1kV3hzYzJOeVpXVnVJaXdpY21WaFkzUnBkbVZHYjNKdGN5SmRMQ0prYjIxaGFXNXpJanBiSW1WaVpHVjJMV1JsYzJsbmJpNWpiMjBpTENKM2QzY3VaV0prWlhZdFpHVnphV2R1TG1OdmJTSXNJbTVuZUMxeWFXTm9kR1Y0ZEM1bFltUmxkaTFrWlhOcFoyNHVZMjl0SWl3aWJHOWpZV3hvYjNOMElpd2lNVEkzTGpBdU1DNHhJbDBzSW1WNGNHbHllU0k2SWpJd01qY3RNRGd0TVRBaUxDSnNhV05sYm5ObFpTSTZJbTVuZUMxeWFXTm9kR1Y0ZENCa1pXMXZJbjA9IiwicyI6Ik94S1VOZ0UxZnRsWjZyTXlNRWE2Z2FTbmlNOU1RNEZJS0xUVFRSOVlyTEV1eE96N1NuT0l6SjFqTEJja2hqeHpQU2lRVytxMEQxd3NuK2xDSXp1RkNRPT0ifQ==';

/** Fake upload: hand back a data URL after a short delay. */
function fakeUpload(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      of(reader.result as string)
        .pipe(delay(600))
        .subscribe({ next: resolve, error: reject });
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Everything both demo tiers share. Deliberately has no `licenseKey` — the
 * premium demo adds one, the free demo uses this as-is so it renders exactly
 * what an app without a license sees.
 */
export const FREE_RTE_CONFIG: RichTextEditorConfig = {
  placeholder: 'Start writing…',
  imageUploadHandler: fakeUpload,
};

export const PREMIUM_RTE_CONFIG: RichTextEditorConfig = {
  ...FREE_RTE_CONFIG,
  licenseKey: DEMO_LICENSE_KEY,
};

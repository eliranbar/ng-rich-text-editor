import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { delay, of } from 'rxjs';
import { provideRichTextEditor } from 'ngx-richtext';

/**
 * Demo premium license. Bound to exactly the hosts the demo runs on
 * (ngx-richtext.ebdev-design.com, localhost, 127.0.0.1) and expires 2027-08-05,
 * so copying it into another app unlocks nothing.
 *
 * Deliberately *not* `*.ebdev-design.com`: this key ships in a public bundle, and
 * a wildcard would make every current and future demo subdomain a valid host for
 * it. Reissue with:
 *   npm run license -- --licensee "ngx-richtext demo" \
 *     --domains "ngx-richtext.ebdev-design.com,localhost,127.0.0.1"
 */
const DEMO_LICENSE_KEY =
  'eyJwIjoiZXlKd2NtOWtkV04wSWpvaVFHVmlaR1YyTDI1bmVDMXlhV05vZEdWNGRDSXNJbXRwWkNJNkluSjBaUzB5TURJMkxUQTRJaXdpY0d4aGJpSTZJbkJ5WlcxcGRXMGlMQ0ptWldGMGRYSmxjeUk2V3lKcGJXRm5aVkpsYzJsNlpTSXNJbk52ZFhKalpWWnBaWGNpTENKM2IzSmtRMjkxYm5RaUxDSm1kV3hzYzJOeVpXVnVJaXdpY21WaFkzUnBkbVZHYjNKdGN5SmRMQ0prYjIxaGFXNXpJanBiSW01bmVDMXlhV05vZEdWNGRDNWxZbVJsZGkxa1pYTnBaMjR1WTI5dElpd2liRzlqWVd4b2IzTjBJaXdpTVRJM0xqQXVNQzR4SWwwc0ltVjRjR2x5ZVNJNklqSXdNamN0TURndE1EVWlMQ0pzYVdObGJuTmxaU0k2SW01bmVDMXlhV05vZEdWNGRDQmtaVzF2SW4wPSIsInMiOiJEZUN6eUhQS1l0N1I3QWJqRVNzblY3WXoxVmpEVkNPaHhIU0cyK2J5cE95RlBqMmZGOURyZkFndXNhT2daaENWajdDRHR5RmVDc2kyd3BHQzVwSXlEdz09In0=';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(),
    provideRichTextEditor({
      licenseKey: DEMO_LICENSE_KEY,
      placeholder: 'Start writing…',
      imageUploadHandler: (file: File) => {
        // Fake upload: return a data URL after a short delay
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
      },
    }),
  ],
};

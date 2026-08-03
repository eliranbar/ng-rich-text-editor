import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { delay, of } from 'rxjs';
import { provideRichTextEditor } from 'ngx-richtext';

/**
 * Demo premium license. Bound to the demo hosts (localhost, 127.0.0.1,
 * eliranbar.github.io, *.ebdev-design.com) and expires 2027-08-03, so copying it
 * into another app unlocks nothing. Reissue with:
 *   npm run license -- --licensee "ngx-richtext demo" \
 *     --domains "localhost,127.0.0.1,eliranbar.github.io,*.ebdev-design.com"
 */
const DEMO_LICENSE_KEY =
  'eyJwIjoiZXlKd2JHRnVJam9pY0hKbGJXbDFiU0lzSW1abFlYUjFjbVZ6SWpwYkltbHRZV2RsVW1WemFYcGxJaXdpYzI5MWNtTmxWbWxsZHlJc0luZHZjbVJEYjNWdWRDSXNJbVoxYkd4elkzSmxaVzRpTENKeVpXRmpkR2wyWlVadmNtMXpJbDBzSW1SdmJXRnBibk1pT2xzaWJHOWpZV3hvYjNOMElpd2lNVEkzTGpBdU1DNHhJaXdpWld4cGNtRnVZbUZ5TG1kcGRHaDFZaTVwYnlJc0lpb3VaV0prWlhZdFpHVnphV2R1TG1OdmJTSmRMQ0psZUhCcGNua2lPaUl5TURJM0xUQTRMVEF6SWl3aWJHbGpaVzV6WldVaU9pSnVaM2d0Y21samFIUmxlSFFnWkdWdGJ5SjkiLCJzIjoic0tlbFJQVU1uR0QxUUZVOEg1NkZIanJRdm1aM2NRdk11L1h6VGVnOVppeVdqMSs3TDAyU3FibDFJMWlVL3VNTkw4TzQyVWIzdS9QRlF4NmxCNkhuQkE9PSJ9';

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

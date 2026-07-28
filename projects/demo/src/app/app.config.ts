import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { delay, of } from 'rxjs';
import { provideRichTextEditor } from 'ngx-richtext';

/** Demo premium license (signed with the repo's tools/license-private.key). Expires 2099. */
const DEMO_LICENSE_KEY =
  'eyJwIjoiZXlKd2JHRnVJam9pY0hKbGJXbDFiU0lzSW1abFlYUjFjbVZ6SWpwYkluUmxlSFJEYjJ4dmNpSXNJbUpoWTJ0bmNtOTFibVJEYjJ4dmNpSXNJbWx0WVdkbFVtVnphWHBsSWl3aWRHRmliR1Z6SWl3aWMyOTFjbU5sVm1sbGR5SXNJbmR2Y21SRGIzVnVkQ0lzSW1aMWJHeHpZM0psWlc0aVhTd2laWGh3YVhKNUlqb2lNakE1T1MweE1pMHpNU0lzSW14cFkyVnVjMlZsSWpvaVpHVnRiMEJsZUdGdGNHeGxMbU52YlNKOSIsInMiOiJsVDVDamRLdkpHWU5jenBCOWVYc1R1bkErSGxZR09RRi95S3Fuc1hJbFhyWnFoSit0dDhkRnhOYUNNcGZtRkJVUUdUajRVM2RuQkd1NTk2N2U2bWpEdz09In0=';

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

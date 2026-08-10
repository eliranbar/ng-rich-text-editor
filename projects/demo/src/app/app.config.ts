import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRichTextEditor } from 'ngx-richtext';
import { PREMIUM_RTE_CONFIG } from './demo-rte-config';

/**
 * The page is licensed at the root, which is what a premium app does. The free
 * demo opts back out with its own unlicensed injector — see `FreeRteDemo`.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(),
    provideRichTextEditor(PREMIUM_RTE_CONFIG),
  ],
};

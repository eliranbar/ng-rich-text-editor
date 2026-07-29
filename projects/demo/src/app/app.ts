import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  RteEditorComponent,
  RteToolbarComponent,
  RteWrapperComponent,
} from 'ngx-richtext';

export interface FeatureCard {
  title: string;
  description: string;
  icon: string;
  premium?: boolean;
}

export interface QuickStartStep {
  title: string;
  description: string;
  code: string;
  lang: string;
}

@Component({
  selector: 'app-root',
  imports: [FormsModule, RteEditorComponent, RteToolbarComponent, RteWrapperComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly dark = signal(false);
  readonly showHtml = signal(false);

  html = `<p>Welcome to <strong>ngx-richtext</strong> — a professional Angular rich text editor.</p>
<ul>
  <li>Format with the toolbar above</li>
  <li>Paste from Word / Docs</li>
  <li>Drop or insert images (uploaded by the host app)</li>
</ul>
<p dir="rtl">עברית: לחצו על <strong>RTL</strong> בסרגל הכלים כדי לערוך מימין לשמאל.</p>`;

  readonly badges = ['Angular 21+', 'MIT License', 'Zero config', 'Forms-ready'];

  readonly highlights = [
    {
      title: 'Sanitized HTML',
      description: 'Safe output ready for ngModel and reactive forms — no custom serializers.',
    },
    {
      title: 'Host-owned uploads',
      description: 'You control image storage. The editor never talks to a remote server.',
    },
    {
      title: 'Offline licenses',
      description: 'Premium unlocks via Ed25519-signed keys. No license server required.',
    },
    {
      title: 'Tree-shakable',
      description: 'Premium modules ship as secondary entry points — free apps stay lean.',
    },
  ];

  readonly quickStart: QuickStartStep[] = [
    {
      title: 'Install',
      description: 'Add the package and import styles once in your global stylesheet.',
      lang: 'bash',
      code: `npm install ngx-richtext

/* styles.css */
@import 'ngx-richtext/styles.css';`,
    },
    {
      title: 'Provide',
      description: 'One provider call. Optional license and image upload handler.',
      lang: 'ts',
      code: `import { provideRichTextEditor } from 'ngx-richtext';

export const appConfig = {
  providers: [
    provideRichTextEditor({
      // licenseKey: '...',
      imageUploadHandler: (file) => myApi.upload(file),
    }),
  ],
};`,
    },
    {
      title: 'Drop in',
      description: 'Three tags. That\'s the whole editor — toolbar, surface, done.',
      lang: 'html',
      code: `<ngx-rte-wrapper>
  <ngx-rte-toolbar [editor]="editor" />
  <ngx-rte #editor [(ngModel)]="html"
            placeholder="Type here…" />
</ngx-rte-wrapper>`,
    },
  ];

  readonly features: FeatureCard[] = [
    {
      icon: 'B',
      title: 'Rich formatting',
      description: 'Bold, italic, underline, strike — the essentials that just work.',
    },
    {
      icon: 'H',
      title: 'Structure',
      description: 'Headings, lists, alignment, and clear formatting in one toolbar.',
    },
    {
      icon: '↔',
      title: 'RTL & LTR',
      description: 'First-class Hebrew and Arabic support with per-block direction.',
    },
    {
      icon: '🔗',
      title: 'Links & images',
      description: 'Insert links and images. Paste or drop — your upload handler takes over.',
    },
    {
      icon: '↩',
      title: 'Undo / redo',
      description: 'Reliable history so users can experiment without fear.',
    },
    {
      icon: '🎨',
      title: 'Colors',
      description: 'Text and highlight colors for polished documents.',
      premium: true,
    },
    {
      icon: '▦',
      title: 'Smart tables',
      description: 'Hover-grid picker, exact sizes, header rows, and post-insert edits.',
      premium: true,
    },
    {
      icon: '</>',
      title: 'HTML source',
      description: 'Inspect and tweak the sanitized markup when you need full control.',
      premium: true,
    },
    {
      icon: 'Σ',
      title: 'Word count',
      description: 'Live word and character counters for writing goals.',
      premium: true,
    },
    {
      icon: '⛶',
      title: 'Fullscreen',
      description: 'Focus mode that expands the editor to the whole viewport.',
      premium: true,
    },
    {
      icon: '⇔',
      title: 'Image resize',
      description: 'Drag handles to resize images without leaving the document.',
      premium: true,
    },
    {
      icon: '◐',
      title: 'Theming',
      description: 'CSS variables and light/dark themes. Match your design system in minutes.',
    },
  ];

  onImageError(err: unknown): void {
    console.error('Image upload failed', err);
    alert('Image upload failed. See console for details.');
  }

  scrollTo(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  RteEditorComponent,
  RteToolbarComponent,
  RteWrapperComponent,
} from 'ngx-richtext';

@Component({
  selector: 'app-root',
  imports: [FormsModule, RteEditorComponent, RteToolbarComponent, RteWrapperComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly dark = signal(false);
  html = `<p>Welcome to <strong>ngx-richtext</strong> — a professional Angular rich text editor.</p>
<ul>
  <li>Format with the toolbar above</li>
  <li>Paste from Word / Docs</li>
  <li>Drop or insert images (uploaded by the host app)</li>
</ul>
<p dir="rtl">עברית: לחצו על <strong>RTL</strong> בסרגל הכלים כדי לערוך מימין לשמאל.</p>`;

  onImageError(err: unknown): void {
    console.error('Image upload failed', err);
    alert('Image upload failed. See console for details.');
  }
}

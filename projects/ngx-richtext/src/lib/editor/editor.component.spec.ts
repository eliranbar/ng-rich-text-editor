import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { describe, it, expect, beforeEach } from 'vitest';
import { RteEditorComponent } from './editor.component';
import { provideRichTextEditor } from '../config/provide';

describe('RteEditorComponent', () => {
  let fixture: ComponentFixture<RteEditorComponent>;
  let component: RteEditorComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RteEditorComponent, FormsModule],
      providers: [provideRichTextEditor({})],
    }).compileComponents();

    fixture = TestBed.createComponent(RteEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should write and emit HTML via CVA', async () => {
    let emitted = '';
    component.registerOnChange((v) => (emitted = v));
    component.writeValue('<p>Hello</p>');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.getHtml()).toContain('Hello');

    // Simulate user input
    const el = fixture.nativeElement.querySelector('.ngx-rte__content') as HTMLElement;
    el.innerHTML = '<p><strong>Bold</strong></p>';
    el.dispatchEvent(new Event('input'));
    expect(emitted).toContain('strong');
  });
});

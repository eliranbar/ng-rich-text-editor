import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { RteEditorComponent } from './editor.component';
import { provideRichTextEditor } from '../config/provide';

describe('RteEditorComponent', () => {
  let fixture: ComponentFixture<RteEditorComponent>;
  let component: RteEditorComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RteEditorComponent],
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

  it('should render the toolbar by default', () => {
    expect(fixture.nativeElement.querySelector('ngx-rte-toolbar')).toBeTruthy();
  });

  it('should hide the toolbar when showToolbar is false', async () => {
    fixture.componentRef.setInput('showToolbar', false);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('ngx-rte-toolbar')).toBeNull();
    expect(fixture.nativeElement.querySelector('.ngx-rte__content')).toBeTruthy();
  });

  it('should treat the string "false" as off, so showToolbar="false" works', async () => {
    fixture.componentRef.setInput('showToolbar', 'false');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.showToolbar()).toBe(false);
    expect(fixture.nativeElement.querySelector('ngx-rte-toolbar')).toBeNull();
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
    expect(component.value()).toContain('strong');
  });
});

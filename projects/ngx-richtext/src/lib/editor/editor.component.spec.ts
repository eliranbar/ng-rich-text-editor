import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RteEditorComponent } from './editor.component';
import { provideRichTextEditor } from '../config/provide';
import { RTE_FEATURES } from '../config/features';

@Component({
  standalone: true,
  imports: [RteEditorComponent, ReactiveFormsModule],
  template: `<ngx-rte [formControl]="control" />`,
})
class FormHostComponent {
  readonly control = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });
}

describe('RteEditorComponent', () => {
  let fixture: ComponentFixture<RteEditorComponent>;
  let component: RteEditorComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RteEditorComponent, FormHostComponent],
      providers: [
        provideRichTextEditor({
          extraFeatures: [RTE_FEATURES.reactiveForms],
        }),
      ],
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

  it('should write and emit HTML via the value model (free)', async () => {
    fixture.componentRef.setInput('value', '<p>Hello</p>');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.getHtml()).toContain('Hello');

    const el = fixture.nativeElement.querySelector('.ngx-rte__content') as HTMLElement;
    el.innerHTML = '<p><strong>Bold</strong></p>';
    el.dispatchEvent(new Event('input'));
    expect(component.value()).toContain('strong');
  });

  it('should write and emit HTML via CVA when reactiveForms is unlocked', async () => {
    let emitted = '';
    component.registerOnChange((v) => (emitted = v));
    // Features already inited in beforeEach; re-apply after registering.
    await fixture.whenStable();
    component.writeValue('<p>Hello</p>');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.getHtml()).toContain('Hello');

    const el = fixture.nativeElement.querySelector('.ngx-rte__content') as HTMLElement;
    el.innerHTML = '<p><strong>Bold</strong></p>';
    el.dispatchEvent(new Event('input'));
    expect(emitted).toContain('strong');
    expect(component.value()).toContain('strong');
  });

  it('should honor FormControl.disable() via setDisabledState', async () => {
    component.registerOnChange(() => undefined);
    await fixture.whenStable();
    component.setDisabledState(true);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.isDisabled()).toBe(true);
    expect(fixture.nativeElement.classList.contains('ngx-rte--disabled')).toBe(true);
    const el = fixture.nativeElement.querySelector('.ngx-rte__content') as HTMLElement;
    expect(el.getAttribute('contenteditable')).toBe('false');

    component.setDisabledState(false);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.isDisabled()).toBe(false);
    expect(el.getAttribute('contenteditable')).toBe('true');
  });

  it('should work with FormControl validators (required) when premium', async () => {
    const host = TestBed.createComponent(FormHostComponent);
    host.detectChanges();
    await host.whenStable();

    const control = host.componentInstance.control;
    expect(control.invalid).toBe(true);
    expect(control.hasError('required')).toBe(true);

    control.setValue('<p>Hello</p>');
    host.detectChanges();
    await host.whenStable();
    expect(control.valid).toBe(true);

    const el = host.nativeElement.querySelector('.ngx-rte__content') as HTMLElement;
    el.innerHTML = '<p><br></p>';
    el.dispatchEvent(new Event('input'));
    host.detectChanges();
    expect(control.value).toBe('');
    expect(control.hasError('required')).toBe(true);

    el.dispatchEvent(new Event('blur'));
    host.detectChanges();
    expect(control.touched).toBe(true);
    expect(host.nativeElement.querySelector('ngx-rte').classList.contains('ng-invalid')).toBe(
      true,
    );
  });
});

describe('RteEditorComponent FormControl premium gate', () => {
  it('keeps [(value)] working and does not wire FormControl without reactiveForms', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [RteEditorComponent, FormHostComponent],
      providers: [provideRichTextEditor({})],
    }).compileComponents();

    const host = TestBed.createComponent(FormHostComponent);
    host.detectChanges();
    await host.whenStable();
    // async ngAfterViewInit awaits license/feature init before applying the gate
    await new Promise((r) => setTimeout(r, 50));
    host.detectChanges();
    await host.whenStable();

    expect(
      warn.mock.calls.some((args) => String(args[0] ?? '').includes('premium feature')),
    ).toBe(true);

    const control = host.componentInstance.control;
    const el = host.nativeElement.querySelector('.ngx-rte__content') as HTMLElement;
    el.innerHTML = '<p><strong>Bold</strong></p>';
    el.dispatchEvent(new Event('input'));
    host.detectChanges();

    // Without the premium unlock, edits must not push into the FormControl.
    expect(control.value).toBe('');

    warn.mockRestore();
  });
});

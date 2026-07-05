import { Component, ElementRef, AfterViewInit, OnDestroy, ViewChild, forwardRef, Input } from '@angular/core';
import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import Quill from 'quill';

@Component({
  selector: 'app-html-editor',
  standalone: true,
  templateUrl: './html-editor.html',
  styleUrl: './html-editor.scss',
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => HtmlEditorComponent),
    multi: true,
  }],
})
export class HtmlEditorComponent implements AfterViewInit, OnDestroy, ControlValueAccessor {
  @ViewChild('editorHost', { static: true }) editorHost!: ElementRef<HTMLDivElement>;
  @Input() placeholder = 'Escribe el contenido de la publicación...';

  private quill?: Quill;
  private pendingValue = '';
  private disabled = false;
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  ngAfterViewInit() {
    this.quill = new Quill(this.editorHost.nativeElement, {
      theme: 'snow',
      placeholder: this.placeholder,
      modules: {
        toolbar: [
          [{ header: [2, 3, false] }],
          ['bold', 'italic', 'underline'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['link'],
          ['clean'],
        ],
      },
    });

    if (this.pendingValue) this.quill.root.innerHTML = this.pendingValue;
    this.quill.enable(!this.disabled);

    this.quill.on('text-change', () => {
      this.onChange(this.quill!.root.innerHTML);
    });
    this.quill.root.addEventListener('blur', () => this.onTouched());
  }

  ngOnDestroy() {
    this.quill?.off('text-change');
  }

  // ── ControlValueAccessor ──────────────────────────────────────
  writeValue(value: string): void {
    this.pendingValue = value || '';
    if (this.quill) this.quill.root.innerHTML = this.pendingValue;
  }

  registerOnChange(fn: (value: string) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    this.quill?.enable(!isDisabled);
  }
}

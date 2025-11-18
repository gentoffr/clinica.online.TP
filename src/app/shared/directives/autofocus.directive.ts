import { AfterViewInit, Directive, ElementRef, Input } from '@angular/core';

@Directive({
  selector: '[appAutofocus]',
  standalone: true,
})
export class AutofocusDirective implements AfterViewInit {
  private _delay = 0;

  @Input('appAutofocus')
  set delay(value: number | string) {
    const parsed = Number(value);
    this._delay = Number.isFinite(parsed) ? parsed : 0;
  }

  get delay(): number {
    return this._delay;
  }

  constructor(private elementRef: ElementRef<HTMLElement>) {}

  ngAfterViewInit(): void {
    const ms = this.delay || 0;
    window.setTimeout(() => {
      try {
        this.elementRef.nativeElement?.focus();
      } catch {}
    }, ms);
  }
}

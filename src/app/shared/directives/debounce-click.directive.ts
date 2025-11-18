import { Directive, EventEmitter, HostListener, Input, OnDestroy, Output } from '@angular/core';

@Directive({
  selector: '[appDebounceClick]',
  standalone: true,
})
export class DebounceClickDirective implements OnDestroy {
  private _debounceTime = 300;

  @Input('appDebounceClick')
  set debounceTime(value: number | string) {
    const parsed = Number(value);
    this._debounceTime = Number.isFinite(parsed) ? parsed : 300;
  }

  get debounceTime(): number {
    return this._debounceTime;
  }
  @Output() debounceClick = new EventEmitter<Event>();

  private timeoutId: number | null = null;

  @HostListener('click', ['$event'])
  handleClick(event: Event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (this.timeoutId) window.clearTimeout(this.timeoutId);
    this.timeoutId = window.setTimeout(() => {
      this.debounceClick.emit(event);
      this.timeoutId = null;
    }, Math.max(0, this.debounceTime || 0));
  }

  ngOnDestroy(): void {
    if (this.timeoutId) {
      window.clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}

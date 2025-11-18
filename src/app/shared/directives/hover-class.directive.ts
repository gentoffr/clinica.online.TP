import { Directive, ElementRef, HostListener, Input, Renderer2 } from '@angular/core';

@Directive({
  selector: '[appHoverClass]',
  standalone: true,
})
export class HoverClassDirective {
  @Input('appHoverClass') hoverClass = 'is-hovering';

  constructor(private el: ElementRef<HTMLElement>, private renderer: Renderer2) {}

  @HostListener('mouseenter')
  onEnter() {
    this.renderer.addClass(this.el.nativeElement, this.hoverClass);
  }

  @HostListener('mouseleave')
  onLeave() {
    this.renderer.removeClass(this.el.nativeElement, this.hoverClass);
  }
}

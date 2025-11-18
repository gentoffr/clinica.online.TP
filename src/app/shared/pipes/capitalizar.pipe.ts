import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'capitalizar',
  standalone: true,
})
export class CapitalizarPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '';
    return value
      .split(' ')
      .map((word) => this.capitalizarPalabra(word))
      .join(' ');
  }

  private capitalizarPalabra(word: string) {
    if (!word.length) return word;
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }
}

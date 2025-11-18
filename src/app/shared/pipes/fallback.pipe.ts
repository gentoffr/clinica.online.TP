import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'fallback',
  standalone: true,
})
export class FallbackPipe implements PipeTransform {
  transform(value: unknown, fallback = 'Sin datos'): string {
    if (value === null || value === undefined) return fallback;
    const str = String(value).trim();
    return str || fallback;
  }
}

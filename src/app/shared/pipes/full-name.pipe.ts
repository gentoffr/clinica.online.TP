import { Pipe, PipeTransform } from '@angular/core';

type Persona = {
  nombre?: string | null;
  apellido?: string | null;
};

@Pipe({
  name: 'fullName',
  standalone: true,
})
export class FullNamePipe implements PipeTransform {
  transform(value: Persona | null | undefined, fallback = 'Sin nombre'): string {
    if (!value) return fallback;
    const nombre = (value.nombre ?? '').trim();
    const apellido = (value.apellido ?? '').trim();
    const joined = [nombre, apellido].filter(Boolean).join(' ').trim();
    return joined || fallback;
  }
}

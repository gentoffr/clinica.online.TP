import { Pipe, PipeTransform } from '@angular/core';

const ESTADOS: Record<string, string> = {
  pendiente: 'Pendiente',
  confirmado: 'Confirmado',
  cancelado: 'Cancelado',
  rechazado: 'Rechazado',
  completado: 'Completado',
  archivado: 'Archivado',
};

@Pipe({
  name: 'estadoTurno',
  standalone: true,
})
export class EstadoTurnoPipe implements PipeTransform {
  transform(value: string | null | undefined, fallback = 'Sin estado'): string {
    if (!value) return fallback;
    const key = String(value).toLowerCase();
    return ESTADOS[key] ?? fallback;
  }
}

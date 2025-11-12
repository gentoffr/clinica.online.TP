import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-perfil-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './perfil-modal.html',
  styleUrl: './perfil-modal.scss'
})
export class PerfilModalComponent {
  @Input() user: any;
  @Output() close = new EventEmitter<void>();

  get nombre(): string {
    const n = this.user?.nombre || '';
    const a = this.user?.apellido || '';
    return `${n} ${a}`.trim() || (this.user?.email ?? 'Usuario');
  }
  get email(): string { return this.user?.email || ''; }
  get avatar(): string | null {
    return this.user.imagen_perfil[0];
  }
  get inicialNombre(): string { return (this.nombre?.charAt(0) || '?').toUpperCase(); }
}


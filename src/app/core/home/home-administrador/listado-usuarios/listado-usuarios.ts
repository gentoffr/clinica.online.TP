// listado-usuarios.component.ts
import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UsuarioService } from '../../../../services/usuario.service';
import { FormsModule } from '@angular/forms';
type Usuario = {
  id: string;
  nombre?: string;
  apellido?: string;
  email?: string;
  foto_url?: string;
};

@Component({
  selector: 'app-listado-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './listado-usuarios.html',
  styleUrls: ['./listado-usuarios.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListadoUsuarios implements OnInit {
  usuarios: any[] = [];
  cargando = true;
  error = '';
  seleccionado: any | null = null;
  modalAbierto = false;

  constructor(private usuarioService: UsuarioService, private cdr: ChangeDetectorRef) {}

  trackById = (_: number, u: any) => u.id;

  async ngOnInit() {
    try {
      this.usuarios = await this.cargarUsuarios();
      console.log('[ListadoUsuarios] Usuarios cargados:', this.usuarios);
      this.cargando = false;
    } catch (e: any) {
      this.error = e?.message ?? 'Error al cargar usuarios';
    } finally {
      this.cargando = false;
      this.cdr.markForCheck();
    }
  }
  async cargarUsuarios() {
    const raw = await this.usuarioService.obtenerTodosLosUsuarios();
    for (const user of raw) {
    if (user.admin === true) {
      user.rol = 'Administrador';
    } else if (user.especialidad) {
      user.rol = "Medico";
    } else {
      user.rol = 'Paciente';
    }
  }

  return raw
  }
  
  abrirModal(u: any) {
    this.seleccionado = u;
    this.modalAbierto = true;
    this.cdr.markForCheck();
  }

  cerrarModal() {
    this.modalAbierto = false;
    this.seleccionado = null;
    this.cdr.markForCheck();
  }
  
  exportarExcel() {
    try {
      const headers = [
        'id',
        'nombre',
        'apellido',
        'email',
        'edad',
        'dni',
        'obra_social',
        'especialidad',
        'admin',
        'rol',
        'imagen_perfil'
      ];
      const rows = this.usuarios.map(u => [
        u.id ?? '',
        u.nombre ?? '',
        u.apellido ?? '',
        u.email ?? '',
        u.edad ?? '',
        u.dni ?? '',
        u.obra_social ?? '',
        u.especialidad ?? '',
        u.admin === true ? 'si' : 'no',
        u.rol ?? '',
        Array.isArray(u.imagen_perfil) ? u.imagen_perfil.join(' ') : (u.imagen_perfil ?? '')
      ]);

      const escape = (v: any) => {
        const s = String(v ?? '');
        if (s.includes('"') || s.includes(';') || s.includes('\n')) {
          return '"' + s.replace(/"/g, '""') + '"';
        }
        return s;
      };

      const csv = [headers.join(';'), ...rows.map(r => r.map(escape).join(';'))].join('\n');
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'usuarios.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('No se pudo exportar CSV', e);
    }
  }
  
}

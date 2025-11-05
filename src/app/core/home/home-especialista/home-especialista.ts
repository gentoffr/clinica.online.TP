// home-paciente.component.ts
import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth.service';
import { TurnoService } from '../../../services/turno.service';
import { UsuarioService } from '../../../services/usuario.service';
import { ToastService } from '../../../services/toast.service';
import { RegistroTurno } from '../registro-turno/registro-turno';
import { Router } from '@angular/router';
import { ListadoTurnos } from '../home-paciente/listado-turnos/listado-turnos';
type AdminUser = {
  nombre: any;
  email: any;
  avatarUrl: any | any[];
};

@Component({
  selector: 'app-home-paciente',
  standalone: true,
  imports: [CommonModule, RegistroTurno, ListadoTurnos],
  templateUrl: './home-especialista.html',
  styleUrls: ['./home-especialista.scss'],
})
export class HomeEspecialista implements OnInit {
  @ViewChild(RegistroTurno) registroTurno!: RegistroTurno;
  menuCollapsed = false;
  user!: any;
  sacandoTurno = false;
  avatarCargando = true;
  constructor(
    public authService: AuthService,
    private router: Router,
    private turnoService: TurnoService,
    private usuarioService: UsuarioService,
    private toast: ToastService
  ) {}

  async ngOnInit() {
    this.avatarCargando = true;
    this.user = await this.authService.currentUser();
    console.log('[Homepaciente] User data:', this.user);
    this.avatarCargando = false;
  }
  toggleMenu(): void {
    console.log(this.authService.user);
    this.menuCollapsed = !this.menuCollapsed;
  }
  iniciarSacarTurno() {
    this.sacandoTurno = true;
  }

  onSacarTurnoOpen(open: boolean) {
    this.sacandoTurno = open;
  }

  get avatarUrl(): string | null {
    const arr = this.user?.imagen_perfil as string[] | undefined | null;
    return Array.isArray(arr) ? arr[0] || null : null;
  }

  get miniUrl(): string | null {
    const arr = this.user?.imagen_perfil as string[] | undefined | null;
    if (!Array.isArray(arr)) return null;
    return arr[1] || arr[0] || null;
  }

  get inicial(): string {
    const base = (this.user?.nombre || this.user?.email || '?') as string;
    return (base?.charAt(0) || '?').toUpperCase();
  }

  // home-paciente.component.ts (o el contenedor)
  async onTurno(payload: any) {
    try {
      // Resolver paciente
      let id_paciente: string | null = null;
      if(this.user.admin == false && this.user.especialidad == null) {
        payload.emailPaciente = this.user.email;
      }
      if (payload.emailPaciente) {
        const u = await this.usuarioService.obtenerUsuarioPorEmail(payload.emailPaciente);
        if (!u) {
          this.toast.error('No se encontró paciente con ese email');
          return;
        }
        id_paciente = u.id;
      } else {
        id_paciente = this.authService.user?.id ?? null;
      }

      if (!id_paciente) {
        this.toast.error('Paciente no disponible');
        return;
      }

      // Resolver especialista
      const id_especialista: string | null = payload.especialistaId ?? null;
      if (!id_especialista) {
        this.toast.error('Especialista no disponible');
        return;
      }

      // Construir fecha completa ISO a partir de fecha (YYYY-MM-DD) y hora (HH:mm)
      const fecha_turno = new Date(`${payload.fecha}T${payload.hora}:00`);
      console.log(payload)
      const creado = await this.turnoService.crearTurno({
        id_paciente,
        id_especialista,
        fecha_turno,
        especialidad: payload.especialidad
      });

      if (!creado) {
        this.toast.error('No se pudo crear el turno');
        return;
      }

      this.toast.success('Turno creado correctamente');
      // Cerrar wizard de registro de turno
      try { this.registroTurno?.close(); } catch {}
      // Podríamos cerrar el panel o refrescar listados aquí
    } catch (e: any) {
      console.error('Error creando turno:', e);
      this.toast.error(e?.message || 'Error creando turno');
    }
  }

  async cerrarSesion() {
    await this.authService.logout();
    this.router.navigate(['/inicio']);
  }
}

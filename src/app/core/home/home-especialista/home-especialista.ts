// home-paciente.component.ts
import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { TurnoService } from '../../../services/turno.service';
import { UsuarioService } from '../../../services/usuario.service';
import { ToastService } from '../../../services/toast.service';
import { RegistroTurno } from '../registro-turno/registro-turno';
import { Router } from '@angular/router';
import { ListadoTurnos } from '../../../features/listado-turnos/listado-turnos';
import { TurnoComponent } from '../../../features/turno/turno';
import { PerfilModalComponent } from '../../../features/perfil-modal/perfil-modal';
import { MisPacientes } from '../../../features/mis-pacientes/mis-pacientes';
type AdminUser = {
  nombre: any;
  email: any;
  avatarUrl: any | any[];
};

@Component({
  selector: 'app-home-paciente',
  standalone: true,
  imports: [CommonModule, FormsModule, RegistroTurno, ListadoTurnos, TurnoComponent, PerfilModalComponent, MisPacientes],
  templateUrl: './home-especialista.html',
  styleUrls: ['./home-especialista.scss']
})
export class HomeEspecialista implements OnInit {
  @ViewChild(RegistroTurno) registroTurno!: RegistroTurno;
  @ViewChild(ListadoTurnos) listadoTurnos!: ListadoTurnos;
  menuCollapsed = false;
  user!: any;
  sacandoTurno = false;
  turnosEspecialista: any[] = [];
  turnoEnEjecucion: any | null = null;
  resenando = false;
  turnoParaResena: any | null = null;
  resenaTexto: string = '';
  cancelando = false;
  turnoParaCancel: any | null = null;
  cancelTexto: string = '';
  viendoPaciente = false;
  pacienteSeleccionado: { paciente: any; historia: any } | null = null;
  ultimosTurnos: any[] = [];
  perfilAbierto = false;
  avatarCargando = true;
  activeSection: 'turnos' | 'pacientes' = 'turnos';
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
    this.turnosEspecialista = await this.turnoService.buscarHistoriaPorEspecialista(this.user.id)
    console.log('[Homepaciente] Historias:', this.turnosEspecialista);
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
  abrirPerfil(){ this.perfilAbierto = true; }
  cerrarPerfil(){ this.perfilAbierto = false; }

  private limpiarWizards() {
    this.sacandoTurno = false;
    this.resenando = false;
    this.cancelando = false;
    this.viendoPaciente = false;
    this.turnoEnEjecucion = null;
    this.turnoParaResena = null;
    this.resenaTexto = '';
    this.turnoParaCancel = null;
    this.cancelTexto = '';
    this.pacienteSeleccionado = null;
    this.ultimosTurnos = [];
  }

  verTurnos() {
    this.limpiarWizards();
    this.activeSection = 'turnos';
  }
  verPacientes() {
    this.limpiarWizards();
    this.activeSection = 'pacientes';
  }

  onEjecutarTurno(turno: any) {
    this.turnoEnEjecucion = turno;
    this.sacandoTurno = true; // reutilizamos panel expandido para animación
  }

  onCargarResena(turno: any) {
    this.turnoParaResena = turno;
    this.resenaTexto = '';
    this.resenando = true;
  }

  onCancelarConMotivo(turno: any) {
    this.turnoParaCancel = turno;
    this.cancelTexto = '';
    this.cancelando = true;
  }

  async onVerPaciente(item: { paciente: any; historia: any }) {
    try {
      this.pacienteSeleccionado = item;
      this.ultimosTurnos = await this.turnoService.getUltimosTresTurnosPaciente(item.paciente?.id as string);
      this.viendoPaciente = true;
    } catch (e) {
      this.ultimosTurnos = [];
    }
  }

  async onGuardarAtencion(datos: { altura: number; peso: number; temperatura: number; presion: string; diagnostico: string; }) {
    try {
      const turno = this.turnoEnEjecucion;
      if (!turno) return;
      const id_paciente: string | null = turno.id_paciente || turno.paciente?.id || null;
      if (!id_paciente) throw new Error('Paciente no disponible');

      // Parsear presión "120/80" -> 120 (sistólica) como smallint
      let presionNum: number | null = null;
      if (datos.presion) {
        const m = String(datos.presion).match(/^(\d{2,3})/);
        presionNum = m ? Number(m[1]) : null;
      }

      // Guardar siempre el especialista logueado. Evitamos nulos y duplicados.
      const ids = [this.user?.id as string, turno.id_especialista as string].filter(Boolean) as string[];
      const espIds: string[] = Array.from(new Set(ids));

      await this.turnoService.guardarHistoriaClinica({
        id_paciente,
        ids_especialistas: espIds,
        altura: Number(datos.altura) || null,
        peso: Number(datos.peso) || null,
        temperatura: Number(datos.temperatura) || null,
        presion: presionNum,
        diagnostico: datos.diagnostico || null,
      });

      if (turno.id) {
        await this.turnoService.completarTurno(turno.id as string);
      }

      // Refrescar listado
      try { await this.listadoTurnos?.reload?.(); } catch {}

      this.toast.success('Historia clínica guardada y turno completado');
    } catch (e: any) {
      this.toast.error(e?.message || 'No se pudo guardar la atención');
      return;
    } finally {
      this.sacandoTurno = false;
      this.turnoEnEjecucion = null;
    }
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

  async guardarResena() {
    try {
      const t = this.turnoParaResena;
      if (!t?.id) return;
      const texto = (this.resenaTexto || '').trim();
      if (!texto) {
        this.toast.error('La reseña no puede estar vacía');
        return;
      }
      await this.turnoService.guardarResena(t.id as string, texto);
      try { await this.listadoTurnos?.reload?.(); } catch {}
      this.toast.success('Reseña guardada');
      this.cancelarResena();
    } catch (e: any) {
      this.toast.error(e?.message || 'No se pudo guardar la reseña');
    }
  }

  cancelarResena() {
    this.resenando = false;
    this.turnoParaResena = null;
    this.resenaTexto = '';
  }

  async guardarCancelacion() {
    try {
      const t = this.turnoParaCancel;
      if (!t?.id) return;
      const texto = (this.cancelTexto || '').trim();
      if (!texto) {
        this.toast.error('Debe ingresar un motivo de cancelación');
        return;
      }
      await this.turnoService.cancelarTurnoConMotivo(t.id as string, texto);
      try { await this.listadoTurnos?.reload?.(); } catch {}
      this.toast.success('Turno cancelado con motivo');
      this.cancelarCancelacion();
    } catch (e: any) {
      this.toast.error(e?.message || 'No se pudo cancelar el turno');
    }
  }

  cancelarCancelacion() {
    this.cancelando = false;
    this.turnoParaCancel = null;
    this.cancelTexto = '';
  }

  cerrarDetallePaciente() {
    this.viendoPaciente = false;
    this.pacienteSeleccionado = null;
    this.ultimosTurnos = [];
  }

  async cerrarSesion() {
    await this.authService.logout();
    this.router.navigate(['/inicio']);
  }
}

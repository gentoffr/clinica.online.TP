import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TurnoService } from '../../services/turno.service';
import { UsuarioService } from '../../services/usuario.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-mis-pacientes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mis-pacientes.html',
  styleUrls: ['./mis-pacientes.scss']
})
export class MisPacientes implements OnInit {
  cargando = true;
  error = '';
  // items: uno por paciente, con su última historia
  items: Array<{ paciente: any; historia: any }>= [];
  seleccionado: { paciente: any; historia: any } | null = null;
  modalAbierto = false;
  @Output() verPaciente = new EventEmitter<{ paciente: any; historia: any }>();

  constructor(
    private turnoService: TurnoService,
    private usuarioService: UsuarioService,
    private auth: AuthService,
  ) {}

  trackByPaciente = (_: number, it: any) => it?.paciente?.id;

  async ngOnInit() {
    await this.load();
  }

  async load() {
    this.cargando = true;
    this.error = '';
    try {
      const me = this.auth.user ?? (await this.auth.currentUser());
      const especialistaId = me?.id as string | undefined;
      if (!especialistaId) throw new Error('Especialista no disponible');

      const historias = await this.turnoService.buscarHistoriaPorEspecialista(especialistaId);
      const porPaciente = new Map<string, any[]>();
      for (const h of historias || []) {
        const pid = h.id_paciente as string;
        if (!porPaciente.has(pid)) porPaciente.set(pid, []);
        porPaciente.get(pid)!.push(h);
      }

      const items: Array<{ paciente: any; historia: any }>= [];
      for (const [pid, hs] of porPaciente.entries()) {
        const paciente = await this.usuarioService.obtenerUsuarioPorId(pid);
        const ordenadas = [...hs].sort((a,b) => new Date(b.fecha_registro || 0).getTime() - new Date(a.fecha_registro || 0).getTime());
        const historia = ordenadas[0];
        items.push({ paciente, historia });
      }
      // Orden por nombre de paciente
      items.sort((a,b)=>`${a.paciente?.nombre||''} ${a.paciente?.apellido||''}`.localeCompare(`${b.paciente?.nombre||''} ${b.paciente?.apellido||''}`));
      this.items = items;
    } catch (e: any) {
      this.error = e?.message || 'No se pudieron cargar los pacientes';
    } finally {
      this.cargando = false;
    }
  }

  abrirModal(item: { paciente: any; historia: any }) {
    // Mantengo compatibilidad si se quisiera modal local
    this.seleccionado = item;
    this.modalAbierto = true;
  }

  onClick(item: { paciente: any; historia: any }) {
    this.verPaciente.emit(item);
  }

  cerrarModal() {
    this.modalAbierto = false;
    this.seleccionado = null;
  }
}

import { Component, OnInit, OnChanges, SimpleChanges, ViewChild, ElementRef, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { TurnoService } from '../../services/turno.service';
import { UsuarioService } from '../../services/usuario.service';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

@Component({
  selector: 'app-pdf',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pdf.html',
  styleUrl: './pdf.css'
})
export class Pdf implements OnInit, OnChanges {
  @ViewChild('pdfContent', { static: false }) pdfContent!: ElementRef<HTMLDivElement>;
  @Input() userId?: string | null;
  @Input() showButton: boolean = false;

  user: any = null;
  historial: any[] = [];
  cargando = true;
  error = '';
  descargando = false;
  constructor(private auth: AuthService, private turnoService: TurnoService, private usuarios: UsuarioService) {}

  async ngOnInit() {
    await this.cargar();
  }

  async ngOnChanges(changes: SimpleChanges) {
    if (changes['userId'] && !changes['userId'].firstChange) {
      await this.cargar();
    }
  }

  private async cargar() {
    this.cargando = true;
    this.error = '';
    try {
      const idPaciente = this.userId || (this.auth.user ?? (await this.auth.currentUser()))?.id;
      if (!idPaciente) throw new Error('Usuario no disponible');
      try { this.user = await this.usuarios.obtenerUsuarioPorId(idPaciente as string); } catch { this.user = this.auth.user; }
      this.historial = await this.turnoService.obtenerHistorialDeTurnosPorPaciente(idPaciente as string);
    } catch (e: any) {
      this.error = e?.message || 'No se pudo cargar el historial';
    } finally {
      this.cargando = false;
    }
  }

  async descargarPDF() {
    if (this.descargando) return;
    if (!this.pdfContent) return;
    let host: HTMLDivElement | null = null;
    this.descargando = true;
    try {
      // Clonamos el contenido y lo montamos fuera de pantalla con un ancho fijo (A4 aprox)
      const original = this.pdfContent.nativeElement;
      host = document.createElement('div');
      host.style.position = 'fixed';
      host.style.left = '-10000px';
      host.style.top = '0';
      host.style.width = '794px'; // ~A4 a 96dpi
      host.style.background = '#ffffff';
      const clone = original.cloneNode(true) as HTMLElement;
      host.appendChild(clone);
      document.body.appendChild(host);

      const canvas = await html2canvas(host, {
        scale: Math.min(window.devicePixelRatio, 2),
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let y = 0;
      let remaining = imgHeight;
      while (remaining > 0) {
        pdf.addImage(imgData, 'PNG', 0, y === 0 ? 0 : 0, imgWidth, imgHeight, undefined, 'FAST');
        remaining -= pageHeight;
        if (remaining > 0) {
          pdf.addPage();
          y = - (imgHeight - remaining);
        }
      }
      pdf.save('historial-turnos.pdf');
    } catch (e) {
      console.error('No se pudo generar el PDF', e);
    } finally {
      if (host?.parentNode) host.parentNode.removeChild(host);
      this.descargando = false;
    }
  }
  // Alias cómodo si el padre llama descargar()
  descargar() { return this.descargarPDF(); }
}

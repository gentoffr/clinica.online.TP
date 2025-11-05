import { Component, EventEmitter, OnInit, output, Output, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgForm } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth.service';
import { Toast, ToastService } from '../../../services/toast.service';
import { Router } from '@angular/router';
import { cuentas } from '../../../../../environments/environtment';
import { UsuarioService } from '../../../services/usuario.service';
@Component({
  selector: 'app-login',
  imports: [FormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit {
  @Output() volver = new EventEmitter<void>();
  @Output() registrar = new EventEmitter<void>();
  @ViewChild('strip') strip?: ElementRef<HTMLDivElement>;
  usuario = '';
  password = '';
  selectedIcon: number | null = null;
  loading = false;
  submitted = false;
  usuarios: any[] = [];
  getFoto(u: any) {
    return (
      (u?.imagen_perfil && u.imagen_perfil[0]) ||
      (u?.foto && u.foto[0]) ||
      u?.foto_url ||
      'assets/user.png'
    );
  }
  constructor(
    private authService: AuthService,
    private toast: ToastService,
    private router: Router,
    private usuarioService: UsuarioService
  ) {}
  async ngOnInit() {
    this.usuarios = await this.usuarioService.obtenerTodosLosUsuarios();
    console.log(this.usuarios);
  }
  selectIcon(i: number) {
    this.selectedIcon = i;
    const u = this.usuarios?.[i];
    const email = (u?.email || '').trim();
    if (email) this.usuario = email;

    const match = cuentas.find((c: any) => (c?.mail || '').toLowerCase() === email.toLowerCase());
    this.password = match?.pass ?? '';
    console.log('[Login] icon selected', i, 'email:', email, 'password set:', !!match);
  }

  scrollStrip(dir: number) {
    const el = this.strip?.nativeElement;
    if (!el) return;
    const step = 160; // scroll amount per click
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  }

  async loginSubmit(form: NgForm) {
    this.submitted = true;
    if (this.loading) return;
    const email = (this.usuario || '').trim();
    const pwd = (this.password || '').trim();

    if (form && form.invalid) {
      this.toast.warning('Revisa los campos requeridos');
      form.control.markAllAsTouched();
      return;
    }
    if (!email || !pwd) {
      this.toast.warning('Completa email y contraseña');
      return;
    }

    this.loading = true;
    try {
      const result: any = await this.authService.login(email, pwd);
      console.log('[Login] loginSubmit result:', result);
      if (result) {
        this.toast.success('Sesión iniciada correctamente');
        this.redireccionar(result);
      } else {
        const msg = result?.message || 'Credenciales inválidas';
        this.toast.error(msg);
      }
    } catch (error: any) {
      const msg = error?.message || 'No se pudo iniciar sesión';
      this.toast.error(msg);
      console.error('Login failed:', error);
    } finally {
      this.loading = false;
    }
  }

  redireccionar(usuario: any) {
    console.log('[Login] redireccionar usuario:', usuario);
    switch (this.averiguarRol(usuario)) {
      case 'especialista':
        this.router.navigate(['/home-especialista']);
        break;
      case 'paciente':
        this.router.navigate(['/home-paciente']);
        break;
      case 'admin':
        this.router.navigate(['/home-administrador']);
        break;
    }
  }

  averiguarRol(usuario: any) {
    if (!usuario) return 'paciente';
    if (usuario.admin === true) return 'admin';
    if (usuario.especialidad) return 'especialista';
    if (usuario.obraSocial || usuario.obra_social) return 'paciente';
    return 'paciente';
  }
}

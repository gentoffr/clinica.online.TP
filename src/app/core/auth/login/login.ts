import { Component, EventEmitter, output, Output, } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgForm } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth.service';
import { Toast, ToastService } from '../../../services/toast.service';
import { Router } from '@angular/router';
@Component({
  selector: 'app-login',
  imports: [FormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  @Output() volver = new EventEmitter<void>();
  @Output() registrar = new EventEmitter<void>();
  usuario = '';
  password = '';
  selectedIcon: number | null = null;
  loading = false;
  submitted = false;
  constructor(private authService: AuthService, private toast: ToastService, private router: Router) {}

  selectIcon(i: number) {
    this.selectedIcon = i;
    const demo = 'Aun no cree cuentas jaja';
    this.usuario = demo;
    this.password = demo;
    console.log('[Login] icon selected', i, '-> autocompleted fields');
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
    if (usuario.especialidad){
      this.router.navigate(['/home-especialista']);
    }
    else if (usuario.obraSocial && !usuario.especialidad){
      this.router.navigate(['/home-paciente']);
    }
    else if (usuario.admin) {
      this.router.navigate(['/home-administrador']);
    }
  }
}

import { Component, EventEmitter, output, Output, } from '@angular/core';
import { FormsModule } from '@angular/forms';
@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  @Output() volver = new EventEmitter<void>();
  @Output() registrar = new EventEmitter<void>();
  usuario = '';
  password = '';
  selectedIcon: number | null = null;

  login() {
    console.log('Usuario:', this.usuario, 'Password:', this.password);
  }

  selectIcon(i: number) {
    this.selectedIcon = i;
    const demo = 'Aun no cree cuentas jaja';
    this.usuario = demo;
    this.password = demo;
    console.log('[Login] icon selected', i, '-> autocompleted fields');
  }
}

import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Bienvenida } from '../../../features/bienvenida/bienvenida';
import { Login } from '../login/login';
import { Register } from '../register/register';

@Component({
  selector: 'app-auth.host',
  standalone: true,
  imports: [CommonModule, Bienvenida, Login, Register],
  templateUrl: './auth.host.html',
  styleUrl: './auth.host.css'
})
export class AuthHost {
  // 0: bienvenida, 1: login, 2: register
  vistaIndex = 0;

  ir(i: 0 | 1 | 2) {
    this.vistaIndex = i;
  }
}


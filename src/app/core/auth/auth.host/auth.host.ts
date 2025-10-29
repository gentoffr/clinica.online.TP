import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Bienvenida } from '../../../features/bienvenida/bienvenida';
import { Login } from '../login/login';
import { Register } from '../register/register';
import { AuthService } from '../../../services/auth.service';
import { supabase } from '../../../services/supabase.client';
@Component({
  selector: 'app-auth.host',
  standalone: true,
  imports: [CommonModule, Bienvenida, Login, Register],
  templateUrl: './auth.host.html',
  styleUrl: './auth.host.css',
})
export class AuthHost implements OnInit {
  constructor(private authService: AuthService) {}
  vistaIndex = 0;
  async ngOnInit() {
    const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
  }
  ir(i: 0 | 1 | 2) {
    this.vistaIndex = i;
  }
}

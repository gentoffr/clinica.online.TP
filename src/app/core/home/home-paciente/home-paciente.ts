// home-paciente.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth.service';
type AdminUser = {
  nombre: any;
  email: any;
  avatarUrl: any | any[];
};

@Component({
  selector: 'app-home-paciente',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home-paciente.html',
  styleUrls: ['./home-paciente.scss'],
})
export class HomePaciente implements OnInit{
  menuCollapsed = false;
  user!: any;
  constructor(public authService: AuthService) {}
  
  async ngOnInit() {
    this.user = await this.authService.currentUser();
    console.log('[Homepaciente] User data:', this.user);
  }
  toggleMenu(): void {
    console.log(this.authService.user);
    this.menuCollapsed = !this.menuCollapsed;
  }
}

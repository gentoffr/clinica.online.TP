import { Component } from '@angular/core';
import { EventEmitter, Output } from '@angular/core';
@Component({
  selector: 'app-bienvenida',
  imports: [],
  templateUrl: './bienvenida.html',
  styleUrl: './bienvenida.css'
})
export class Bienvenida {
  @Output() ingresar = new EventEmitter<void>();
  @Output() registrar = new EventEmitter<void>();
}

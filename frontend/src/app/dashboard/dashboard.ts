import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardComponent {
  now = new Date();
  errorPerfil = signal('');

  constructor(public auth: AuthService, private router: Router) {}

  irAMiPerfil() {
    this.router.navigate(['/mi-perfil']);
  }
}

import { Component } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/AuthService/auth-service';

@Component({
  imports: [RouterLink, RouterLinkActive],
  selector: 'app-navbar-component',
  styleUrl: './navbar-component.css',
  templateUrl: './navbar-component.html',
})
export class NavbarComponent {
  constructor(public auth: AuthService, private router: Router) {}

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}

import { Component, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/AuthService/auth-service';
import { Router } from '@angular/router';

@Component({
  imports: [ReactiveFormsModule],
  selector: 'app-login-component',
  standalone: true,
  styleUrl: './login-component.css',
  templateUrl: './login-component.html',
})
export class LoginComponent {

  loading = signal(false);
  errorMessage = signal<string | null>(null);
  
  form: FormGroup;
  

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {
    this.form = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
  }
  


  submit(): void {
    if (this.form.invalid) return;

    this.loading.set(true);
    this.errorMessage.set(null);

    const { username, password } = this.form.getRawValue();

    this.auth.login({ username: username!, password: password! }).subscribe({
      next: () => {
        console.log("Entró");
        const targetRoute = this.auth.hasRole('AUDITOR') ? '/dashboard' : '/invoices';
        console.log(targetRoute);
        this.router.navigate([targetRoute]).then((success) => {
          console.log('¿Navegación exitosa?', success);
          console.log('URL después de navegar:', this.router.url);
        }).catch((error) => {
          console.error('Error de navegación:', error);
        });
      },
      error: () => {
        this.errorMessage.set('Usuario o contraseña incorrectos.');
        this.loading.set(false);
      }
    });
  }


}


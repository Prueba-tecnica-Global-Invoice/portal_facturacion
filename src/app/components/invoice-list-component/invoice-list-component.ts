import { Component, signal } from '@angular/core';
import { NavbarComponent } from "../../shared/navbar-component/navbar-component";
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { InvoiceService } from '../../core/services/InvoiceService/invoice-service';
import { AuthService } from '../../core/services/AuthService/auth-service';
import { InvoiceType } from '../../core/models/invoice';

@Component({
  imports: [NavbarComponent, ReactiveFormsModule, DecimalPipe],
  selector: 'app-invoice-list-component',
  standalone: true,
  styleUrl: './invoice-list-component.css',
  templateUrl: './invoice-list-component.html',
})
export class InvoiceListComponent {

  showForm = signal(false);
  loading = signal(false);
  errorMessage = signal<string | null>(null);

  form: FormGroup;

  constructor(
    public store: InvoiceService,
    public auth: AuthService,
    private fb: FormBuilder
  ) {

    this.form = this.fb.group({
      numero: ['', Validators.required],
      tipo: ['NACIONAL' as InvoiceType, Validators.required],
      subtotal: [null as number | null,[Validators.required, Validators.min(0.01)]],
      fechaEmision: ['', Validators.required],
      fechaVencimiento: ['', Validators.required]
    });

    this.form.get('tipo')!.valueChanges.subscribe((tipo) => {

      const yaExiste = this.form.contains('codigoAduanero');

      if (tipo === 'EXPORTACION' && !yaExiste) {

        this.form.addControl(
          'codigoAduanero',
          this.fb.control('', Validators.required)
        );

      } else if (tipo !== 'EXPORTACION' && yaExiste) {

        this.form.removeControl('codigoAduanero');

      }
    });
  }


  ngOnInit(): void {
    this.store.ensureLoaded();
  }

  get esExportacion(): boolean {
    return this.form.get('tipo')?.value === 'EXPORTACION';
  }

  toggleForm(): void {
    this.showForm.update((v) => !v);
    this.errorMessage.set(null);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    const raw = this.form.getRawValue();

    this.store.create({
      numero: raw.numero!,
      tipo: raw.tipo!,
      subtotal: raw.subtotal!,
      fechaEmision: raw.fechaEmision!,
      fechaVencimiento: raw.fechaVencimiento!,
      codigoAduanero: this.esExportacion ? (raw as any).codigoAduanero : null
    }).subscribe({
      next: () => {
        this.loading.set(false);
        this.showForm.set(false);
        this.form.reset({ tipo: 'NACIONAL' });
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err?.error?.message ?? 'No se pudo crear la factura.');
      }
    });
  }

  
}

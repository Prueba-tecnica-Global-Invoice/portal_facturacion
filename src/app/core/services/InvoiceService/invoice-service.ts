import { computed, Injectable, signal } from '@angular/core';
import { Invoice, InvoiceType } from '../../models/invoice';
import { DashboardSummary } from '../../models/dashboard-summary';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CreateInvoiceRequest } from '../../models/create-invoice-request';

@Injectable({ providedIn: 'root' })
export class InvoiceService {
    
    private invoices = signal<Invoice[]>([]);
    private loaded = false;

    readonly all = computed(() => this.invoices());

    readonly summary = computed<DashboardSummary>(() => {
        const list = this.invoices();

        const totalFacturado = this.sum(list, (i) => i.totalAPagar);
        const totalACobrar = this.sum(list, (i) => i.montoACobrar);
        const totalVencido = this.sum(list.filter((i) => i.estado === 'VENCIDA'), (i) => i.montoACobrar);

        const facturadoPorTipo: Partial<Record<InvoiceType, number>> = {};
        for (const invoice of list) {
            facturadoPorTipo[invoice.tipo] = (facturadoPorTipo[invoice.tipo] ?? 0) + invoice.totalAPagar;
        }

        return { totalFacturado, totalACobrar, totalVencido, facturadoPorTipo };
    });

    constructor(private http: HttpClient) {}

    loadAll(): Observable<Invoice[]> {
        return this.http.get<Invoice[]>(`${environment.apiUrl}/invoices`).pipe(
            tap((data) => {
                this.invoices.set(data);
                this.loaded = true;
            })
        );
    }

    ensureLoaded(): void {
        if (!this.loaded) {
            this.loadAll().subscribe();
        }
    }

    create(request: CreateInvoiceRequest): Observable<Invoice> {
        return this.http.post<Invoice>(`${environment.apiUrl}/invoices`, request).pipe(
            tap((created) => {
                this.invoices.update((current) => [...current, created]);
            })
        );
    }



    sum(list: Invoice[], mapper: (invoice: Invoice) => number): number {
        return list.reduce((acc, item) => acc + mapper(item), 0);
    }
}

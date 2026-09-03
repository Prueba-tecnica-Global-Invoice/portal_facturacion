import { InvoiceType } from "./invoice";

export interface DashboardSummary {
    totalFacturado: number;
    totalACobrar: number;
    totalVencido: number;
    facturadoPorTipo: Partial<Record<InvoiceType, number>>;
}

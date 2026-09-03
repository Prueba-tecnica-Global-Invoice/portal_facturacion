export type InvoiceType = 'NACIONAL' | 'EXPORTACION' | 'GUBERNAMENTAL';
export type InvoiceStatus = 'VIGENTE' | 'VENCIDA' | 'PAGADA';

export interface Invoice {
    id: number;
    numero: string;
    tipo: InvoiceType;
    subtotal: number;
    iva: number;
    retencion: number;
    totalAPagar: number;
    montoPagado: number;
    montoACobrar: number;
    fechaEmision: string;
    fechaVencimiento: string;
    estado: InvoiceStatus;
    codigoAduanero: string | null;
}

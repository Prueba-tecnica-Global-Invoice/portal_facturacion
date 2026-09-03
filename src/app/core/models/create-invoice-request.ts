import { InvoiceType } from "./invoice";

export interface CreateInvoiceRequest {
    numero: string;
    tipo: InvoiceType;
    subtotal: number;
    fechaEmision: string;
    fechaVencimiento: string;
    codigoAduanero?: string | null;
}

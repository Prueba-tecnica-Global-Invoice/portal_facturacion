import { Routes } from '@angular/router';
import { LoginComponent } from './components/login-component/login-component';
import { authGuard } from './core/guards/authGuard';
import { roleGuard } from './core/guards/roleGuard';
import { InvoiceListComponent } from './components/invoice-list-component/invoice-list-component';
import { DashboardComponent } from './components/dashboard-component/dashboard-component';

export const routes: Routes = [
    { path: '', pathMatch: 'full', redirectTo: 'login' },
    { path: '**', redirectTo: 'login' },
    {
        path: 'login',
        component: LoginComponent
    },
    {
        path: 'dashboard',
        canActivate: [authGuard, roleGuard('AUDITOR')],
        component: DashboardComponent
    },
    {
        path: 'invoices',
        canActivate: [authGuard],
        component: InvoiceListComponent
    },
];

import { computed, Injectable, signal } from '@angular/core';
import { LoginResponse, Role } from '../../models/login-response';
import { HttpClient } from '@angular/common/http';
import { LoginRequest } from '../../models/login-request';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';

const STORAGE_KEY = 'global-invoice-session';


@Injectable({ providedIn: 'root' })
export class AuthService {
    private session = signal<LoginResponse | null>(this.readFromStorage());

    readonly isLoggedIn = computed(() => this.session() !== null);
    readonly roles = computed<Role[]>(() => this.session()?.roles ?? []);
    readonly username = computed(() => this.session()?.username ?? '');
    readonly token = computed(() => this.session()?.token ?? null);

    constructor(private http: HttpClient) {}

    login(credentials: LoginRequest): Observable<LoginResponse> {
        return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`, credentials).pipe(
        tap((response) => {
                this.session.set(response);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(response));
            })
        );
    }

    logout(): void {
        this.session.set(null);
        localStorage.removeItem(STORAGE_KEY);
    }

    hasRole(role: Role): boolean {
        return this.roles().includes(role);
    }





    private readFromStorage(): LoginResponse | null {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? (JSON.parse(raw) as LoginResponse) : null;
    }


}

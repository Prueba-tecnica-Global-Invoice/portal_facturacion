export type Role = 'OPERADOR' | 'AUDITOR';

export interface LoginResponse {
    token: string;
    username: string;
    roles: Role[];
}

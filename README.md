# Global-Invoice · Frontend

Frontend en **Angular 18**, con **standalone components** (sin `NgModule`) y
**signals** para el manejo de estado reactivo.

## Índice
1. [Idea general de la arquitectura](#idea-general-de-la-arquitectura)
2. [Capa `core/models`](#capa-coremodels)
3. [Capa `core/services` — `AuthService`](#capa-coreservices--authservice)
4. [Capa `core/state` — `InvoiceStore`](#capa-corestate--invoicestore)
5. [Capa `core/guards` y `core/interceptors`](#capa-coreguards-y-cointerceptors)
6. [Capa `features`](#capa-features)
7. [Capa `shared`](#capa-shared)
8. [RF-02 en detalle: formulario dinámico](#rf-02-en-detalle-formulario-dinámico)
9. [RF-04 en detalle: dashboard sin recargas](#rf-04-en-detalle-dashboard-sin-recargas)
10. [RBAC en el cliente](#rbac-en-el-cliente)
11. [Flujo completo de una sesión](#flujo-completo-de-una-sesión)
12. [Cómo correr](#cómo-correr)
13. [Estructura de carpetas](#estructura-de-carpetas)

---

## Idea general de la arquitectura

El proyecto sigue una separación por responsabilidad, no por tipo de archivo:

```
core/       -> todo lo transversal a la app (no depende de ninguna vista)
features/   -> una carpeta por pantalla (login, invoices, dashboard)
shared/     -> componentes reutilizables entre features (navbar)
```

No hay `NgModule`: cada componente standalone declara sus propios `imports`
(`ReactiveFormsModule`, `BaseChartDirective`, etc.), y el enrutador usa
`loadComponent` para *lazy loading* — cada pantalla se descarga solo cuando se
visita, no todas juntas al iniciar la app.

El estado de la aplicación (sesión, facturas) vive en **signals**, no en
`BehaviorSubject` de RxJS ni en un store externo tipo NgRx — es el enfoque
recomendado actualmente por el equipo de Angular para estado local/de app
mediana, y evita el boilerplate de acciones/reducers.

---

## Capa `core/models`

`invoice.model.ts` y `auth.model.ts`: interfaces TypeScript que reflejan
**exactamente** los DTOs que expone el backend (`InvoiceResponse`,
`LoginResponse`, etc.). Mantener esta correspondencia 1:1 es lo que permite que
`HttpClient` tipado (`this.http.get<Invoice[]>(...)`) detecte en tiempo de
compilación si el front y el back se desalinean.

---

## Capa `core/services` — `AuthService`

Maneja toda la sesión del usuario:

- Un signal privado `session: Signal<LoginResponse | null>`.
- Computed públicos derivados: `isLoggedIn()`, `roles()`, `username()`, `token()`.
- `login()` hace el `POST /auth/login` y, en el `tap()`, guarda la respuesta
  **tanto en el signal como en `localStorage`** — el signal da reactividad
  inmediata en pantalla, `localStorage` hace que la sesión sobreviva a un
  refresh (`F5`) de la página.
- `logout()` limpia ambos.

Como `roles()` es un `computed`, cualquier componente o guard que lo lea se
actualiza automáticamente cuando cambia la sesión, sin necesidad de
suscribirse manualmente a un observable.

---

## Capa `core/state` — `InvoiceStore`

Es la pieza central del **RF-04**. En vez de que cada pantalla le pida datos al
backend por su cuenta, existe **una única fuente de verdad** compartida:

- Un signal privado `invoices: Signal<Invoice[]>`.
- Un `computed summary` que deriva `totalFacturado`, `totalACobrar`,
  `totalVencido` y `facturadoPorTipo` a partir de `invoices()` — se recalcula
  solo, cada vez que `invoices` cambia.
- `loadAll()` hace `GET /invoices` **una sola vez** (la primera vez que se
  visita `/invoices` o `/dashboard`, lo que ocurra primero — controlado por
  `ensureLoaded()`).
- `create()` hace el `POST /invoices` y, en el `tap()`, hace
  `invoices.update(current => [...current, created])` — actualiza el signal
  **en memoria**, sin volver a pedir el listado ni el resumen del dashboard.

Esto cumple literalmente el requisito: *"si el usuario crea una factura nueva
y vuelve al Dashboard, la gráfica debe actualizarse instantáneamente sin
recargar la página y evitando peticiones HTTP redundantes"* — porque el
Dashboard y el listado leen del mismo store, y ese store no vuelve a golpear
la red al crear.

---

## Capa `core/guards` y `core/interceptors`

- **`authInterceptor`** (`HttpInterceptorFn`, estilo funcional): agrega el
  header `Authorization: Bearer <token>` a cada petición saliente si hay
  sesión activa, y si el backend responde `401`, cierra sesión y redirige a
  `/login` automáticamente — el usuario nunca se queda con una sesión "muerta".
- **`authGuard`** (`CanActivateFn`): bloquea cualquier ruta si no hay sesión.
- **`roleGuard(role)`**: es una *factory* de guard — no un guard directo, sino
  una función que **retorna** un `CanActivateFn` ya configurado para el rol
  pedido. Se usa así en las rutas: `canActivate: [authGuard, roleGuard('AUDITOR')]`.

Importante: estos guards mejoran la experiencia (evitan que un OPERADOR ni
siquiera vea la URL del dashboard), pero **la seguridad real vive en el
backend** vía JWT + `@PreAuthorize`. El cliente nunca es la última línea de
defensa.

---

## Capa `features`

- **`login/`**: formulario reactivo simple. Al autenticar, redirige a
  `/dashboard` si el usuario tiene rol `AUDITOR`, o a `/invoices` si es
  `OPERADOR`.
- **`invoices/`**: listado de facturas (visible para ambos roles, según
  RF-05) con un formulario de creación que solo se muestra si
  `auth.hasRole('OPERADOR')`. Contiene la lógica del formulario dinámico
  (ver RF-02 abajo).
- **`dashboard/`**: KPIs (`totalFacturado`, `totalACobrar`, `totalVencido`) y
  una gráfica de torta (Chart.js vía `ng2-charts`) del monto facturado por
  tipo — ambos derivados de `InvoiceStore.summary()`. Ruta protegida para
  `AUDITOR` únicamente.

---

## Capa `shared`

- **`navbar/`**: barra de navegación consciente del rol — el link a
  `/dashboard` solo se renderiza `@if (auth.hasRole('AUDITOR'))`. Incluye el
  botón de logout.

---

## RF-02 en detalle: formulario dinámico

En `InvoiceListComponent`, dentro del constructor:

```ts
this.form.get('tipo')!.valueChanges.subscribe((tipo) => {
  const yaExiste = this.form.contains('codigoAduanero');

  if (tipo === 'EXPORTACION' && !yaExiste) {
    this.form.addControl('codigoAduanero', this.fb.control('', Validators.required));
  } else if (tipo !== 'EXPORTACION' && yaExiste) {
    this.form.removeControl('codigoAduanero');
  }
});
```

Esto no es solo ocultar el campo con CSS: `addControl`/`removeControl`
**modifican el `FormGroup` real**. Si el tipo no es `EXPORTACION`, el control
`codigoAduanero` deja de existir por completo, así que
`this.form.getRawValue()` nunca lo incluye — es decir, nunca viaja en el
payload hacia el backend cuando no aplica, tal como pide el requerimiento.

---

## RF-04 en detalle: dashboard sin recargas

Ver la explicación completa en la sección de `InvoiceStore` arriba. La clave
técnica es que Angular signals son *push-based*: cuando `invoices.update(...)`
se ejecuta, **todo** `computed` que dependa de `invoices` (como `summary`) se
marca automáticamente como "sucio" y se recalcula la próxima vez que se lee —
sin que el componente del dashboard tenga que suscribirse, refrescar, ni
pedir nada explícitamente.

---

## RBAC en el cliente

| Ruta | Guard | Quién la ve |
|---|---|---|
| `/login` | ninguno | público |
| `/invoices` | `authGuard` | OPERADOR y AUDITOR |
| `/dashboard` | `authGuard` + `roleGuard('AUDITOR')` | solo AUDITOR |

Dentro de `/invoices`, el botón y formulario de creación se muestran solo si
`auth.hasRole('OPERADOR')` — un AUDITOR puede ver la tabla pero no el botón
"+ Nueva factura" (y aunque lo forzara vía consola del navegador, el backend
rechazaría el `POST` con `403`).

---

## Flujo completo de una sesión

```
1. Usuario abre /login → LoginComponent
2. Envía credenciales → AuthService.login() → POST /auth/login
3. Backend responde { token, username, roles } → se guarda en signal + localStorage
4. Redirección según rol (AUDITOR → /dashboard, OPERADOR → /invoices)
5. authGuard + roleGuard validan el acceso a la ruta
6. Componente llama a InvoiceStore.ensureLoaded() → GET /invoices (una sola vez)
7. authInterceptor agrega "Authorization: Bearer <token>" a esa petición automáticamente
8. Si el usuario crea una factura → InvoiceStore.create() → POST /invoices
   → el signal `invoices` se actualiza en memoria → todo lo que dependa de el
     (tabla, KPIs, gráfica) se refresca solo, sin nuevas peticiones HTTP
```

---

## Cómo correr

```bash
npm install
ng serve
```
Abre `http://localhost:4200`. El backend debe estar corriendo en
`http://localhost:8080` (configurable en `src/environments/environment.ts`).

Usuarios demo: `operador/operador123` (rol OPERADOR), `auditor/auditor123` (rol AUDITOR).

---

## Estructura de carpetas

```
src/app/
├── core/
│   ├── models/          Interfaces TS (espejo de los DTOs del backend)
│   ├── services/         AuthService (sesión + roles con signals)
│   ├── state/            InvoiceStore (fuente única de verdad)
│   ├── guards/            authGuard, roleGuard
│   └── interceptors/      authInterceptor
├── features/
│   ├── login/
│   ├── invoices/          listado + formulario dinámico (RF-02)
│   └── dashboard/         KPIs + gráfica (RF-04)
├── shared/
│   └── navbar/            navegación consciente del rol
├── app.component.ts
├── app.config.ts          providers: router, http + interceptor, charts
└── app.routes.ts           rutas + guards
```

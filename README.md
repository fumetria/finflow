# finflow

Aplicación de control financiero personal que sustituye a una hoja de cálculo de Excel.
Su función principal es **proyectar el saldo disponible de cada cuenta frente a los gastos
pendientes en una fecha dada**, respondiendo a la pregunta de siempre: "cuánto me falta para
cubrir los pagos que vienen".

Proyecto full-stack construido como pieza de portfolio: monorepo con API REST, frontend SPA,
un worker de mensajería y toda la infraestructura orquestada con Docker Compose.

## Qué es y para qué sirve

Gestionar las finanzas personales en un Excel funciona hasta que llega la pregunta difícil:
si mantengo el ritmo de gastos previstos, cuánto dinero tendré (o me faltará) en cada cuenta
a final de mes, dentro de tres meses o en cualquier fecha concreta.

finflow modela ese problema con datos reales: cuentas con su saldo, gastos con fecha de
vencimiento y estado, reglas recurrentes que generan gastos futuros y préstamos con su tabla
de amortización. Con todo ello calcula una **previsión** por cuenta:

```
saldo_proyectado = saldo_actual + ingresos_esperados_hasta_fecha - gastos_pendientes_hasta_fecha
```

El resultado se presenta en un dashboard que muestra, para la fecha elegida, el saldo
proyectado de cada cuenta y el desglose de gastos por categoría.

## Características principales

- Autenticación JWT con registro e inicio de sesión y dos roles (`admin`, `user`).
- Cuentas de tipo banco o efectivo, con saldo actual y divisa.
- Gastos con estado `pending` / `paid`; marcar un gasto como pagado deduce el importe del
  saldo de la cuenta asociada.
- Categorías de gasto propias de cada usuario.
- Reglas recurrentes (mensual, trimestral, anual, semanal, semestral) que generan gastos
  futuros de forma idempotente.
- Previsión de saldo por cuenta hasta una fecha configurable.
- Préstamos con tabla de amortización; las cuotas se materializan como gastos cuando se
  acerca su vencimiento.
- Dashboard con presets de fecha (7 días, fin de mes, +1 mes, +3 meses), desglose por
  categoría y gráfico circular (Recharts).
- Notificaciones de vencimiento próximo mediante un flujo Kafka: la API detecta gastos "due
  soon", el worker los consume y envía un email (capturado por Mailhog en desarrollo).
- Observabilidad con métricas Prometheus y un dashboard de Grafana.
- Documentación interactiva de la API con Swagger/OpenAPI, generada desde los esquemas Zod
  (una única fuente de verdad para validación y documentación).
- Interfaz internacionalizada (español / inglés) y tema claro, oscuro o de sistema.

## Stack tecnológico

**Frontend** (`web/`)
- React 19 + Vite 8 + TypeScript
- Tailwind CSS v4, shadcn/ui sobre Radix, iconos Hugeicons
- react-router v7 (data router)
- React Hook Form + Zod para formularios y validación
- axios como cliente HTTP (carga de datos con `useEffect` / `useState`)
- Recharts para el gráfico del dashboard
- i18next / react-i18next para i18n
- Fuentes Geist Variable, Geist Mono e Inter

**Backend** (`api/`)
- Node 20 + Express 5 + TypeScript
- Drizzle ORM sobre PostgreSQL 16
- Autenticación JWT (`jsonwebtoken`) y hashing con `bcryptjs`
- Validación con Zod
- Documentación con `zod-openapi` + `swagger-ui-express`
- Métricas con `prom-client`

**Worker** (`worker/`)
- KafkaJS (consumidor y productor)
- node-cron para el escaneo diario
- Nodemailer para el envío de emails
- Drizzle ORM (reutiliza el esquema de la API) y `prom-client`

**Infraestructura y tooling**
- Docker Compose
- Apache Kafka en modo KRaft (nodo único, sin Zookeeper)
- Mailhog (SMTP falso en desarrollo)
- Prometheus + Grafana
- nginx (sirve la SPA y hace de proxy inverso hacia la API)
- pnpm workspaces, TypeScript en modo estricto, ESLint y Prettier

## Arquitectura del monorepo

El repositorio es un monorepo pnpm con tres workspaces y la configuración de infraestructura:

```
api/      Node + Express + TypeScript + Drizzle ORM   (@finflow/api)
web/      React + Vite + TypeScript + Tailwind        (@finflow/web)
worker/   Consumidor Kafka + planificador diario      (@finflow/worker)
ops/      Configuración de Prometheus y Grafana        (no es un paquete Node)
```

Flujo general de los servicios:

```
navegador -> web (nginx) --/api--> api -> postgres
                                    |
                    escaneo diario / gastos "due soon"
                                    v
                                  kafka -> worker -> email (mailhog / SMTP real)

api + worker --/metrics--> prometheus -> grafana
```

El workspace `worker` depende de `@finflow/api` (`workspace:*`) para reutilizar el esquema de
base de datos de Drizzle, de modo que ambos comparten una única definición de las tablas.

## Modelo de dominio

- **accounts** — cuentas bancarias o de efectivo con un `current_balance` que se actualiza en
  cada pago.
- **expenses** — pagos individuales con `status: pending | paid`. Marcar un gasto como pagado
  dispara la deducción del saldo en la cuenta asociada.
- **expenses_categories** — categorías de gasto por usuario.
- **recurring_rules** — generan `expenses` futuros de forma idempotente según su frecuencia.
- **forecast** — no es una tabla, sino un cálculo del servicio: saldo actual más ingresos
  esperados menos gastos pendientes hasta una fecha, por cuenta.
- **loans / loan_installments** — préstamo y su tabla de amortización; cada cuota se
  materializa como un `expense` cuando se aproxima su vencimiento.
- **entities** — contrapartes o beneficiarios opcionales de un gasto.

Todas las tablas usan claves primarias UUID y comparten columnas de tiempo (`created_at`,
`updated_at`, `deleted_at` para borrado lógico). Cada tabla propiedad del usuario incluye
`user_id`, y todas las consultas filtran por el usuario autenticado para garantizar el
aislamiento de datos.

## API REST

Base URL: `/api/v1`. Todos los endpoints, salvo `/auth/*` y los de infraestructura, exigen la
cabecera `Authorization: Bearer <token>`.

| Recurso | Endpoints | Notas |
| --- | --- | --- |
| Auth | `POST /auth/register`, `POST /auth/login` | Públicos; devuelven `{ token }`. |
| Accounts | `GET /accounts`, `POST /accounts`, `GET /accounts/:id`, `PATCH /accounts/:id` | CRUD de cuentas. |
| Expenses | `GET /expenses`, `POST /expenses`, `GET /expenses/:id`, `PATCH /expenses/:id`, `PATCH /expenses/:id/paid` | `:id/paid` marca pagado y deduce del saldo. |
| Recurring rules | `GET /recurring-rules`, `POST /recurring-rules`, `POST /recurring-rules/generate`, `GET /recurring-rules/:id`, `PATCH /recurring-rules/:id`, `DELETE /recurring-rules/:id` | `generate` crea los gastos futuros de forma idempotente. |
| Forecast | `GET /forecast?date=...` | Saldo proyectado por cuenta frente a los gastos pendientes hasta la fecha. |
| Loans | `GET /loans`, `POST /loans`, `POST /loans/materialize`, `GET /loans/:id`, `PATCH /loans/:id` | `POST /loans` persiste la tabla de amortización; `materialize` convierte cuotas vencidas en gastos. |
| Categories | `GET /expenses-categories`, `GET /expenses-categories/:id`, `POST /expenses-categories`, `PATCH /expenses-categories/:id`, `DELETE /expenses-categories/:id` | CRUD de categorías. |

Endpoints de infraestructura:

| Endpoint | Descripción |
| --- | --- |
| `GET /health` | Comprueba la conexión a la base de datos (`SELECT 1`). |
| `GET /metrics` | Métricas Prometheus de la API. |
| `GET /api/v1/docs` | Swagger UI interactivo. |
| `GET /api/v1/docs/openapi.json` | Especificación OpenAPI 3.1 en crudo. |

## Puesta en marcha

**Requisitos**: Docker y Docker Compose. Para desarrollo local por workspace, además pnpm
(>= 8) y Node (>= 20). Se usa **pnpm exclusivamente**; no uses npm ni yarn.

### Opción A — Todo en Docker (recomendada)

```bash
cp .env.example .env
docker compose up -d
```

El servicio `migrate` aplica las migraciones de Drizzle automáticamente y la API espera a que
termine antes de arrancar. Una vez levantado:

| Servicio | URL |
| --- | --- |
| Web (SPA) | http://localhost:8080 |
| API | http://localhost:4000 |
| Swagger UI | http://localhost:4000/api/v1/docs |
| Mailhog (emails) | http://localhost:8025 |
| Prometheus | http://localhost:9090 |
| Grafana (admin / admin) | http://localhost:3001 |

### Opción B — Desarrollo local por workspace

```bash
pnpm install
docker compose up -d postgres kafka mailhog   # solo dependencias
pnpm --filter @finflow/api db:migrate          # aplica migraciones
pnpm dev:api                                    # en terminales separadas:
pnpm dev:web                                    # pnpm dev:web
pnpm dev:worker                                 # pnpm dev:worker
```

En este modo la web (Vite) usa `VITE_API_URL` para apuntar a la API; en el despliegue Docker
nginx hace de proxy y la web usa una baseURL relativa (sin CORS).

## Variables de entorno

Se cargan desde un único `.env` en la raíz (copia de `.env.example`, ignorado por git). En los
contenedores la API se conecta a Postgres por la red interna de Docker (`postgres:5432`); las
herramientas externas (DBeaver, etc.) usan `localhost:${POSTGRES_PORT}`.

| Bloque | Variables | Por defecto / notas |
| --- | --- | --- |
| Postgres | `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_PORT` | `finflow` / `finflow` / `finflow` / `5432` |
| API | `API_PORT`, `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `NODE_ENV` | `4000`; usa una cadena larga y aleatoria para `JWT_SECRET` en producción (`openssl rand -hex 32`); `JWT_EXPIRES_IN=1d` |
| Frontend | `VITE_API_URL`, `FRONTEND_URL` | `VITE_API_URL` se deja sin definir en el despliegue Docker (nginx hace de proxy); `FRONTEND_URL` alimenta la lista de CORS de la API |
| Worker | `KAFKA_BROKERS`, `KAFKA_CLIENT_ID`, `KAFKA_DUE_SOON_TOPIC`, `KAFKA_CONSUMER_GROUP`, `DUE_SOON_DAYS`, `DUE_SOON_CRON`, `RUN_SCAN_ON_BOOT`, `WORKER_METRICS_PORT` | Tema `expense.due_soon`; ventana de aviso `DUE_SOON_DAYS=3`; escaneo diario `0 8 * * *`; métricas en `9100` |
| SMTP | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE`, `MAIL_FROM` | Por defecto apuntan a Mailhog (`localhost:1025`, sin auth/TLS); definir `SMTP_USER`+`SMTP_PASS` activa un proveedor real con TLS/STARTTLS |

## Base de datos y migraciones

El esquema vive en `api/src/db/schema.ts` y las migraciones versionadas en
`api/src/db/migrations/`, gestionadas con drizzle-kit:

```bash
pnpm --filter @finflow/api db:generate   # genera migración a partir de cambios en el esquema
pnpm --filter @finflow/api db:migrate    # aplica migraciones pendientes
pnpm --filter @finflow/api db:studio     # abre Drizzle Studio
```

En el despliegue Docker las migraciones las aplica el servicio `migrate` mediante
`api/src/migrate.ts`, que solo necesita `DATABASE_URL`.

No hay script de datos de ejemplo: los datos se crean desde la propia interfaz.

## Observabilidad

- **API**: expone en `/metrics` las métricas por defecto de Node y un histograma
  `http_request_duration_seconds` etiquetado por método, ruta y código de estado.
- **Worker**: expone `/metrics` en el puerto `9100` con contadores
  `worker_due_soon_events_produced_total`, `worker_due_soon_events_consumed_total`,
  `worker_emails_sent_total` y `worker_errors_total`.
- **Prometheus** hace scraping de ambos (`ops/prometheus/prometheus.yml`) y **Grafana** carga
  el dashboard "finflow overview" (`ops/grafana/provisioning/dashboards/finflow.json`) con
  paneles de disponibilidad de targets, tasa de peticiones de la API, eventos due-soon y
  emails/errores.

## Scripts útiles (raíz)

```bash
pnpm dev:api        # arranca la API en modo watch
pnpm dev:web        # arranca el frontend (Vite)
pnpm dev:worker     # arranca el worker
pnpm build          # build recursivo de todos los workspaces
pnpm lint           # ESLint en todos los workspaces
pnpm typecheck      # comprobación de tipos en todos los workspaces
pnpm format         # Prettier sobre todo el repo
```

## Roadmap

El proyecto se construyó por fases, todas completadas:

- **Fase 1 (completada)** — Autenticación, CRUD de cuentas y gastos, y marcar como pagado.
- **Fase 2 (completada)** — Reglas recurrentes, servicio de previsión y dashboard de
  proyección.
- **Fase 3 (completada)** — Préstamos con tabla de amortización.
- **Fase 4 (completada)** — Kafka (notificaciones de vencimiento próximo), Prometheus y
  Grafana.

Además, todo el stack está dockerizado y verificado de extremo a extremo con
`docker compose up`.

## Notas

Proyecto de portfolio. Todavía no incluye una suite de tests automatizados. Los datos de
demostración se generan a través de la interfaz, no hay script de seed.

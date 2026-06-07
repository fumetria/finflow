# finflow

App de control financiero personal con previsión de saldo. Sustituye un Excel
con dashboard de "cuánto me falta para cubrir los gastos previstos".

> Status: 🚧 WIP — Fase 1 (fundacional)

## Stack

- **Frontend**: React + Vite + TypeScript, Tailwind, shadcn/ui, TanStack Query, React Hook Form, Zod
- **Backend**: Node + Express + TypeScript, Drizzle ORM, PostgreSQL, JWT
- **Mensajería**: Kafka (notificaciones de vencimientos)
- **Observabilidad**: Prometheus + Grafana
- **Infra**: Docker Compose

## Roadmap

- [ ] **Fase 1** — Auth + CRUD de cuentas y gastos
- [ ] **Fase 2** — Previsión y recurrentes (dashboard de "cuánto falta")
- [ ] **Fase 3** — Préstamos con tabla de amortización
- [ ] **Fase 4** — Kafka + Grafana

## Desarrollo

```bash
cp .env.example .env
docker-compose up

(Instrucciones detalladas próximamente.)
```

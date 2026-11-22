# alFIO

Plataforma de compras a crédito en cuotas sobre **Stellar (Testnet)**. El cliente escanea el QR de un producto en tienda, abona el **50% inicial en USDC** y paga el saldo restante en **4 cuotas cada 15 días**.

## Estructura del proyecto

```text
alFIO/
├── backend/          # API REST + SSE en Go (Gin, GORM, PostgreSQL, Stellar Horizon)
├── frontend-client/  # App del comprador (React, Vite, Tailwind CSS, @pollar/react, QR Scanner)
└── frontend-owner/   # Panel de tienda (React, Vite, Tailwind CSS, @pollar/react, SSE, QR Generator)
```

## Arquitectura del backend (`backend/internal/`)

Organizado por *feature* con arquitectura por capas (`controller`, `service`, `repository`, `interfaces`, `dtos`, `model`) e inyección de dependencia por interfaces:

- `client/` — Clientes (`nombre`, `ci`, `telefono`, `direccion_billetera`)
- `tienda/` — Tiendas afiliadas (`nombre`, `dueno`, `email_panel`, `billetera_g`)
- `producto/` — Productos por tienda + ruta pública de QR `GET /p/:id`
- `credito/` — Créditos otorgados (50% inicial por defecto)
- `cuota/` — Plan de 4 cuotas cada 15 días con `memo` único para Stellar
- `pago/` — Registro de pagos verificados por `hash_stellar` único
- `stellar/` — Cliente Horizon Testnet, listener SSE de pagos y hub SSE hacia `frontend-owner`
- `db/` y `security/` — Conexión PostgreSQL con GORM y middlewares (CORS, headers, bearer)

### Flujo de pago en tiempo real (SSE + Horizon)

1. El dueño registra un producto y genera el QR con la URL devuelta por el backend (`/p/:id`).
2. El cliente escanea el QR y envía la orden a `POST /api/v1/stellar/orders`.
3. El dueño recibe la alerta por `GET /api/v1/owner/events/orders` y pulsa **Aceptar** (`POST /api/v1/owner/orders/:orderId/accept`).
4. El backend abre una goroutine escuchando pagos en **Horizon Testnet** para la wallet `G...` de la tienda y el `memo` de la orden.
5. Al confirmarse la transacción en Stellar, el backend emite el evento **Pagado** por `GET /api/v1/owner/events/payments/:orderId`.

## Cómo ejecutar en local

### 1. Backend
```bash
cd src/backend
docker compose up -d
cp .env.example .env
go run ./cmd/api
```

### 2. Frontend Cliente
```bash
cd ./src/frontend-client
cp .env.example .env   # Configurar POLLLAR_KEY
npm install
npm run dev
```

### 3. Frontend Dueño
```bash
cd ./src/frontend-owner
cp .env.example .env   # Configurar POLLLAR_KEY y VITE_API_BASE_URL
npm install
npm run dev
```
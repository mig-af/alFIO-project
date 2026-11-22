import { API_BASE_URL, isRemoteApiConfigured } from '../client'

const env = import.meta.env as Record<string, string | undefined>

/**
 * Rutas SSE configurables para el backend en Go/Gin.
 * Se pueden sobreescribir desde .env cuando se desplieguen los endpoints reales.
 */
export const SSE_ROUTES = {
  /** Stream donde llegan las alertas de nuevas órdenes de compra */
  orderAlerts:
    env.VITE_SSE_ORDERS_PATH?.trim() || '/api/v1/owner/events/orders',

  /** Stream donde llega la confirmación de pago de una orden aceptada */
  paymentConfirmations: (orderId: string) => {
    const basePath =
      env.VITE_SSE_PAYMENTS_PATH?.trim() || '/api/v1/owner/events/payments'
    return `${basePath}/${encodeURIComponent(orderId)}`
  },
} as const

export function buildSseUrl(path: string): string {
  return `${API_BASE_URL}${path}`
}

export { isRemoteApiConfigured }

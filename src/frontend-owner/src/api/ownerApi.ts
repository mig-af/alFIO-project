import { API_BASE_URL, apiRequest, isRemoteApiConfigured } from './client'
import rawMockData from './mockData.json'
import type {
  CreateProductRequest,
  CreateProductResponse,
  OwnerDashboardData,
  OwnerMetrics,
  OwnerProduct,
  OwnerProfile,
  PaymentConfirmedEvent,
  SoldProduct,
  StoreClient,
} from './types'

let mockState: OwnerDashboardData = structuredClone(
  rawMockData as OwnerDashboardData,
)

let mockOwnerProfile: OwnerProfile = {
  storeName: mockState.storeName,
  ownerName: 'Dueño de Tienda',
  email: 'tienda@alfio.app',
}

export const ownerApi = {
  /**
   * Registra o actualiza los datos del dueño/tienda tras autenticarse con Pollar.
   * Endpoint futuro: POST /api/v1/owner/register
   */
  async registerOwner(profile: OwnerProfile): Promise<OwnerProfile> {
    if (isRemoteApiConfigured) {
      return apiRequest<OwnerProfile>('/api/v1/owner/register', {
        method: 'POST',
        body: JSON.stringify(profile),
      })
    }
    mockOwnerProfile = { ...profile }
    mockState = { ...mockState, storeName: profile.storeName }
    return structuredClone(mockOwnerProfile)
  },

  /**
   * Obtiene el perfil del dueño actual.
   * Endpoint futuro: GET /api/v1/owner/profile
   */
  async getOwnerProfile(): Promise<OwnerProfile> {
    if (isRemoteApiConfigured) {
      return apiRequest<OwnerProfile>('/api/v1/owner/profile')
    }
    return structuredClone(mockOwnerProfile)
  },

  /**
   * Crea un nuevo producto y espera la URL del producto devuelta por el backend (ej. https://backend/p/{id}).
   * Endpoint futuro: POST /api/v1/owner/products
   */
  async createProduct(payload: CreateProductRequest): Promise<CreateProductResponse> {
    if (isRemoteApiConfigured) {
      return apiRequest<CreateProductResponse>('/api/v1/owner/products', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    }

    const id = `prod-${Date.now().toString(36)}`
    const qrCode = `ALFIO-${id.slice(-4).toUpperCase()}`
    const baseOrigin = API_BASE_URL || 'https://backend'
    const productUrl = `${baseOrigin}/p/${id}`
    const platformFeeUsdc = Number((payload.priceUsd * 0.05).toFixed(2))
    const totalPriceUsdc = Number((payload.priceUsd + platformFeeUsdc).toFixed(2))

    const newProduct: OwnerProduct = {
      id,
      qrCode,
      storeName: payload.storeName,
      name: payload.name,
      photoUrl: payload.photoUrl,
      description: payload.description,
      specs: payload.specs,
      basePriceUsdc: payload.priceUsd,
      platformFeeUsdc,
      totalPriceUsdc,
      stock: payload.stock,
      active: true,
      productUrl,
    }

    mockState = {
      ...mockState,
      products: [newProduct, ...mockState.products],
    }

    return {
      product: structuredClone(newProduct),
      productUrl,
    }
  },

  /**
   * Obtiene el resumen completo del dueño (métricas, productos, vendidos y clientes).
   * Endpoint futuro: GET /api/v1/owner/dashboard
   */
  async getDashboardData(): Promise<OwnerDashboardData> {
    if (isRemoteApiConfigured) {
      return apiRequest<OwnerDashboardData>('/api/v1/owner/dashboard')
    }
    return structuredClone(mockState)
  },

  /**
   * Obtiene las métricas del día (ventas de hoy, por cobrar hoy, atrasados).
   * Endpoint futuro: GET /api/v1/owner/metrics
   */
  async getMetrics(): Promise<OwnerMetrics> {
    if (isRemoteApiConfigured) {
      return apiRequest<OwnerMetrics>('/api/v1/owner/metrics')
    }
    return structuredClone(mockState.metrics)
  },

  /**
   * Obtiene los productos registrados por el dueño.
   * Endpoint futuro: GET /api/v1/owner/products
   */
  async getProducts(): Promise<OwnerProduct[]> {
    if (isRemoteApiConfigured) {
      return apiRequest<OwnerProduct[]>('/api/v1/owner/products')
    }
    return structuredClone(mockState.products)
  },

  /**
   * Obtiene el listado de productos vendidos.
   * Endpoint futuro: GET /api/v1/owner/sales
   */
  async getSoldProducts(): Promise<SoldProduct[]> {
    if (isRemoteApiConfigured) {
      return apiRequest<SoldProduct[]>('/api/v1/owner/sales')
    }
    return structuredClone(mockState.soldProducts)
  },

  /**
   * Obtiene la lista de clientes de la tienda.
   * Endpoint futuro: GET /api/v1/owner/clients
   */
  async getClients(): Promise<StoreClient[]> {
    if (isRemoteApiConfigured) {
      return apiRequest<StoreClient[]>('/api/v1/owner/clients')
    }
    return structuredClone(mockState.clients)
  },

  /**
   * Confirma/acepta una orden de compra entrante antes de esperar el pago por SSE.
   * Endpoint futuro: POST /api/v1/owner/orders/:orderId/accept
   */
  async acceptOrder(orderId: string): Promise<{ accepted: boolean; orderId: string }> {
    if (isRemoteApiConfigured) {
      return apiRequest<{ accepted: boolean; orderId: string }>(
        `/api/v1/owner/orders/${encodeURIComponent(orderId)}/accept`,
        { method: 'POST' },
      )
    }
    return { accepted: true, orderId }
  },

  /**
   * Sincroniza localmente un pago confirmado por SSE en el estado de productos vendidos,
   * métricas de hoy y clientes (en backend real esto también se consulta vía GET).
   */
  async recordConfirmedSale(payment: PaymentConfirmedEvent): Promise<OwnerDashboardData> {
    if (isRemoteApiConfigured) {
      return this.getDashboardData()
    }

    const newSold: SoldProduct = {
      id: `sold-${Date.now().toString().slice(-4)}`,
      orderId: payment.orderId,
      productCode: payment.productCode,
      productName: payment.productName,
      buyerName: payment.buyerName,
      buyerWallet: payment.buyerWallet,
      soldAt: payment.paidAt.slice(0, 10),
      totalAmountUsdc: payment.totalPriceUsdc,
      downPaymentUsdc: payment.amountPaidUsdc,
      paidInstallments: 0,
      totalInstallments: 4,
      status: 'active',
      txHash: payment.txHash,
    }

    const remainingBalance = Math.max(0, payment.totalPriceUsdc - payment.amountPaidUsdc)
    const nextDue = new Date()
    nextDue.setDate(nextDue.getDate() + 15)
    const nextDueIso = nextDue.toISOString().slice(0, 10)

    const existingClient = mockState.clients.find(
      (c) => c.walletAddress === payment.buyerWallet,
    )

    const updatedClients: StoreClient[] = existingClient
      ? mockState.clients.map((c) =>
          c.walletAddress === payment.buyerWallet
            ? {
                ...c,
                activeCredits: c.activeCredits + 1,
                pendingBalanceUsdc: c.pendingBalanceUsdc + remainingBalance,
                nextDueDate: c.nextDueDate ?? nextDueIso,
                status: c.status === 'overdue' ? 'overdue' : 'on_time',
              }
            : c,
        )
      : [
          {
            id: `cli-${Date.now().toString().slice(-4)}`,
            name: payment.buyerName,
            walletAddress: payment.buyerWallet,
            activeCredits: 1,
            pendingBalanceUsdc: remainingBalance,
            nextDueDate: nextDueIso,
            status: 'on_time',
          },
          ...mockState.clients,
        ]

    const updatedProducts = mockState.products.map((p) =>
      p.qrCode === payment.productCode && p.stock > 0
        ? { ...p, stock: p.stock - 1 }
        : p,
    )

    mockState = {
      ...mockState,
      products: updatedProducts,
      soldProducts: [newSold, ...mockState.soldProducts],
      clients: updatedClients,
      metrics: {
        ...mockState.metrics,
        salesTodayUsdc: mockState.metrics.salesTodayUsdc + payment.totalPriceUsdc,
        salesTodayCount: mockState.metrics.salesTodayCount + 1,
      },
    }

    return structuredClone(mockState)
  },
}

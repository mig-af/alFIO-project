import { apiRequest, isRemoteApiConfigured } from './client'
import rawMockData from './mockData.json'
import type {
  CreateCreditPurchaseRequest,
  PayInstallmentRequest,
  PendingInstallment,
  ProductCatalogItem,
  PurchasedProduct,
  UserPortfolioResponse,
} from './types'

// Estado en memoria para el modo mock (se reemplaza automáticamente cuando VITE_API_BASE_URL está definido)
let mockPurchasedProducts: PurchasedProduct[] = structuredClone(
  rawMockData.purchasedProducts as PurchasedProduct[],
)
let mockPendingInstallments: PendingInstallment[] = structuredClone(
  rawMockData.pendingInstallments as PendingInstallment[],
)
const mockCatalog: ProductCatalogItem[] = rawMockData.catalog as ProductCatalogItem[]

function addDays(baseDate: Date, days: number): string {
  const result = new Date(baseDate)
  result.setDate(result.getDate() + days)
  return result.toISOString().slice(0, 10)
}

export const alfioApi = {
  /**
   * Obtiene los productos comprados y las cuotas pendientes del usuario.
   * Endpoint futuro: GET /api/v1/users/:walletAddress/portfolio
   */
  async getUserPortfolio(walletAddress: string): Promise<UserPortfolioResponse> {
    if (isRemoteApiConfigured) {
      return apiRequest<UserPortfolioResponse>(
        `/api/v1/users/${encodeURIComponent(walletAddress)}/portfolio`,
      )
    }

    return {
      purchasedProducts: structuredClone(mockPurchasedProducts),
      pendingInstallments: structuredClone(mockPendingInstallments),
    }
  },

  /**
   * Obtiene solo los productos comprados del usuario.
   * Endpoint futuro: GET /api/v1/users/:walletAddress/purchases
   */
  async getPurchasedProducts(walletAddress: string): Promise<PurchasedProduct[]> {
    if (isRemoteApiConfigured) {
      return apiRequest<PurchasedProduct[]>(
        `/api/v1/users/${encodeURIComponent(walletAddress)}/purchases`,
      )
    }
    return structuredClone(mockPurchasedProducts)
  },

  /**
   * Obtiene solo las cuotas/productos pendientes de pago.
   * Endpoint futuro: GET /api/v1/users/:walletAddress/installments?status=pending
   */
  async getPendingInstallments(walletAddress: string): Promise<PendingInstallment[]> {
    if (isRemoteApiConfigured) {
      return apiRequest<PendingInstallment[]>(
        `/api/v1/users/${encodeURIComponent(walletAddress)}/installments?status=pending`,
      )
    }
    return structuredClone(mockPendingInstallments)
  },

  /**
   * Lista el catálogo de productos disponibles (útil para pruebas/QR).
   * Endpoint futuro: GET /api/v1/products
   */
  async getProductsCatalog(): Promise<ProductCatalogItem[]> {
    if (isRemoteApiConfigured) {
      return apiRequest<ProductCatalogItem[]>('/api/v1/products')
    }
    return structuredClone(mockCatalog)
  },

  /**
   * Busca un producto a partir del código escaneado en el QR.
   * Endpoint futuro: GET /api/v1/products/qr/:qrCode
   */
  async getProductByQrCode(qrCode: string): Promise<ProductCatalogItem | null> {
    const normalized = qrCode.trim().toUpperCase()
    if (isRemoteApiConfigured) {
      return apiRequest<ProductCatalogItem>(
        `/api/v1/products/qr/${encodeURIComponent(normalized)}`,
      )
    }
    return (
      mockCatalog.find(
        (item) =>
          item.qrCode.toUpperCase() === normalized ||
          item.id.toUpperCase() === normalized,
      ) ?? null
    )
  },

  /**
   * Registra una nueva compra a crédito (50% inicial + 4 cuotas cada 15 días).
   * Endpoint futuro: POST /api/v1/purchases
   */
  async createCreditPurchase(
    payload: CreateCreditPurchaseRequest,
  ): Promise<PurchasedProduct> {
    if (isRemoteApiConfigured) {
      return apiRequest<PurchasedProduct>('/api/v1/purchases', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    }

    const product = mockCatalog.find((p) => p.id === payload.productId)
    if (!product) {
      throw new Error('Producto no encontrado')
    }

    const now = new Date()
    const purchaseId = `pur-${Date.now().toString().slice(-4)}`

    const newPurchase: PurchasedProduct = {
      id: purchaseId,
      productId: product.id,
      productName: product.name,
      storeName: product.storeName,
      purchasedAt: now.toISOString().slice(0, 10),
      totalAmountUsdc: product.totalPriceUsdc,
      downPaymentPaidUsdc: product.downPaymentUsdc,
      paidInstallments: 0,
      totalInstallments: product.installmentsCount,
      status: 'active',
      txHash: payload.downPaymentTxHash,
    }

    const generatedInstallments: PendingInstallment[] = Array.from(
      { length: product.installmentsCount },
      (_, idx) => {
        const number = idx + 1
        const instId = `inst-${Date.now().toString().slice(-4)}-${number}`
        return {
          id: instId,
          purchaseId,
          productName: product.name,
          storeName: product.storeName,
          installmentNumber: number,
          totalInstallments: product.installmentsCount,
          amountUsdc: product.installmentAmountUsdc,
          dueDate: addDays(now, product.intervalDays * number),
          status: 'pending',
          memo: `ALFIO-${instId.toUpperCase()}`,
          destinationWallet: product.storeWallet,
        }
      },
    )

    mockPurchasedProducts = [newPurchase, ...mockPurchasedProducts]
    mockPendingInstallments = [...generatedInstallments, ...mockPendingInstallments]

    return structuredClone(newPurchase)
  },

  /**
   * Marca una cuota como pagada tras confirmar el pago en Stellar.
   * Endpoint futuro: POST /api/v1/installments/:installmentId/pay
   */
  async payInstallment(payload: PayInstallmentRequest): Promise<void> {
    if (isRemoteApiConfigured) {
      await apiRequest<void>(
        `/api/v1/installments/${encodeURIComponent(payload.installmentId)}/pay`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
      )
      return
    }

    const target = mockPendingInstallments.find(
      (item) => item.id === payload.installmentId,
    )
    if (!target) {
      throw new Error('Cuota no encontrada')
    }

    mockPendingInstallments = mockPendingInstallments.filter(
      (item) => item.id !== payload.installmentId,
    )

    mockPurchasedProducts = mockPurchasedProducts.map((purchase) => {
      if (purchase.id !== target.purchaseId) return purchase
      const nextPaid = purchase.paidInstallments + 1
      return {
        ...purchase,
        paidInstallments: nextPaid,
        status: nextPaid >= purchase.totalInstallments ? 'completed' : 'active',
      }
    })
  },
}

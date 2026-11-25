const API_BASE_URL = (import.meta.env.VITEAPI_BASE_URL as string | undefined)?.trim() || ''

export const isRemoteApiConfigured = Boolean(API_BASE_URL)

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE_URL}${path}`
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  })

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText)
    throw new Error(message || `Error HTTP ${response.status}`)
  }

  return (await response.json()) as T
}

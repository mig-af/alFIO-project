import { useEffect, useRef, useState } from 'react'
import { ownerApi } from './api/ownerApi'
import type { OwnerProfile } from './api/types'
import { useOwnerWallet } from './pollar'
import { OwnerAuthScreen } from './site/components/OwnerAuthScreen'
import { OwnerDashboardPage } from './site/pages/OwnerDashboardPage'

export function App() {
  const wallet = useOwnerWallet()
  // Guarda los datos del formulario hasta que Pollar confirme sesión y entregue la billetera G...
  const [pendingProfile, setPendingProfile] = useState<OwnerProfile | null>(null)
  const registeringRef = useRef(false)

  useEffect(() => {
    // Registra la tienda en el backend recién cuando Pollar confirma login y devuelve walletAddress (billetera_g)
    if (!wallet.isAuthenticated || !wallet.walletAddress || !pendingProfile || registeringRef.current) {
      return
    }
    registeringRef.current = true
    const profileWithWallet: OwnerProfile = {
      ...pendingProfile,
      walletAddress: wallet.walletAddress,
    }
    void ownerApi
      .registerOwner(profileWithWallet)
      .catch((err) => {
        console.error('Error registrando tienda con billetera de Pollar:', err)
      })
      .finally(() => {
        setPendingProfile(null)
        registeringRef.current = false
      })
  }, [wallet.isAuthenticated, wallet.walletAddress, pendingProfile])

  const handleRegisterWithPollar = async (profile: OwnerProfile) => {
    // Primero guardamos el formulario y abrimos Pollar para obtener billetera_g tras autenticar
    setPendingProfile(profile)
    wallet.openLogin()
  }

  const handleEnterDemo = async (profile?: OwnerProfile) => {
    if (profile) {
      setPendingProfile(profile)
    }
    wallet.enterDemoSession()
  }

  if (!wallet.isAuthenticated) {
    return (
      <OwnerAuthScreen
        hasPollarApiKey={wallet.hasPollarApiKey}
        onLoginPollar={wallet.openLogin}
        onRegisterWithPollar={handleRegisterWithPollar}
        onEnterDemo={handleEnterDemo}
      />
    )
  }

  return <OwnerDashboardPage />
}

export default App

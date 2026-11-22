import { ownerApi } from './api/ownerApi'
import type { OwnerProfile } from './api/types'
import { useOwnerWallet } from './pollar'
import { OwnerAuthScreen } from './site/components/OwnerAuthScreen'
import { OwnerDashboardPage } from './site/pages/OwnerDashboardPage'

export function App() {
  const wallet = useOwnerWallet()

  const handleRegisterWithPollar = async (profile: OwnerProfile) => {
    await ownerApi.registerOwner(profile)
    wallet.openLogin()
  }

  const handleEnterDemo = async (profile?: OwnerProfile) => {
    if (profile) {
      await ownerApi.registerOwner(profile)
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

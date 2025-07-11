'use client'

import { useEffect, ReactNode } from 'react'
import { useAppStore } from './app-store'

interface StoreProviderProps {
  children: ReactNode
}

export function StoreProvider({ children }: StoreProviderProps) {
  useEffect(() => {
    // Hydrate the store on client-side
    if (typeof window !== 'undefined') {
      useAppStore.persist.rehydrate()
    }
  }, [])

  return <>{children}</>
}

// Hook to check if store is hydrated
export function useStoreHydration() {
  const hasHydrated = useAppStore((state) => state._hasHydrated)
  
  useEffect(() => {
    // Mark as hydrated after initial render
    if (typeof window !== 'undefined' && !hasHydrated) {
      useAppStore.setState({ _hasHydrated: true })
    }
  }, [hasHydrated])
  
  return hasHydrated
}
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { fetchCart } from '@/api/client'
import { useAuth } from '@/context/AuthContext'

const CartContext = createContext(null)

function getItemCount(cart) {
  if (!cart?.items?.length) return 0
  return cart.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
}

export function CartProvider({ children }) {
  const { isLoggedIn, token, loading: authLoading } = useAuth()
  const [cart, setCart] = useState(null)
  const [loading, setLoading] = useState(false)

  const refreshCart = useCallback(async () => {
    if (!isLoggedIn || !token) {
      setCart(null)
      return null
    }

    setLoading(true)
    try {
      const data = await fetchCart(token)
      setCart(data)
      return data
    } catch {
      setCart(null)
      return null
    } finally {
      setLoading(false)
    }
  }, [isLoggedIn, token])

  useEffect(() => {
    if (authLoading) return

    if (!isLoggedIn) {
      setCart(null)
      return
    }

    refreshCart()
  }, [authLoading, isLoggedIn, refreshCart])

  const itemCount = useMemo(() => getItemCount(cart), [cart])

  const value = useMemo(
    () => ({
      cart,
      setCart,
      loading,
      itemCount,
      refreshCart,
    }),
    [cart, loading, itemCount, refreshCart],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within CartProvider')
  }
  return context
}

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { fetchCurrentUser } from '@/api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const restoreSession = async () => {
      const savedToken = localStorage.getItem('token')

      if (!savedToken) {
        if (!cancelled) {
          setUser(null)
          setToken(null)
          setLoading(false)
        }
        return
      }

      try {
        const data = await fetchCurrentUser(savedToken)
        if (cancelled) return

        setToken(savedToken)
        setUser(data.user)
        localStorage.setItem('user', JSON.stringify(data.user))
      } catch {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        if (!cancelled) {
          setToken(null)
          setUser(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    restoreSession()

    return () => {
      cancelled = true
    }
  }, [])

  const login = (nextToken, nextUser) => {
    localStorage.setItem('token', nextToken)
    localStorage.setItem('user', JSON.stringify(nextUser))
    setToken(nextToken)
    setUser(nextUser)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
  }

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isLoggedIn: Boolean(user && token),
      isAdmin: user?.user_type === 'admin',
      login,
      logout,
    }),
    [user, token, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

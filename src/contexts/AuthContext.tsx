import React, { createContext, useContext, useEffect, useState } from 'react'
import { apiClient } from '../lib/api'

interface User {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  bio?: string
  website_url?: string
  github_url?: string
  linkedin_url?: string
  twitter_url?: string
  instagram_url?: string
  telegram_url?: string
  created_at: string
  updated_at: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Проверяем, есть ли сохраненный токен
    const token = localStorage.getItem('accessToken')
    if (token) {
      // Получаем профиль пользователя
      apiClient.getProfile().then((response: any) => {
        if (response.data?.profile) {
          setUser(response.data.profile)
        } else {
          // Токен недействителен, очищаем его
          apiClient.clearToken()
        }
        setLoading(false)
      }).catch(() => {
        apiClient.clearToken()
        setLoading(false)
      })
    } else {
      setLoading(false)
    }
  }, [])

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const response: any = await apiClient.register({
        email,
        password,
        full_name: fullName
      })

      if (response.error) {
        return { error: { message: response.error } }
      }

      if (response.data?.user) {
        setUser(response.data.user)
        // Токен уже сохранен в apiClient.register()
      }

      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const response: any = await apiClient.login({
        email,
        password
      })

      if (response.error) {
        return { error: { message: response.error } }
      }

      if (response.data?.user) {
        setUser(response.data.user)
        // Токен уже сохранен в apiClient.login()
      }

      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const signOut = async () => {
    try {
      await apiClient.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setUser(null)
    }
  }

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signOut
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth должен использоваться внутри AuthProvider')
  }
  return context
}
'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { getCurrentUser } from '@/lib/supabase/auth'

type User = {
  id: string
  email: string
  name: string
  role: 'viewer' | 'author' | 'admin'
} | null

type UserContextType = {
  user: User
  loading: boolean
  refreshUser: () => Promise<void>
}

const UserContext = createContext<UserContextType>({
  user: null,
  loading: true,
  refreshUser: async () => {},
})

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = async () => {
    setLoading(true)
    try {
      const currentUser = await getCurrentUser()
      setUser(currentUser as User)
    } catch (error) {
      console.error('Error fetching user:', error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshUser()
  }, [])

  return (
    <UserContext.Provider value={{ user, loading, refreshUser }}>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => useContext(UserContext)